import sys
import types

from app.processors import get_processor
from app.processors.verify_identity import FACE_MODEL_NAME, warm_face_model


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


def test_warm_face_model_builds_the_same_model_the_processor_verifies_with(monkeypatch, tmp_path):
    # Warming a different model name than DeepFace.verify() uses would leave the real
    # download on the first job — the exact failure this warm-up exists to prevent.
    _set_required_env(monkeypatch, tmp_path)
    monkeypatch.setenv("AI_ENABLE_FACE_MODEL", "true")

    built: list[str] = []
    fake_deepface = types.ModuleType("deepface")
    fake_deepface.DeepFace = types.SimpleNamespace(build_model=built.append)
    monkeypatch.setitem(sys.modules, "deepface", fake_deepface)

    assert warm_face_model() is True
    assert built == [FACE_MODEL_NAME]
