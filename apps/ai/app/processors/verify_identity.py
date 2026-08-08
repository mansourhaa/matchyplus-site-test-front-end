from __future__ import annotations

import logging
import os
from typing import Any

from app.config import load_settings

logger = logging.getLogger(__name__)

# Shared by warm_face_model() and process_verify_identity(): DeepFace caches a built
# model per name, so warming one name and verifying with another would silently pay the
# whole load cost again on the first real job.
FACE_MODEL_NAME = "VGG-Face"
FACE_DETECTOR_BACKEND = "opencv"


def warm_face_model() -> bool:
    """Builds the face model before any job runs. Returns True when a model was built.

    DeepFace downloads its weights (~553MB for VGG-Face) on first use and builds the
    TensorFlow graph lazily *inside* the first call. Left alone, that entire cost lands
    on the first user's job — measured at ~153s locally, far longer than any sane client
    poll budget, so the job succeeded long after the UI had given up. Paying it at worker
    boot instead keeps first-job latency in line with every later job.
    """
    settings = load_settings()
    if not settings.enable_face_model:
        return False

    from deepface import DeepFace  # lazy import — skip loading TensorFlow on the stub path

    logger.info("Warming face model %s — first boot downloads weights", FACE_MODEL_NAME)
    DeepFace.build_model(FACE_MODEL_NAME)
    logger.info("Face model %s ready", FACE_MODEL_NAME)
    return True


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
            model_name=FACE_MODEL_NAME,
            detector_backend=FACE_DETECTOR_BACKEND,
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
        #
        # isfile, not exists: an absent or empty selfiePath makes os.path.join collapse
        # to the uploads directory itself, and os.remove() on a directory raises
        # IsADirectoryError *from this finally block* — masking whatever the try block
        # was returning or raising, and failing the job for all its retries.
        if os.path.isfile(selfie_path):
            os.remove(selfie_path)
