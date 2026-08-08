from __future__ import annotations

import os
from typing import Any

from app.config import load_settings


def process_verify_identity(payload: dict[str, Any]) -> dict[str, Any]:
    """Compares a selfie against the user's profile photo.

    Both paths below are given `selfiePath`/`profilePhotoPath` — paths relative to the
    shared uploads root (AI_UPLOADS_DIR), not raw image bytes (those never travel through
    Redis/Postgres). Real comparison is gated behind AI_ENABLE_FACE_MODEL (default off)
    so tests/CI stay fast and deterministic on the stub path.
    """
    settings = load_settings()
    selfie_path = os.path.join(settings.uploads_dir, payload.get("selfiePath", ""))

    try:
        if not settings.enable_face_model:
            return {
                "ok": True,
                "processor": "verify_identity",
                "verified": bool(payload.get("forceVerified", True)),
                "livenessScore": float(payload.get("livenessScore", 0.99)),
                "matchScore": float(payload.get("matchScore", 0.98)),
                "reason": "Stub verification — AI_ENABLE_FACE_MODEL is off.",
            }

        from deepface import DeepFace  # lazy import — skip loading TensorFlow on the stub path

        profile_path = os.path.join(settings.uploads_dir, payload["profilePhotoPath"])
        result = DeepFace.verify(
            profile_path,
            selfie_path,
            model_name="VGG-Face",
            detector_backend="opencv",
            distance_metric="cosine",
            enforce_detection=False,
        )
        confidence = round((1 - result["distance"]) * 100)
        return {
            "ok": True,
            "processor": "verify_identity",
            "verified": bool(result["verified"]),
            "confidence": confidence,
            "distance": result["distance"],
            "threshold": result["threshold"],
            "reason": "DeepFace VGG-Face/cosine comparison.",
        }
    finally:
        # Selfie is single-use — delete it whichever path ran (the stub never touches
        # it, so this also cleans up the still-common default-flag-off case). The
        # profile photo is the user's permanent photo and is never deleted here.
        if os.path.exists(selfie_path):
            os.remove(selfie_path)
