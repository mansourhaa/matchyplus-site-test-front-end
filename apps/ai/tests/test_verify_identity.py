import sys
import types

import pytest

from app.processors import get_processor
from app.processors.verify_identity import (
    FACE_DETECTOR_BACKEND,
    FACE_MODEL_NAME,
    warm_face_model,
)


def _set_required_env(monkeypatch, tmp_path):
    # load_settings() requires these for every processor call, even though this
    # processor only actually needs AI_UPLOADS_DIR / AI_ENABLE_FACE_MODEL — keeps the
    # test self-contained regardless of the ambient environment.
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
    monkeypatch.setenv("AI_UPLOADS_DIR", str(tmp_path))


def test_stub_path_is_deterministic_when_the_face_model_is_disabled(monkeypatch, tmp_path):
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.delenv("AI_ENABLE_FACE_MODEL", raising=False)

    processor = get_processor("VERIFY_IDENTITY")
    result = processor({"selfiePath": "identity/does-not-exist.jpg"})

    assert result["ok"] is True
    assert result["processor"] == "verify_identity"
    assert result["verified"] is True
    assert "DeepFace" not in result["reason"]


def test_stub_path_respects_a_forced_override(monkeypatch, tmp_path):
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.delenv("AI_ENABLE_FACE_MODEL", raising=False)

    processor = get_processor("VERIFY_IDENTITY")
    result = processor({"forceVerified": False})

    assert result["verified"] is False


def test_stub_path_still_deletes_the_selfie_file(monkeypatch, tmp_path):
    # The stub never reads the selfie, but cleanup must still happen — otherwise every
    # verification attempt in the (default, flag-off) stub mode leaks a file.
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.delenv("AI_ENABLE_FACE_MODEL", raising=False)

    identity_dir = tmp_path / "identity"
    identity_dir.mkdir()
    selfie_file = identity_dir / "selfie.jpg"
    selfie_file.write_bytes(b"fake-image-bytes")

    processor = get_processor("VERIFY_IDENTITY")
    processor({"selfiePath": "identity/selfie.jpg"})

    assert not selfie_file.exists()


def test_warm_face_model_is_a_noop_when_the_face_model_is_disabled(monkeypatch, tmp_path):
    # The stub path must never import DeepFace — pulling in TensorFlow at worker boot
    # would cost seconds and hundreds of MB for a deployment that never uses the model.
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.delenv("AI_ENABLE_FACE_MODEL", raising=False)
    monkeypatch.delitem(sys.modules, "deepface", raising=False)

    assert warm_face_model() is False
    assert "deepface" not in sys.modules


def test_warm_face_model_builds_the_same_models_the_processor_verifies_with(monkeypatch, tmp_path):
    # Warming names other than the ones verify() uses leaves the download on the first
    # job. The detector is a separate cache entry, so it needs warming too.
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.setenv("AI_ENABLE_FACE_MODEL", "true")

    built: list[tuple[str, str]] = []
    warm_verifies: list[dict] = []

    def build_model(model_name, task="facial_recognition"):
        built.append((model_name, task))

    def verify(*_args, **kwargs):
        warm_verifies.append(kwargs)
        return {"verified": False, "distance": 1.0, "threshold": 0.3}

    fake_deepface = types.ModuleType("deepface")
    fake_deepface.DeepFace = types.SimpleNamespace(build_model=build_model, verify=verify)
    monkeypatch.setitem(sys.modules, "deepface", fake_deepface)

    assert warm_face_model() is True
    assert built == [
        (FACE_MODEL_NAME, "facial_recognition"),
        (FACE_DETECTOR_BACKEND, "face_detector"),
    ]
    # Weights alone are not enough — a throwaway inference must run so TensorFlow traces
    # the graph at boot.
    assert len(warm_verifies) == 1
    assert warm_verifies[0]["model_name"] == FACE_MODEL_NAME
    assert warm_verifies[0]["detector_backend"] == FACE_DETECTOR_BACKEND


