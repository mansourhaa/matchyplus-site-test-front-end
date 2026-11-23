"""Transcription locale : Whisper (FR / EN / arabe standard) + moteur derja (LinTO Vosk ou modèle HF local)."""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
import json
import logging
import re
import threading
import wave
from pathlib import Path
from dataclasses import dataclass, field

from ..config import settings

log = logging.getLogger(__name__)
_lock = threading.Lock()
_engines: dict[str, object] = {}


@dataclass
class Transcript:
    text: str
    engine: str
    language: str | None = None
    language_prob: float | None = None
    seconds: float = 0.0                              # durée du calcul de cette lecture


@dataclass
class AsrResult:
    primary: Transcript
    secondary: Transcript | None = None
    route: str = ""
    extra: list[Transcript] = field(default_factory=list)
    all_text: str = field(default="")

    def __post_init__(self) -> None:
        parts = [self.primary.text] + ([self.secondary.text] if self.secondary else []) + [t.text for t in self.extra]
        self.all_text = " ".join(p for p in parts if p)


_REPEAT = re.compile(r"(\b\w+(?:\W+\w+){0,3}?)(?:\W+\1\b){2,}", re.IGNORECASE | re.UNICODE)


def clean_repeats(text: str) -> str:
    """Supprime les boucles d'hallucination de Whisper (« Anaela. Anaela. Anaela. ») : garde une seule occurrence."""
    previous = None
    while previous != text:
        previous, text = text, _REPEAT.sub(r"\1", text)
    return text


# ----------------------------------------------------------------------------- vocabulaire Matchy+
def domain_hotwords() -> str:
    """Mots prioritaires pour Whisper : métiers et villes du référentiel (améliore leur reconnaissance)."""
    from ..matching import places
    from ..taxonomy import load

    words = [s["fr"] for s in load()["services"]] + [p["fr"] for p in places()]
    return ", ".join(dict.fromkeys(words))



