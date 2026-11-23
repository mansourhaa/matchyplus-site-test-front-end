"""Contrôles média avec ffprobe / ffmpeg (aucune dépendance réseau)."""
from __future__ import annotations

import os
import re
import subprocess

from .config import settings


class MediaError(Exception):
    """Erreur « métier » renvoyée telle quelle au client (pas de nouvel essai)."""

    def __init__(self, code: str, detail: str = ""):
        super().__init__(code)
        self.code = code
        self.detail = detail


def probe(path: str) -> dict:
    """Durée + présence d'une piste audio. Lève UNSUPPORTED_MEDIA si ffprobe ne lit pas le fichier.

    Les vidéos enregistrées par Chrome (MediaRecorder, .webm) n'ont PAS de durée dans leur en-tête :
    ffprobe répond « duration=N/A ». Ce n'est pas une erreur : la durée vaut alors None et on la mesure
    sur le WAV (voir prepare).
    """
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
         "-of", "default=noprint_wrappers=1", path],
        capture_output=True, text=True,
    )
    if res.returncode != 0:
        raise MediaError("UNSUPPORTED_MEDIA", res.stderr.strip()[:200])
    duration = re.search(r"duration=([\d.]+)", res.stdout)
    has_audio = "codec_type=audio" in res.stdout
    return {"duration": float(duration.group(1)) if duration else None, "has_audio": has_audio}


def to_wav(src: str, tmpdir: str) -> str:
    out = os.path.join(tmpdir, "audio.wav")
    res = subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", out],
        capture_output=True,
    )
    if res.returncode != 0:
        raise MediaError("UNSUPPORTED_MEDIA", "extraction audio impossible")
    return out


def speech_seconds(wav: str) -> float:
    """Durée totale moins les silences détectés par ffmpeg (détecteur simple, sans modèle)."""
    res = subprocess.run(
        ["ffmpeg", "-i", wav, "-af", f"silencedetect=noise={settings.silence_db}:d=0.4", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    silences = sum(float(x) for x in re.findall(r"silence_duration: ([\d.]+)", res.stderr))
    return max(0.0, (probe(wav)["duration"] or 0.0) - silences)


def prepare(path: str, tmpdir: str) -> tuple[str, float]:
    """Vérifie le média et renvoie (chemin du WAV 16 kHz mono, durée)."""
    info = probe(path)
    if not info["has_audio"]:
        raise MediaError("NO_SPEECH_DETECTED", "aucune piste audio")
    if info["duration"] is not None and info["duration"] > settings.max_seconds:
        raise MediaError("VIDEO_TOO_LONG", f"{info['duration']:.1f} s")
    wav = to_wav(path, tmpdir)
    duration = probe(wav)["duration"]                 # durée réelle, même pour un .webm de Chrome
    if duration is None:
        raise MediaError("UNSUPPORTED_MEDIA", "durée illisible")
    if duration > settings.max_seconds:
        raise MediaError("VIDEO_TOO_LONG", f"{duration:.1f} s")
    if speech_seconds(wav) < settings.min_speech_seconds:
        raise MediaError("NO_SPEECH_DETECTED", "moins d'une seconde de parole")
    return wav, duration
