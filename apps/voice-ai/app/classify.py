"""Agent classification Matchy+ : profil → un des 10 secteurs officiels + concepts (métiers, services, compétences…).

Nourri par les fichiers du chef de projet (data/taxonomy/matchyplus_*.csv du monorepo) :
  - tags_by_form_field.csv     : 128 concepts × 5 langues (fr, en, ar, derja en lettres arabes, arabizi),
                                 avec le poids selon le champ (combined_weight = poids du tag × priorité du champ) ;
  - training_multilingual.csv  : 320 présentations annotées (train / validation / test) ;
  - form_fields_3lang.csv      : les champs utilisés pour le matching.

Deux méthodes, combinées :
  1. tags   : on cherche les mots du dictionnaire dans chaque champ, on additionne les poids par secteur (explicable) ;
  2. modèle : petit classifieur (n-grammes de lettres + régression logistique) appris sur les exemples « train »
              et sur le dictionnaire, pour les phrases sans mot-clé clair.
Tout est local, gratuit, et tourne sur le processeur (entraînement < 2 s au premier appel).
"""
from __future__ import annotations

import csv
import re
import unicodedata
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

from .config import taxonomy_csv

SECTORS = range(1, 11)
# Champ du formulaire → clé utilisée dans tags_by_form_field.csv (la vidéo transcrite compte comme « À propos »).
FIELD_ALIASES = {"video_presentation": "about", "transcript": "about", "bio": "about", "profession": "main_job_service",
                 "job": "main_job_service", "interests": "interests_services", "goals": "main_goals"}
TAG_WEIGHT, MODEL_WEIGHT = 0.3, 0.7          # mélange réglé sur la validation : les tags aident, le modèle décide
FILL_CONF, FILL_MARGIN = 0.50, 0.20          # réglés sur la validation (voir eval/eval_classify.py)
SUGGEST_CONF = 0.35


# --- Normalisation -------------------------------------------------------------------------------------------------
_TASHKEEL = re.compile(r"[ً-ْٰـ]")
_ARABIC_PREFIXES = ("وال", "بال", "فال", "كال", "لل", "ال", "و", "ب", "ف", "ل", "ك")   # « كـموزّع » = « comme distributeur »


def norm(text: str) -> str:
    """Minuscules, arabe simplifié (أإآ → ا, ة → ه, ى → ي, sans voyelles), ponctuation → espace.
    Les chiffres de l'arabizi (3, 5, 7, 9) sont gardés."""
    t = unicodedata.normalize("NFKC", str(text or "")).lower()
    t = _TASHKEEL.sub("", t)
    for a, b in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ٱ", "ا"), ("ة", "ه"), ("ى", "ي"), ("ڨ", "ق"), ("’", "'")):
        t = t.replace(a, b)
    t = re.sub(r"[^\w\s']|_", " ", t)
    return re.sub(r"\s+", " ", t).strip()


_ARABIC_SUFFIXES = ("ات", "ين", "ون", "يه", "ه")
_LATIN = re.compile(r"^[a-zà-ÿ]+$")


def _strip_prefix(tok: str) -> str:
    """Préfixes collés et terminaisons courantes : « والسباكة » → « سباك », « plombiers » → « plombier »."""
    for p in _ARABIC_PREFIXES:
        if tok.startswith(p) and len(tok) - len(p) >= 3:
            tok = tok[len(p):]
            break
    for s in _ARABIC_SUFFIXES:
        if tok.endswith(s) and len(tok) - len(s) >= 3:
            return tok[: -len(s)]
    if _LATIN.match(tok) and len(tok) >= 5 and tok.endswith("s"):
        return tok[:-1]
    return tok


def _variants(text_n: str) -> tuple[str, str]:
    """Le texte tel quel, et le texte sans les préfixes arabes collés (« والسباكة » → « سباكه »)."""
    return f" {text_n} ", " " + " ".join(_strip_prefix(w) for w in text_n.split()) + " "


# --- Données du chef ---------------------------------------------------------------------------------------------
def _rows(name: str) -> list[dict]:
    with open(taxonomy_csv(name), encoding="utf-8") as f:
        return list(csv.DictReader(f))


