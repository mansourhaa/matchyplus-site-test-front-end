"""Configuration par variables d'environnement. Tout est local : aucune clé API, aucun appel cloud."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


# Modèles téléchargés par scripts/download_models.py (jamais dans git) : apps/voice-ai/models par défaut.
MODELS_DIR = Path(os.getenv("MODELS_DIR", str(BASE_DIR / "models")))
# Fichiers du chef de projet : data/taxonomy/ du monorepo (matchyplus_*.csv) — jamais copiés dans ce service.
TAXONOMY_DIR = Path(os.getenv("TAXONOMY_DIR", str(BASE_DIR.parent.parent / "data" / "taxonomy")))


def taxonomy_csv(name: str) -> Path:
    """« form_options_3lang.csv » → data/taxonomy/matchyplus_form_options_3lang.csv (ou le nom court s'il existe)."""
    short = TAXONOMY_DIR / name
    return short if short.exists() else TAXONOMY_DIR / f"matchyplus_{name}"


def _local_whisper() -> str:
    """Préfère un modèle Whisper déjà présent dans ./models (fonctionnement hors ligne)."""
    models = MODELS_DIR
    for size in ("large-v3-turbo", "large-v3", "medium", "small", "base", "tiny"):
        if (models / f"faster-whisper-{size}" / "model.bin").exists():
            return str(models / f"faster-whisper-{size}")
    return "small"


@dataclass
class Settings:
    # --- Transcription (ASR) -------------------------------------------------------------
    # Whisper (faster-whisper) : très bon en français, anglais, arabe standard ; faible en derja.
    # Chemin local (téléchargé par scripts/download_models.py) ou nom de taille (tiny … large-v3-turbo).
    whisper_model: str = os.getenv("WHISPER_MODEL", _local_whisper())
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")             # cpu | cuda
    whisper_compute: str = os.getenv("WHISPER_COMPUTE", "int8")          # int8 (CPU) | float16 (GPU)
    # Moteur derja : LinTO ASR ar-tn (Kaldi / Vosk, Apache-2.0, tourne sur CPU).
    derja_engine: str = os.getenv("DERJA_ENGINE", "vosk")                # vosk | fwhisper | hf | none
    vosk_model_path: str = os.getenv("VOSK_MODEL_PATH", str(MODELS_DIR / "linto-asr-ar-tn"))
    # Whisper fine-tuné derja (sortie de training/finetune_whisper.py, format faster-whisper) : DERJA_ENGINE=fwhisper
    derja_whisper_path: str = os.getenv("DERJA_WHISPER_PATH", str(MODELS_DIR / "faster-whisper-matchy-derja"))
    # Option GPU : modèle Hugging Face (ex. Whisper fine-tuné derja), chargé depuis un dossier local.
    hf_asr_model: str = os.getenv("HF_ASR_MODEL", "")
    # Seuil au-dessus duquel on fait confiance à Whisper seul (français / anglais détectés).
    whisper_lang_threshold: float = float(os.getenv("WHISPER_LANG_THRESHOLD", "0.6"))
    # Langue forcée pour la 2e passe Whisper quand la langue est incertaine (derja + français en Tunisie).
    whisper_second_lang: str = os.getenv("WHISPER_SECOND_LANG", "fr")
    # Langues possibles pour la détection automatique : jamais d'islandais ou de portugais pour une voix tunisienne.
    whisper_languages: tuple = tuple(os.getenv("WHISPER_LANGUAGES", "ar,fr,en").split(","))
    # 3e lecture « Whisper forcé en français » quand le modèle derja tourne : inutile en général (il lit le français),
    # et c'est une passe de plus à attendre. WHISPER_FORCED_WITH_HF=true pour la remettre.
    forced_pass_with_hf: bool = _bool("WHISPER_FORCED_WITH_HF", False)
    # Whisper sur processeur alors que le modèle derja est sur GPU : on ne l'attend pas (il prend ~50 s pour 20 s de son).
    skip_cpu_whisper_with_hf: bool = _bool("SKIP_CPU_WHISPER_WITH_HF", True)
    asr_cache_size: int = int(os.getenv("ASR_CACHE_SIZE", "30"))
    # Mots prioritaires (métiers, villes) pour Whisper : désactivés par défaut, à tester avec eval.py.
    whisper_hotwords: bool = _bool("WHISPER_HOTWORDS", False)

    # --- LLM local (Ollama) -------------------------------------------------------------
    ollama_url: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    # off : règles seules (le plus léger) · fallback : règles puis LLM si elles hésitent · on : LLM d'abord
    llm_mode: str = os.getenv("LLM_MODE", "fallback")
    llm_model: str = os.getenv("LLM_MODEL", "qwen3:4b")                  # précis : qwen2.5:7b ; GPU : qwen3:14b
    embed_model: str = os.getenv("EMBED_MODEL", "bge-m3")
    llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "120"))

    # --- Règles ---------------------------------------------------------------------------
    max_seconds: float = float(os.getenv("MAX_SECONDS", "20.5"))
    min_speech_seconds: float = float(os.getenv("MIN_SPEECH_SECONDS", "1.0"))
    silence_db: str = os.getenv("SILENCE_DB", "-35dB")
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    data_dir: Path = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
    preload_models: bool = _bool("PRELOAD_MODELS", False)
    prompt_version: str = "profile-local-v1"
    thresholds: dict = field(default_factory=lambda: {
        "first_name": 0.85, "last_name": 0.85, "sector_id": 0.85, "profession": 0.80,
        "usage_type": 0.80, "bio": 0.75,
    })
    default_threshold: float = 0.80


settings = Settings()
