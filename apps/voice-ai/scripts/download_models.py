"""
Téléchargement UNIQUE des modèles (internet nécessaire une seule fois). Ensuite tout fonctionne hors ligne.

    pip install huggingface_hub
    python scripts/download_models.py                 # Whisper small + LinTO derja
    python scripts/download_models.py --whisper medium
    python scripts/download_models.py --whisper large-v3-turbo   # si GPU

Les modèles du LLM et des embeddings se téléchargent avec Ollama :
    ollama pull qwen2.5:7b      (ou qwen3:4b pour une machine légère)
    ollama pull bge-m3
"""
from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

from huggingface_hub import hf_hub_download, snapshot_download

MODELS = Path(__file__).resolve().parent.parent / "models"
WHISPER_REPOS = {
    "tiny": "Systran/faster-whisper-tiny", "base": "Systran/faster-whisper-base",
    "small": "Systran/faster-whisper-small", "medium": "Systran/faster-whisper-medium",
    "large-v3": "Systran/faster-whisper-large-v3",
    "large-v3-turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
}
LINTO_REPO = "linagora/linto-asr-ar-tn-0.1"


def download_whisper(size: str) -> Path:
    target = MODELS / f"faster-whisper-{size}"
    snapshot_download(WHISPER_REPOS[size], local_dir=target)
    print(f"Whisper {size} → {target}")
    return target


def download_linto() -> Path:
    target = MODELS / "linto-asr-ar-tn"
    if (target / "am").is_dir():
        print(f"LinTO déjà présent → {target}")
        return target
    zip_path = Path(hf_hub_download(LINTO_REPO, "vosk-model.zip", local_dir=MODELS / "_downloads"))
    tmp = MODELS / "_linto_unzip"
    shutil.rmtree(tmp, ignore_errors=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(tmp)
    # Le dossier du modèle Vosk est celui qui contient « am/ » (structure Kaldi).
    root = next((p.parent for p in tmp.rglob("am") if p.is_dir()), None)
    if root is None:
        raise SystemExit("Structure inattendue dans vosk-model.zip : dossier « am » introuvable.")
    shutil.rmtree(target, ignore_errors=True)
    shutil.move(str(root), target)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"LinTO ASR ar-tn (derja) → {target}")
    return target


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--whisper", default="small", choices=list(WHISPER_REPOS))
    ap.add_argument("--skip-linto", action="store_true")
    args = ap.parse_args()
    MODELS.mkdir(exist_ok=True)
    download_whisper(args.whisper)
    if not args.skip_linto:
        download_linto()
    print("\nÉtape suivante : ollama pull qwen2.5:7b && ollama pull bge-m3")


if __name__ == "__main__":
    main()