def test_an_undetectable_face_is_reported_as_such_and_not_as_a_mismatch(monkeypatch, tmp_path):
    # An unusable capture must not be reported as a mismatch.
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.setenv("AI_ENABLE_FACE_MODEL", "true")

    identity_dir = tmp_path / "identity"
    identity_dir.mkdir()
    selfie_file = identity_dir / "selfie.jpg"
    selfie_file.write_bytes(b"fake-image-bytes")

    class FaceNotDetected(ValueError):
        pass

    def verify(*_args, **_kwargs):
        # Matches DeepFace's real behaviour: it re-raises a bare ValueError chained to
        # the original, so the type is only reachable via __cause__.
        try:
            raise FaceNotDetected("Face could not be detected.")
        except ValueError as err:
            raise ValueError("Exception while processing img2_path") from err

    fake_deepface = types.ModuleType("deepface")
    fake_deepface.DeepFace = types.SimpleNamespace(verify=verify)
    fake_exceptions = types.ModuleType("deepface.modules.exceptions")
    fake_exceptions.FaceNotDetected = FaceNotDetected
    monkeypatch.setitem(sys.modules, "deepface", fake_deepface)
    monkeypatch.setitem(sys.modules, "deepface.modules.exceptions", fake_exceptions)

    processor = get_processor("VERIFY_IDENTITY")
    result = processor(
        {"selfiePath": "identity/selfie.jpg", "profilePhotoPath": "photos/owner.jpg"}
    )

    assert result["ok"] is True
    assert result["code"] == "no_face_detected"
    assert result["verified"] is False
    assert not selfie_file.exists()


def test_a_real_comparison_reports_raw_distance_and_threshold(monkeypatch, tmp_path):
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.setenv("AI_ENABLE_FACE_MODEL", "true")

    class FaceNotDetected(ValueError):
        pass

    def verify(*_args, **_kwargs):
        return {"verified": True, "distance": 0.21, "threshold": 0.3}

    fake_deepface = types.ModuleType("deepface")
    fake_deepface.DeepFace = types.SimpleNamespace(verify=verify)
    fake_exceptions = types.ModuleType("deepface.modules.exceptions")
    fake_exceptions.FaceNotDetected = FaceNotDetected
    monkeypatch.setitem(sys.modules, "deepface", fake_deepface)
    monkeypatch.setitem(sys.modules, "deepface.modules.exceptions", fake_exceptions)

    processor = get_processor("VERIFY_IDENTITY")
    result = processor({"selfiePath": "identity/x.jpg", "profilePhotoPath": "photos/owner.jpg"})

    assert result["verified"] is True
    assert result["code"] == "match"
    assert result["distance"] == 0.21
    assert result["threshold"] == 0.3
    assert result["model"] == FACE_MODEL_NAME
    assert "confidence" not in result


def test_an_unreadable_image_still_fails_the_job(monkeypatch, tmp_path):
    # Only detection failures become a result; anything else must fail the job.
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.setenv("AI_ENABLE_FACE_MODEL", "true")

    class FaceNotDetected(ValueError):
        pass

    def verify(*_args, **_kwargs):
        raise ValueError("Exception while loading /data/uploads/photos/missing.jpg")

    fake_deepface = types.ModuleType("deepface")
    fake_deepface.DeepFace = types.SimpleNamespace(verify=verify)
    fake_exceptions = types.ModuleType("deepface.modules.exceptions")
    fake_exceptions.FaceNotDetected = FaceNotDetected
    monkeypatch.setitem(sys.modules, "deepface", fake_deepface)
    monkeypatch.setitem(sys.modules, "deepface.modules.exceptions", fake_exceptions)

    processor = get_processor("VERIFY_IDENTITY")
    with pytest.raises(ValueError, match="Exception while loading"):
        processor({"selfiePath": "identity/x.jpg", "profilePhotoPath": "photos/missing.jpg"})
