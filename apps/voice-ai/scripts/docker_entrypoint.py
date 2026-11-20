"""
Container entrypoint (apps/voice-ai/Dockerfile).

1. Downloads the speech models into MODELS_DIR the first time (Whisper + LinTO derja),
   unless DOWNLOAD_MODELS=false. The folder is a volume, so later starts skip this.
2. Starts the API with uvicorn on 0.0.0.0:VOICE_AI_PORT (8001).

A failed download does not stop the service: /relabel, /classify, /agents/feed and the
form options work without speech models, and /health reports derjaReady=false.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

MODELS_DIR = Path(os.getenv("MODELS_DIR", "/models"))
WHISPER_SIZE = os.getenv("WHISPER_SIZE", "small")


def _missing_models() -> bool:
    whisper = MODELS_DIR / f"faster-whisper-{WHISPER_SIZE}" / "model.bin"
    linto = MODELS_DIR / "linto-asr-ar-tn" / "am"
    return not whisper.exists() or not linto.is_dir()


def download_if_needed() -> None:
    if os.getenv("DOWNLOAD_MODELS", "true").lower() not in {"1", "true", "yes", "on"}:
        print("[voice-ai] DOWNLOAD_MODELS=false: using the models already in", MODELS_DIR, flush=True)
        return
    if not _missing_models():
        print("[voice-ai] models found in", MODELS_DIR, flush=True)
        return
    print(f"[voice-ai] first start: downloading Whisper {WHISPER_SIZE} + LinTO derja into {MODELS_DIR}…",
          flush=True)
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    try:
        import download_models

        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        download_models.download_whisper(WHISPER_SIZE)
        download_models.download_linto()
    except Exception as exc:  # noqa: BLE001 — the API must still start
        print(f"[voice-ai] model download failed ({exc}); starting without speech models", flush=True)


def main() -> None:
    download_if_needed()
    port = os.getenv("VOICE_AI_PORT", "8001")
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])


if __name__ == "__main__":
    main()
