from app.processors import get_processor


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
