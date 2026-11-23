"""ANALYZE_VIDEO calls the internal voice-ai service (mocked here: no model, no network)."""

from __future__ import annotations

import httpx
import pytest

from app.processors import get_processor


class FakeResponse:
    def __init__(self, status_code: int, body: dict | None, text: str = ""):
        self.status_code = status_code
        self._body = body
        self.text = text

    def json(self) -> dict:
        if self._body is None:
            raise ValueError("not JSON")
        return self._body


@pytest.fixture
def video(tmp_path, monkeypatch):
    monkeypatch.setenv("AI_UPLOADS_DIR", str(tmp_path))
    (tmp_path / "videos").mkdir()
    clip = tmp_path / "videos" / "intro.webm"
    clip.write_bytes(b"fake-webm")
    return clip


def test_fields_come_back_and_profile_video_is_kept(video, monkeypatch):
    sent = {}

    def fake_post(url, **kwargs):
        sent.update(url=url, data=kwargs["data"])
        return FakeResponse(
            200,
            {
                "ok": True,
                "profile": {"first_name": {"value": "هالة", "status": "fill"}},
            },
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    result = get_processor("ANALYZE_VIDEO")(
        {"mediaPath": "videos/intro.webm", "uiLocale": "ar"}
    )
    assert result["ok"] is True
    assert result["profile"]["first_name"]["value"] == "هالة"
    assert sent["url"].endswith("/analyze") and sent["data"]["uiLocale"] == "ar"
    assert video.exists()  # the profile video is kept


def test_temporary_clip_is_deleted_when_asked(video, monkeypatch):
    monkeypatch.setattr(
        httpx, "post", lambda url, **kw: FakeResponse(200, {"ok": True, "profile": {}})
    )
    get_processor("ANALYZE_VIDEO")(
        {"mediaPath": "videos/intro.webm", "deleteAfter": True}
    )
    assert not video.exists()


def test_business_error_is_final(video, monkeypatch):
    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, **kw: FakeResponse(
            422, {"ok": False, "error": "NO_SPEECH_DETECTED"}
        ),
    )
    result = get_processor("ANALYZE_VIDEO")({"mediaPath": "videos/intro.webm"})
    assert result["error"] == "NO_SPEECH_DETECTED"


def test_voice_ai_down_raises_for_retry(video, monkeypatch):
    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, **kw: FakeResponse(503, {"ok": False, "detail": "loading"}),
    )
    with pytest.raises(RuntimeError):
        get_processor("ANALYZE_VIDEO")({"mediaPath": "videos/intro.webm"})
    assert video.exists()  # kept for the retry


def test_non_json_error_page_raises_a_clear_error_for_retry(video, monkeypatch):
    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, **kw: FakeResponse(502, None, "<html>502 Bad Gateway</html>"),
    )
    with pytest.raises(RuntimeError, match="voice-ai 502: <html>502 Bad Gateway"):
        get_processor("ANALYZE_VIDEO")({"mediaPath": "videos/intro.webm"})
    assert video.exists()  # kept for the retry


def test_path_outside_uploads_is_refused(video):
    result = get_processor("ANALYZE_VIDEO")({"mediaPath": "../../etc/passwd"})
    assert result == {
        "ok": False,
        "processor": "analyze_video",
        "error": "MEDIA_NOT_FOUND",
    }


def test_readonly_uploads_mount_does_not_fail_delete_after(video, monkeypatch):
    monkeypatch.setattr(
        httpx, "post", lambda url, **kw: FakeResponse(200, {"ok": True, "profile": {}})
    )

    def raise_readonly(self, missing_ok=False):
        raise PermissionError("Read-only file system")

    monkeypatch.setattr(type(video), "unlink", raise_readonly)
    result = get_processor("ANALYZE_VIDEO")(
        {"mediaPath": "videos/intro.webm", "deleteAfter": True}
    )
    assert result["ok"] is True