@lru_cache(maxsize=1)
def data() -> dict:
    by_field: dict[str, dict[str, tuple]] = defaultdict(dict)     # field → tag normalisé → (concept, secteur, poids)
    concepts: dict[str, dict] = {}
    sector_labels: dict[int, dict] = {}
    for r in _rows("tags_by_form_field.csv"):
        if r["status"] != "active":
            continue
        sid, cid, tag = int(r["sector_id"]), r["concept_id"], norm(r["normalized_tag"])
        if len(tag) < 2:
            continue
        prev = by_field[r["field_key"]].get(tag)
        w = float(r["combined_weight"])
        if not prev or w > prev[2]:
            by_field[r["field_key"]][tag] = (cid, sid, w)
        c = concepts.setdefault(cid, {"concept_id": cid, "sector_id": sid, "type": r["tag_type"], "labels": {}})
        lang = {"fr": "fr", "en": "en", "ar": "ar"}.get(r["language_code"])
        if lang and lang not in c["labels"]:
            c["labels"][lang] = r["tag"]
        if sid:
            sector_labels[sid] = {"fr": r["sector_fr"], "en": r["sector_en"], "ar": r["sector_ar"]}
    training = _rows("training_multilingual.csv")
    return {"by_field": dict(by_field), "concepts": concepts, "sector_labels": sector_labels, "training": training}


def sector_label(sid: int, ui: str) -> str:
    return data()["sector_labels"].get(sid, {}).get(ui if ui in ("fr", "en", "ar") else "fr", "")


# --- Méthode 1 : les tags ----------------------------------------------------------------------------------------
def tag_hits(fields: dict[str, str]) -> list[dict]:
    """Chaque concept trouvé, avec le meilleur poids par champ (« plombier » en français et en arabizi = une fois)."""
    idx = data()["by_field"]
    best: dict[tuple[str, str], dict] = {}
    for field, text in fields.items():
        key = FIELD_ALIASES.get(field, field)
        tags = idx.get(key) or idx.get("about", {})
        plain, stripped = _variants(norm(text))
        if not plain.strip():
            continue
        for tag, (cid, sid, w) in tags.items():
            needle = f" {tag} "
            if needle in plain or needle in stripped:
                k = (key, cid)
                if k not in best or w > best[k]["weight"]:
                    best[k] = {"field": key, "tag": tag, "concept_id": cid, "sector_id": sid, "weight": w}
    return list(best.values())


def catalogue_sector(job: str) -> tuple[int, str] | None:
    """(secteur, serviceId) si le métier dit est un métier exact du catalogue (services.json), sinon None."""
    if not (job or "").strip():
        return None
    from .taxonomy import lexical_candidates, load as load_taxonomy
    cands = lexical_candidates(job)
    if not cands or cands[0][1] < 1.0:
        return None
    svc = load_taxonomy()["by_id"].get(cands[0][0])
    try:
        return (int(svc["sector"]), svc["id"]) if svc and int(svc["sector"]) in SECTORS else None
    except (TypeError, ValueError):
        return None


