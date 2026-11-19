"""ANALYZE_VIDEO: onboarding video -> transcription -> profile form fields (FR / AR / EN).

The worker keeps its role (read the Redis stream, update AiJob). The speech models live in the internal
voice-ai service (apps/voice-ai), so this image stays small. No media or text leaves our servers.

Payload (written by the API, like VERIFY_IDENTITY):
    {"mediaPath": "videos/<file>.webm", "uiLocale": "ar" | "fr" | "en", "targetField": null | "<field key>",
     "deleteAfter": false}
mediaPath is relative to AI_UPLOADS_DIR. Bytes never go through Redis or Postgres.
The file is kept by default: the onboarding video is also the user's profile video (/uploads/videos).
Only a temporary clip sent with "deleteAfter": true is removed once analysed.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx

VOICE_AI_URL = os.getenv("VOICE_AI_URL", "http://voice-ai:8001")
VOICE_AI_TIMEOUT = float(os.getenv("VOICE_AI_TIMEOUT", "180"))
# Business errors are final (the job is SUCCEEDED with ok=false); anything else raises so the worker can retry.
BUSINESS_ERRORS = {
    "VIDEO_TOO_LONG",
    "NO_SPEECH_DETECTED",
    "UNSUPPORTED_MEDIA",
    "FILE_TOO_LARGE",
    "MEDIA_NOT_FOUND",
}


def _uploads_dir() -> Path:
    return Path(os.getenv("AI_UPLOADS_DIR", "/data/uploads")).resolve()


def process_analyze_video(payload: dict[str, Any]) -> dict[str, Any]:
    root = _uploads_dir()
    relative = str(payload.get("mediaPath") or payload.get("filePath") or "")
    path = (root / relative).resolve()
    if not relative or root not in path.parents or not path.is_file():
        return {"ok": False, "processor": "analyze_video", "error": "MEDIA_NOT_FOUND"}

    with path.open("rb") as fh:
        response = httpx.post(
            f"{VOICE_AI_URL}/analyze",
            timeout=VOICE_AI_TIMEOUT,
            files={"media": (path.name, fh)},
            data={
                "uiLocale": payload.get("uiLocale") or "fr",
                "field": payload.get("targetField") or "",
            },
        )
    # A proxy or a crash can answer plain text or HTML (500/502/504): retry with a clear message.
    try:
        body = response.json()
    except ValueError:
        raise RuntimeError(
            f"voice-ai {response.status_code}: {response.text[:200]}"
        ) from None
    if not isinstance(body, dict):
        raise RuntimeError(f"voice-ai {response.status_code}: {str(body)[:200]}")
    if response.status_code == 503:  # voice-ai not ready -> retry later
        raise RuntimeError(body.get("detail") or "AI_UNAVAILABLE")
    if not (body.get("ok") or body.get("error") in BUSINESS_ERRORS):
        raise RuntimeError(f"voice-ai {response.status_code}: {body}")

    if (
        payload.get("deleteAfter") is True
    ):  # temporary clip only, never the profile video
        path.unlink(missing_ok=True)
    return {"processor": "analyze_video", **body}
