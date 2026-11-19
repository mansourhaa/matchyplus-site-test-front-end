"""Service interne voice-ai de Matchy+ : vidéo / audio → champs du formulaire (FR / AR / EN), sans cloud.

Appelé seulement par le worker apps/ai (processor ANALYZE_VIDEO) et, pour le changement de langue, par l'API.
Lancer : uvicorn app.main:app --port 8001
"""
from __future__ import annotations

import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import asr, classify, llm, matching, pipeline
from .config import settings, taxonomy_csv
from .media import MediaError

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("matchy-voice")
ALLOWED_EXT = {".webm", ".mp4", ".m4a", ".mp3", ".ogg", ".wav", ".mov", ".aac"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.preload_models:
        asr.preload()
        classify.model()                             # l'agent classification s'entraîne une fois au démarrage (< 2 s)
    yield


app = FastAPI(title="Matchy+ voice-ai (interne)", version="1.0", lifespan=lifespan)


def _ui(value: str | None) -> str:
    return value if value in ("fr", "ar", "en") else "fr"


async def _save(upload: UploadFile, tmpdir: str) -> str:
    ext = Path(upload.filename or "").suffix.lower() or ".webm"
    if ext not in ALLOWED_EXT:
        raise MediaError("UNSUPPORTED_MEDIA", ext)
    path = os.path.join(tmpdir, "input" + ext)
    size, limit = 0, settings.max_upload_mb * 1024 * 1024
    with open(path, "wb") as fh:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                raise MediaError("FILE_TOO_LARGE", f"> {settings.max_upload_mb} Mo")
            fh.write(chunk)
    return path


def _error(exc: Exception) -> JSONResponse:
    if isinstance(exc, MediaError):
        status = {"FILE_TOO_LARGE": 413, "UNSUPPORTED_MEDIA": 415}.get(exc.code, 422)
        return JSONResponse({"ok": False, "error": exc.code, "detail": exc.detail}, status_code=status)
    if isinstance(exc, llm.LlmError):
        log.warning("LLM indisponible : %s", exc)
        return JSONResponse({"ok": False, "error": "AI_UNAVAILABLE", "detail": str(exc)[:200]}, status_code=503)
    raise exc


@app.get("/health")
def health() -> dict:
    from . import __version__
    return {"status": "ok", "version": __version__, "derjaEngine": settings.derja_engine,
            "derjaReady": asr.derja_available(), "whisperModel": settings.whisper_model,
            "whisperDevice": asr.whisper_device(), "llmMode": settings.llm_mode, "llmModel": settings.llm_model,
            **(llm.health() if settings.llm_mode != "off" else {"ollama": "non utilisé (LLM_MODE=off)"})}


@app.get("/taxonomy")
def taxonomy(ui: str = "fr") -> dict:
    return matching.service_catalog(_ui(ui))


@app.get("/form-options")
def form_options(ui: str = "fr") -> dict:
    """Les options du formulaire, telles que dans le fichier du chef (data/taxonomy/matchyplus_form_options_3lang.csv) :
    usage_mode, main_goals, tasks_services, interests_services, service_type — dans la langue de la page."""
    import csv
    lang, out = _ui(ui), {}
    for r in csv.DictReader(taxonomy_csv("form_options_3lang.csv").open(encoding="utf-8")):
        if r["language_code"] == lang:
            out.setdefault(r["field_key"], []).append({"code": r["option_code"], "label": r["option_label"],
                                                       "sector": r["sector_id"], "weight": float(r["match_weight"] or 1)})
    fields = {r["field_key"]: r["field_label"]
              for r in csv.DictReader(taxonomy_csv("form_fields_3lang.csv").open(encoding="utf-8"))
              if r["language_code"] == lang}
    return {"ok": True, "lang": lang, "options": out, "fields": fields}


@app.get("/convert-name")
def convert_name(value: str, ui: str = "fr") -> dict:
    """« Gharbi » → « الغربي » (et l'inverse) pour un nom connu ; sinon null (on ne devine pas l'orthographe)."""
    from .rules import _known_name
    words = value.split()
    out = []
    for w in words:
        known = _known_name(w)
        if not known and w.lower() in ("ben", "bin", "بن"):
            out.append("بن" if _ui(ui) == "ar" else "Ben")
            continue
        if not known:
            return {"value": None}
        out.append(known[1] if _ui(ui) == "ar" else known[0])
    return {"value": " ".join(out) or None}


class RelabelIn(BaseModel):
    values: dict[str, str | None]               # tous les champs texte remplis
    uiLocale: str = "fr"
    serviceId: str | None = None
    suggestions: dict[str, list[dict]] = {}
    aiFields: list[str] = []                    # champs écrits par l'IA et pas modifiés par la personne


@app.post("/relabel")
def relabel_endpoint(body: RelabelIn) -> dict:
    """v1.3.3 : changement de langue sans IA (dictionnaires et règles). Voir app/relabel.py."""
    from .relabel import relabel
    return relabel({k: v or "" for k, v in body.values.items()}, _ui(body.uiLocale), body.serviceId,
                   body.suggestions, body.aiFields)


class ClassifyIn(BaseModel):
    fields: dict[str, str]                      # main_job_service, about, interests_services, service_type, video_presentation…
    uiLocale: str = "fr"


@app.post("/classify")
def classify_profile(body: ClassifyIn) -> dict:
    """Agent classification : profil → secteur officiel (1 à 10) + concepts + confiance, en codes."""
    return classify.classify(body.fields, _ui(body.uiLocale))


@app.post("/analyze")
async def analyze(media: UploadFile = File(...), uiLocale: str = Form("fr"), field: str | None = Form(None)):
    """Vidéo ou audio (20 s max) → champs du formulaire dans la langue de la page."""
    with tempfile.TemporaryDirectory() as tmp:          # le média est supprimé à la sortie, succès ou erreur
        try:
            path = await _save(media, tmp)
            return pipeline.process_profile(path, _ui(uiLocale), field or None)
        except (MediaError, llm.LlmError) as exc:
            return _error(exc)