# ----------------------------------------------------------------------------- moteurs
def load_wav(path: str):
    """Lit le WAV 16 kHz mono (déjà produit par ffmpeg) en tableau numpy float32.
    On donne ce tableau à Whisper : faster-whisper n'utilise alors PAS PyAV (bibliothèque `av`),
    qui cassait sur Colab (« metadata_errors », « module 'av' has no attribute 'audio' »)."""
    import numpy as np

    with wave.open(path, "rb") as wf:
        if wf.getframerate() != 16000 or wf.getnchannels() != 1 or wf.getsampwidth() != 2:
            raise ValueError("WAV attendu : 16 kHz, mono, 16 bits")
        frames = wf.readframes(wf.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0


class WhisperEngine:
    def __init__(self) -> None:
        self.device, self.compute = settings.whisper_device, settings.whisper_compute
        self._load()

    def _load(self) -> None:
        from faster_whisper import WhisperModel   # import tardif : démarrage rapide de l'API

        log.info("Chargement Whisper %s (%s/%s)", settings.whisper_model, self.device, self.compute)
        try:
            self.model = WhisperModel(settings.whisper_model, device=self.device, compute_type=self.compute)
        except Exception as exc:  # noqa: BLE001 — GPU mal configuré : on bascule sur le processeur
            if self.device == "cpu":
                raise
            log.warning("GPU indisponible pour Whisper (%s) : passage sur CPU", exc)
            self.device, self.compute = "cpu", "int8"
            self.model = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")

    def transcribe(self, wav: str, language: str | None = None) -> Transcript:
        # Pas de phrase d'exemple en « prompt » : Whisper peut la recopier quand il n'entend pas bien
        # (cas réel du 3 nov. : la phrase d'exemple a été recopiée). Mots prioritaires seulement si activés.
        hotwords = domain_hotwords() if settings.whisper_hotwords else None
        audio = load_wav(wav)

        def run():
            opts = dict(beam_size=5, vad_filter=True, condition_on_previous_text=False, hotwords=hotwords)
            segments, info = self.model.transcribe(audio, language=language, **opts)
            lang, prob = info.language, float(info.language_probability)
            allowed = settings.whisper_languages
            if language is None and lang not in allowed:
                # Cas réel (4 nov.) : derja + français détecté comme de l'islandais → texte illisible.
                # On garde la meilleure des langues autorisées et on relance (le 1er texte n'a pas été calculé).
                probs = dict(getattr(info, "all_language_probs", None) or [])
                lang = max(allowed, key=lambda code: probs.get(code, 0.0))
                prob = float(probs.get(lang, 0.0))
                log.info("Langue détectée %s hors %s : transcription en %s", info.language, allowed, lang)
                segments, _ = self.model.transcribe(audio, language=lang, **opts)
            return " ".join(seg.text.strip() for seg in segments).strip(), lang, prob

        try:
            text, lang, prob = run()
        except RuntimeError as exc:              # ex. bibliothèque CUDA/cuDNN manquante au 1er calcul (Colab)
            if self.device == "cpu":
                raise
            log.warning("Erreur GPU pendant la transcription (%s) : passage sur CPU", exc)
            self.device, self.compute = "cpu", "int8"
            self._load()
            text, lang, prob = run()
        engine = f"whisper-{Path(settings.whisper_model).name}" + (f"-{language}" if language else "")
        return Transcript(text=clean_repeats(text), engine=engine,
                          language=lang, language_prob=round(prob, 3))


def whisper_device() -> str:
    eng = _engines.get("whisper")
    return f"{eng.device}/{eng.compute}" if eng else f"{settings.whisper_device}/{settings.whisper_compute} (pas encore chargé)"


class VoskEngine:
    """LinTO ASR ar-tn : derja en écriture arabe, mots français/anglais en lettres latines."""

    def __init__(self) -> None:
        from vosk import Model, SetLogLevel

        SetLogLevel(-1)
        log.info("Chargement Vosk %s", settings.vosk_model_path)
        self.model = Model(settings.vosk_model_path)

    def transcribe(self, wav: str) -> Transcript:
        from vosk import KaldiRecognizer

        with wave.open(wav, "rb") as wf:
            rec = KaldiRecognizer(self.model, wf.getframerate())
            parts: list[str] = []
            while True:
                data = wf.readframes(4000)
                if not data:
                    break
                if rec.AcceptWaveform(data):
                    parts.append(json.loads(rec.Result()).get("text", ""))
            parts.append(json.loads(rec.FinalResult()).get("text", ""))
        return Transcript(text=" ".join(p for p in parts if p).strip(), engine="linto-vosk-ar-tn", language="aeb")


class FineTunedWhisperEngine:
    """Whisper fine-tuné sur vos clips derja (training/finetune_whisper.py), au format faster-whisper."""

    def __init__(self) -> None:
        from faster_whisper import WhisperModel

        log.info("Chargement Whisper derja fine-tuné %s", settings.derja_whisper_path)
        self.model = WhisperModel(settings.derja_whisper_path, device=settings.whisper_device,
                                  compute_type=settings.whisper_compute)

    def transcribe(self, wav: str) -> Transcript:
        segments, _ = self.model.transcribe(wav, language="ar", beam_size=5, vad_filter=True,
                                            condition_on_previous_text=False)
        return Transcript(text=" ".join(s.text.strip() for s in segments).strip(),
                          engine="whisper-matchy-derja", language="aeb")


class HfEngine:
    """
    Option GPU : Whisper fine-tuné derja depuis Hugging Face (ex. FarukSTT, ~32 % d'erreurs annoncées sur la derja)
    ou depuis un dossier local. HF_ASR_MODEL = identifiant Hugging Face ou chemin.
    Attention : vérifier la licence du modèle choisi avant un usage commercial.
    """

    def __init__(self) -> None:
        import torch
        from transformers import pipeline

        cuda = torch.cuda.is_available()
        log.info("Chargement ASR HF %s (GPU %s)", settings.hf_asr_model, cuda)
        dtype = torch.float16 if cuda else torch.float32
        args = dict(model=settings.hf_asr_model, device="cuda:0" if cuda else "cpu")
        try:                                             # transformers 5 : « dtype » ; transformers 4 : « torch_dtype »
            self.pipe = pipeline("automatic-speech-recognition", dtype=dtype, **args)
        except TypeError:
            self.pipe = pipeline("automatic-speech-recognition", torch_dtype=dtype, **args)

    def transcribe(self, wav: str) -> Transcript:
        # Son déjà lu en mémoire (pas de décodage de fichier) ; réglages conseillés par l'auteur du modèle
        # code-switching : langue « ar », transcription, décodage glouton.
        audio = {"raw": load_wav(wav), "sampling_rate": 16000}
        try:
            out = self.pipe(audio, generate_kwargs={"language": "ar", "task": "transcribe", "num_beams": 1})
        except (TypeError, ValueError):                      # modèle non-Whisper : pas d'options de langue
            out = self.pipe(audio)
        text = clean_repeats(str(out.get("text", "")).strip())
        return Transcript(text=text, engine=f"hf:{Path(settings.hf_asr_model).name}", language="aeb")


def _get(name: str):
    with _lock:
        if name not in _engines:
            cls = {"whisper": WhisperEngine, "vosk": VoskEngine, "fwhisper": FineTunedWhisperEngine, "hf": HfEngine}[name]
            _engines[name] = cls()
        return _engines[name]


def derja_available() -> bool:
    if settings.derja_engine == "vosk":
        from pathlib import Path

        return Path(settings.vosk_model_path).is_dir()
    if settings.derja_engine == "fwhisper":
        from pathlib import Path

        return (Path(settings.derja_whisper_path) / "model.bin").exists()
    return settings.derja_engine == "hf" and bool(settings.hf_asr_model)


def _warmup(engine) -> None:
    """1 s de son au démarrage : si le GPU ne marche pas pour Whisper, la bascule sur processeur se fait ici,
    et pas pendant la première vraie analyse (qui sinon attendrait ~1 min)."""
    import math
    import struct
    import tempfile
    path = Path(tempfile.gettempdir()) / "matchy_warmup.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(16000)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 220 * i / 16000))) for i in range(16000)))
    try:
        engine.transcribe(str(path))
    except Exception as exc:  # noqa: BLE001
        log.warning("Échauffement Whisper : %s", exc)
    log.info("Whisper prêt sur %s/%s", engine.device, engine.compute)


def preload() -> None:
    _warmup(_get("whisper"))
    if derja_available():
        try:
            _get(settings.derja_engine)
        except Exception as exc:  # noqa: BLE001 — on démarre quand même, avec Whisper seul
            log.warning("Moteur derja %s non chargé : %s", settings.derja_engine, exc)


# ----------------------------------------------------------------------------- routage
def _timed(fn, *args, **kw) -> Transcript:
    t0 = time.time()
    out = fn(*args, **kw)
    out.seconds = round(time.time() - t0, 2)
    return out


def transcribe(wav: str) -> AsrResult:
    """
    1. Whisper détecte la langue et transcrit (passe « auto »).
    2. Français ou anglais sûrs → cette passe suffit.
    3. Sinon (arabe, derja, mélange) on garde TROIS lectures, et les règles cherchent dans les trois :
       - Whisper forcé en français (WHISPER_SECOND_LANG) : les mots français du tunisien (plombier, robinets,
         disponible, Sousse…) sortent en lettres latines, faciles à reconnaître ;
       - Whisper auto (souvent en arabe) : bon pour l'arabe standard ;
       - LinTO : le moteur derja.
       Ordre : la lecture la plus fiable d'abord (elle sert pour le prénom).
    """
    engine = _get("whisper")
    if settings.derja_engine == "hf" and derja_available():
        # Modèle entraîné sur la derja mélangée au français/anglais : c'est la lecture la plus fiable, en premier.
        # Les deux lectures tournent EN MÊME TEMPS. Whisper sur processeur (GPU indisponible pour lui) prend ~50 s :
        # dans ce cas on ne l'attend pas, le modèle derja suffit (cas réel du 5 nov. : 1,8 s contre 49,4 s).
        def derja_reading():
            try:
                return _timed(_get("hf").transcribe, wav)
            except Exception as exc:  # noqa: BLE001 — le modèle derja ne doit jamais faire tomber l'analyse
                log.warning("Modèle derja indisponible (%s) : on continue avec Whisper", exc)
                return None
        whisper_on_cpu = getattr(engine, "device", "") == "cpu" and settings.skip_cpu_whisper_with_hf
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_derja = pool.submit(derja_reading)
            f_auto = None if whisper_on_cpu else pool.submit(_timed, engine.transcribe, wav)
            derja = f_derja.result()
            auto = f_auto.result() if f_auto else None
        if auto is None and derja is None:                 # dernier recours : Whisper, même lent
            auto = _timed(engine.transcribe, wav)
        lang, prob = ((auto.language or "", auto.language_prob or 0.0) if auto else ("ar", 0.0))
        sure_latin = lang in ("fr", "en") and prob >= settings.whisper_lang_threshold
        need_forced = settings.forced_pass_with_hf and not (sure_latin or lang == settings.whisper_second_lang)
        forced = _timed(engine.transcribe, wav, language=settings.whisper_second_lang) if need_forced else None
        texts = [t for t in (derja, auto, forced) if t and t.text]
        if not texts:
            return AsrResult(primary=auto or derja, route=f"vide (détecté {lang} {prob})")
        route = "+".join(t.engine for t in texts) + f" (détecté {lang} {prob})"
        return AsrResult(primary=texts[0], secondary=texts[1] if len(texts) > 1 else None, extra=texts[2:], route=route)
    auto = _timed(engine.transcribe, wav)
    lang, prob = auto.language or "", auto.language_prob or 0.0
    if lang in ("fr", "en") and prob >= settings.whisper_lang_threshold:
        return AsrResult(primary=auto, route=f"whisper-only ({lang} {prob})")
    forced = auto if lang == settings.whisper_second_lang else engine.transcribe(wav, language=settings.whisper_second_lang)
    derja = _get(settings.derja_engine).transcribe(wav) if derja_available() else None
    texts = [t for t in ([auto, forced] if (lang == "ar" and prob >= settings.whisper_lang_threshold) else [forced, auto])
             if t.text]
    texts = [t for i, t in enumerate(texts) if t not in texts[:i]]          # sans doublon
    if derja and derja.text:
        texts.append(derja)
    if not texts:
        return AsrResult(primary=auto, route=f"vide (détecté {lang} {prob})")
    route = "+".join(t.engine for t in texts) + f" (détecté {lang} {prob})"
    return AsrResult(primary=texts[0], secondary=texts[1] if len(texts) > 1 else None, extra=texts[2:], route=route)
