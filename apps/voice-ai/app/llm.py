"""Client Ollama local : sorties JSON contraintes par schéma + embeddings. Aucun appel externe."""
from __future__ import annotations

import json
import logging
import re

import httpx

from .config import settings

log = logging.getLogger(__name__)


class LlmError(Exception):
    """Erreur passagère (Ollama arrêté, délai dépassé) : le client peut réessayer."""


def _options() -> dict:
    return {"temperature": 0, "num_ctx": 4096}


def chat_json(system: str, user: str, schema: dict) -> dict:
    body = {
        "model": settings.llm_model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "format": schema,          # Ollama contraint la génération au schéma JSON
        "stream": False,
        "options": _options(),
    }
    if settings.llm_model.startswith("qwen3"):
        body["think"] = False      # pas de raisonnement visible : plus rapide, JSON direct
    try:
        r = httpx.post(f"{settings.ollama_url}/api/chat", json=body, timeout=settings.llm_timeout)
        r.raise_for_status()
    except httpx.HTTPError as exc:
        raise LlmError(f"Ollama indisponible : {exc}") from exc
    content = r.json()["message"]["content"]
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.S).strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise LlmError(f"JSON invalide renvoyé par le modèle : {content[:200]}") from exc


def embed(texts: list[str]) -> list[list[float]]:
    try:
        r = httpx.post(f"{settings.ollama_url}/api/embed",
                       json={"model": settings.embed_model, "input": texts}, timeout=settings.llm_timeout)
        r.raise_for_status()
    except httpx.HTTPError as exc:
        raise LlmError(f"Ollama indisponible : {exc}") from exc
    return r.json()["embeddings"]


def health() -> dict:
    try:
        r = httpx.get(f"{settings.ollama_url}/api/tags", timeout=5)
        names = {m["name"] for m in r.json().get("models", [])}
        def has(m: str) -> bool:
            return m in names or f"{m}:latest" in names
        return {"ollama": True, "llm": has(settings.llm_model), "embed": has(settings.embed_model)}
    except Exception:  # noqa: BLE001
        return {"ollama": False, "llm": False, "embed": False}