# --- Méthode 2 : le petit modèle -----------------------------------------------------------------------------------
@lru_cache(maxsize=1)
def model():
    """Entraîné sur les exemples « train » (jamais validation ni test) + chaque tag du dictionnaire comme mini-exemple."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline

    X, y = [], []
    for r in data()["training"]:
        if r["split"] == "train":
            X.append(norm(r["transcript"]))
            y.append(int(r["sector_id"]))
    for tags in data()["by_field"].values():
        for tag, (_, sid, _) in tags.items():
            if sid:
                X.append(tag)
                y.append(sid)
    clf = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=1),
                        LogisticRegression(max_iter=2000, C=8.0))
    clf.fit(X, y)
    return clf


def model_probs(text: str) -> dict[int, float]:
    clf = model()
    probs = clf.predict_proba([norm(text)])[0]
    return {int(c): float(p) for c, p in zip(clf.classes_, probs)}


# --- L'agent -------------------------------------------------------------------------------------------------------
def classify(fields: dict[str, str], ui: str = "fr", use_model: bool = True) -> dict:
    """Entrée : les champs du profil (main_job_service, about, interests_services, service_type, video_presentation…).
    Sortie : secteur + confiance + statut (fill / suggest / empty) + alternatives + concepts + objectifs, en codes."""
    fields = {k: v for k, v in (fields or {}).items() if isinstance(v, str) and v.strip()}
    hits = tag_hits(fields)
    tag_scores: dict[int, float] = defaultdict(float)
    concept_scores: dict[str, float] = defaultdict(float)
    for h in hits:
        concept_scores[h["concept_id"]] += h["weight"]
        if h["sector_id"]:
            tag_scores[h["sector_id"]] += h["weight"]

    total = sum(tag_scores.values())
    tag_p = {s: tag_scores.get(s, 0.0) / total for s in SECTORS} if total else {}
    text_all = " ".join(fields.values())
    model_p = model_probs(text_all) if use_model and text_all.strip() else {}

    if tag_p and model_p:
        final = {s: TAG_WEIGHT * tag_p.get(s, 0) + MODEL_WEIGHT * model_p.get(s, 0) for s in SECTORS}
        method = "tags+modèle"
    elif tag_p:
        final, method = tag_p, "tags"
    elif model_p:
        final, method = model_p, "modèle"
    else:
        final, method = {}, "aucune"

    # Métier exact de notre catalogue (78 métiers) : il décide du secteur. Le dictionnaire du chef ne contient pas
    # 64 de ces métiers : sans cette règle, « femme de ménage » partait en Transport et « mécanicien » restait vide.
    cat = catalogue_sector(fields.get("main_job_service", "") or fields.get("profession", ""))
    if cat:
        final = {sid: 0.1 * final.get(sid, 0.0) for sid in SECTORS}
        final[cat[0]] = final.get(cat[0], 0.0) + 0.9
        method = f"{method}+catalogue" if method != "aucune" else "catalogue"

    ranked = sorted(final.items(), key=lambda kv: -kv[1])
    top_sid, top = ranked[0] if ranked else (None, 0.0)
    second = ranked[1][1] if len(ranked) > 1 else 0.0
    if top_sid and top >= FILL_CONF and top - second >= FILL_MARGIN:
        status = "fill"
    elif top_sid and top >= SUGGEST_CONF:
        status = "suggest"                      # on propose les 2 premiers, la personne choisit
    else:
        status, top_sid = "empty", None

    cdata = data()["concepts"]
    lab = ui if ui in ("fr", "en", "ar") else "fr"
    concepts = sorted(({"concept_id": c, "label": cdata[c]["labels"].get(lab, ""), "type": cdata[c]["type"],
                        "sector_id": cdata[c]["sector_id"], "score": round(s, 3)}
                       for c, s in concept_scores.items()), key=lambda d: -d["score"])
    return {
        "sector_id": top_sid,
        "sector_label": sector_label(top_sid, ui) if top_sid else None,
        "confidence": round(top, 3),
        "status": status,
        "alternatives": [{"sector_id": s, "label": sector_label(s, ui), "score": round(p, 3)} for s, p in ranked[:3] if p > 0.05],
        "concepts": [c for c in concepts if c["sector_id"]],
        "goals": [c for c in concepts if not c["sector_id"]],
        "evidence": [{"field": h["field"], "tag": h["tag"], "concept_id": h["concept_id"]} for h in hits],
        "method": method,
        # Format attendu par le moteur du chef (Profile de AIMatchingEngine.ts) : catégorie = secteur, rôle, tags normalisés.
        "category": str(top_sid) if top_sid else None,
        "role": (fields.get("main_job_service") or (concepts[0]["label"] if concepts else "")).strip(),
        "tags": [c["concept_id"] for c in concepts],
        "tagLabels": sorted({_engine_norm(c["label"]) for c in concepts if c["label"]}),
    }


def _engine_norm(text: str) -> str:
    from .engine import norm                      # même normalisation que le moteur (accents, casse, arabe)
    return norm(text)
