from __future__ import annotations

import logging
import os
from typing import Any

from app.config import load_settings

logger = logging.getLogger(__name__)

# More accurate than DeepFace's VGG-Face/opencv defaults, which reject same-person
# comparisons on hair, makeup or lighting changes. Warm-up and verification must use the
# same values — DeepFace caches models per (task, name).
FACE_MODEL_NAME = "Facenet512"
FACE_DETECTOR_BACKEND = "retinaface"

# NO_FACE is distinct from MISMATCH: it means the capture was unusable, not that the two
# people differ. Callers branch on this rather than on `reason`.
CODE_MATCH = "match"
CODE_MISMATCH = "mismatch"
CODE_NO_FACE = "no_face_detected"


def _is_face_not_detected(error: BaseException, face_not_detected_cls: type) -> bool:
    """True when `error` is, or was caused by, DeepFace's FaceNotDetected.

    DeepFace catches ValueError — which FaceNotDetected subclasses — and re-raises a bare
    `ValueError(...) from err`, so the type only survives on __cause__ and
    `except FaceNotDetected` around verify() never fires.
    """
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, face_not_detected_cls):
            return True
        current = current.__cause__
    return False


def warm_face_model() -> bool:
    """Loads both models at boot. Returns True when models were built.

    DeepFace downloads weights lazily inside the first call, which would otherwise put
    ~150s on the first user's job. The detector is a separate download from the
    recognition model, so both are warmed.
    """
    settings = load_settings()
    if not settings.enable_face_model:
        return False

    from deepface import DeepFace  # lazy import — skip loading TensorFlow on the stub path

    logger.info(
        "Warming face models %s + %s — first boot downloads weights",
        FACE_MODEL_NAME,
        FACE_DETECTOR_BACKEND,
    )
    DeepFace.build_model(FACE_MODEL_NAME)
    DeepFace.build_model(FACE_DETECTOR_BACKEND, task="face_detector")

    # Weights alone are not the whole cost: TensorFlow traces the graph on the first
    # inference (~20s). Run a throwaway comparison so that happens here instead.
    import numpy as np

    blank = np.zeros((160, 160, 3), dtype=np.uint8)
    DeepFace.verify(
        blank,
        blank,
        model_name=FACE_MODEL_NAME,
        detector_backend=FACE_DETECTOR_BACKEND,
        distance_metric="cosine",
        enforce_detection=False,
    )
    logger.info("Face models ready")
    return True


def process_verify_identity(payload: dict[str, Any]) -> dict[str, Any]:
    """Compares a selfie against the user's profile photo.

    `selfiePath`/`profilePhotoPath` are relative to the shared uploads root
    (AI_UPLOADS_DIR); image bytes never travel through Redis/Postgres. Real comparison is
    gated behind AI_ENABLE_FACE_MODEL (default off) so tests stay fast and deterministic.
    """
    settings = load_settings()
    selfie_path = os.path.join(settings.uploads_dir, payload.get("selfiePath", ""))

    try:
        if not settings.enable_face_model:
            forced = bool(payload.get("forceVerified", True))
            return {
                "ok": True,
                "processor": "verify_identity",
                "verified": forced,
                "code": CODE_MATCH if forced else CODE_MISMATCH,
                "livenessScore": float(payload.get("livenessScore", 0.99)),
                "matchScore": float(payload.get("matchScore", 0.98)),
                "reason": "Stub verification — AI_ENABLE_FACE_MODEL is off.",
            }

        from deepface import DeepFace  # lazy import — skip loading TensorFlow on the stub path
        from deepface.modules.exceptions import FaceNotDetected

        profile_path = os.path.join(settings.uploads_dir, payload["profilePhotoPath"])
        try:
            result = DeepFace.verify(
                profile_path,
                selfie_path,
                model_name=FACE_MODEL_NAME,
                detector_backend=FACE_DETECTOR_BACKEND,
                distance_metric="cosine",
                # Must stay True: when disabled, DeepFace compares the whole images
                # instead of faces, turning an unusable capture into a confident
                # "mismatch".
                enforce_detection=True,
            )
        except ValueError as error:
            # Unreadable/missing images must still fail the job.
            if not _is_face_not_detected(error, FaceNotDetected):
                raise
            # Returned, not raised: retrying cannot help (same images, and the selfie is
            # deleted below), so raising would only burn the job's retries.
            logger.info("No face detected in the selfie or profile photo")
            return {
                "ok": True,
                "processor": "verify_identity",
                "verified": False,
                "code": CODE_NO_FACE,
                "model": FACE_MODEL_NAME,
                "detector": FACE_DETECTOR_BACKEND,
                "reason": "No face could be detected in the selfie or the profile photo.",
            }

        verified = bool(result["verified"])
        return {
            "ok": True,
            "processor": "verify_identity",
            "verified": verified,
            "code": CODE_MATCH if verified else CODE_MISMATCH,
            # Raw numbers only: any single "confidence" percentage is meaningless without
            # the threshold, which varies per model.
            "distance": result["distance"],
            "threshold": result["threshold"],
            "model": FACE_MODEL_NAME,
            "detector": FACE_DETECTOR_BACKEND,
            "reason": f"DeepFace {FACE_MODEL_NAME}/cosine comparison.",
        }
    finally:
        # Selfie is single-use; the profile photo is permanent and never deleted here.
        # isfile, not exists: an empty selfiePath collapses the join to the uploads
        # directory, and os.remove() on a directory would raise from this finally block.
        if os.path.isfile(selfie_path):
            os.remove(selfie_path)
