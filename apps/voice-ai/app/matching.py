"""Matching local top 5 : filtres durs → score déterministe sur 100 → diversité → explication localisée."""
from __future__ import annotations

import json
import logging
import math
import re
from functools import lru_cache

from . import lexicon as lx
from . import llm
from .config import settings
from .taxonomy import label, load as load_taxonomy, norm

log = logging.getLogger(__name__)

WEIGHTS = {"service": 25, "distance": 22, "availability": 15, "quality": 15, "trust": 10, "languages": 8, "price": 5}

DAYS, SLOTS, LANGS, DAY_LABEL = lx.DAYS, lx.SLOTS, lx.LANGS, lx.DAY_LABEL


def _codes(text: str | None, table: dict[str, list[str]]) -> list[str]:
    t = norm(text)
    return [code for code, words in table.items() if any(norm(w) and norm(w) in t for w in words)]


@lru_cache(maxsize=1)
def providers() -> list[dict]:
    return json.loads((settings.data_dir / "providers.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def places() -> list[dict]:
    return json.loads((settings.data_dir / "places.json").read_text(encoding="utf-8"))


def geocode(city: str | None) -> dict | None:
    """Géocodage hors ligne sur une liste de villes et quartiers (places.json)."""
    t = norm(city)
    if not t:
        return None
    best = None
    for p in places():
        for name in p["names"]:
            n = norm(name)
            if n and (n == t or n in t.split() or (len(n) > 4 and n in t)):
                if best is None or len(n) > best[0]:
                    best = (len(n), p)
    return best[1] if best else None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = math.radians
    a = math.sin(r(lat2 - lat1) / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def bayes_rating(avg: float, n: int, prior: float = 4.0, c: int = 5) -> float:
    return (prior * c + avg * n) / (c + n)


def _embeddings_for_providers() -> dict[str, list[float]] | None:
    cache = settings.data_dir / "providers.embeddings.json"
    if cache.exists():
        return json.loads(cache.read_text())
    try:
        vecs = llm.embed([p["bio_fr"] + " " + p.get("bio_ar", "") for p in providers()])
    except llm.LlmError:
        return None
    data = {p["id"]: v for p, v in zip(providers(), vecs)}
    cache.write_text(json.dumps(data))
    return data


def _cos(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def score(p: dict, need: dict, km: float, radius: float, sim: float | None) -> tuple[float, dict]:
    main = next(s for s in p["services"] if s["serviceId"] == need["serviceId"])
    days, slots, langs = need["days"], need["slots"], need["languages"]
    s = {
        "service": (1.0 if main["primary"] else 0.8) * (0.85 + 0.15 * sim if sim is not None else 1.0),
        "distance": max(0.0, 1 - km / radius) ** 1.6,
        "availability": (
            (len(set(days) & set(p["days"])) / len(days) if days else 1.0) * 0.7
            + (len(set(slots) & set(p["slots"])) / len(slots) if slots else 1.0) * 0.3
        ) * (1.0 if p["available"] else 0.5),
        "quality": bayes_rating(p["rating"], p["reviews"]) / 5,
        "trust": (p["phoneVerified"] + p["hasVideo"] + p["profileComplete"]) / 3,
        "languages": 1.0 if not langs or set(langs) & set(p["languages"]) else 0.0,
        "price": 1.0 if not need["budget"] or p["price"] <= need["budget"] else 0.3,
    }
    return round(sum(WEIGHTS[k] * v for k, v in s.items()), 1), s


def explain(p: dict, km: float, need: dict, ui: str) -> str:
    """Explication déterministe, dans la langue de la page (pas de LLM : rapide, hors ligne, sans invention)."""
    ui = ui if ui in ("fr", "ar", "en") else "fr"
    dec = "," if ui != "en" else "."
    dist = f"{km:.1f}".replace(".", dec)
    rating = f"{p['rating']:.1f}".replace(".", dec)
    day = next((d for d in need.get("days", []) if d in p["days"]), None)
    if ui == "ar":
        rev = f"{rating}/5 ({p['reviews']} تقييم)" if p["reviews"] else "جديد، بدون تقييم بعد"
        parts = [f"على بعد {dist} كم", f"متوفر يوم {DAY_LABEL['ar'][day]}" if day else None, rev, f"{p['price']} د.ت/س"]
    elif ui == "en":
        rev = f"{rating}/5 ({p['reviews']} reviews)" if p["reviews"] else "new, no reviews yet"
        parts = [f"{dist} km away", f"available on {DAY_LABEL['en'][day]}" if day else None, rev, f"{p['price']} TND/h"]
    else:
        rev = f"{rating}/5 ({p['reviews']} avis)" if p["reviews"] else "nouveau, pas encore d'avis"
        parts = [f"à {dist} km", f"disponible le {DAY_LABEL['fr'][day]}" if day else None, rev, f"{p['price']} DT/h"]
    return " · ".join(x for x in parts if x)


def build_need(need_fields: dict, lat: float | None, lng: float | None) -> dict:
    """Transforme la demande extraite (valeurs textuelles) en critères de recherche."""
    service = need_fields.get("service") or {}
    city = (need_fields.get("city") or {}).get("value")
    place = geocode(city)
    if lat is None or lng is None:
        lat, lng = (place["lat"], place["lng"]) if place else (None, None)
    budget_txt = (need_fields.get("budget") or {}).get("value") or ""
    budget = re.search(r"\d+(?:[.,]\d+)?", budget_txt)
    return {
        "serviceId": service.get("value"),
        "lat": lat, "lng": lng, "place": place["names"][0] if place else city,
        "days": _codes((need_fields.get("day") or {}).get("value"), DAYS),
        "slots": _codes((need_fields.get("time_slot") or {}).get("value"), SLOTS),
        "languages": _codes((need_fields.get("languages") or {}).get("value"), LANGS),
        "budget": float(budget.group().replace(",", ".")) if budget else None,
        "radiusKm": 10.0,
    }


def match(need: dict, ui: str = "fr", top_k: int = 5, query_text: str | None = None) -> dict:
    if not need.get("serviceId"):
        return {"ok": False, "error": "SERVICE_NOT_UNDERSTOOD", "results": []}
    if need.get("lat") is None:
        return {"ok": False, "error": "LOCATION_REQUIRED", "results": []}

    def candidates(radius: float) -> list[tuple[dict, float]]:
        out = []
        for p in providers():
            if p.get("banned") or not any(s["serviceId"] == need["serviceId"] for s in p["services"]):
                continue
            km = haversine_km(need["lat"], need["lng"], p["lat"], p["lng"])
            if km <= radius:
                out.append((p, km))
        return out

    radius, widened = need["radiusKm"], False
    cands = candidates(radius)
    if len(cands) < top_k:
        radius, widened = radius * 2, True
        cands = candidates(radius)

    sims: dict[str, float] = {}
    if query_text:
        vecs = _embeddings_for_providers()
        if vecs:
            try:
                q = llm.embed([query_text])[0]
                sims = {pid: _cos(q, v) for pid, v in vecs.items()}
            except llm.LlmError:
                sims = {}

    scored = []
    for p, km in cands:
        total, detail = score(p, need, km, radius, sims.get(p["id"]))
        scored.append({"provider": p, "km": km, "score": total, "detail": detail})
    scored.sort(key=lambda r: (-r["score"], r["km"]))       # égalité → le plus proche

    # Diversité : 4 meilleurs + le meilleur « nouveau » prestataire (moins de 5 avis) s'il n'y est pas déjà.
    top = scored[: top_k - 1]
    newcomer = next((r for r in scored[top_k - 1:] if r["provider"]["reviews"] < 5 and r["score"] >= 50), None)
    top.append(newcomer or (scored[top_k - 1] if len(scored) >= top_k else None))
    top = [r for r in top if r]

    results = []
    for rank, r in enumerate(top, 1):
        p = r["provider"]
        results.append({
            "rank": rank, "id": p["id"], "name": p["name_ar"] if ui == "ar" else p["name"],
            "service": label(need["serviceId"], ui), "score": r["score"], "km": round(r["km"], 1),
            "newcomer": r is newcomer, "explanation": explain(p, r["km"], need, ui),
            "detail": {k: round(v, 2) for k, v in r["detail"].items()},
        })
    return {"ok": True, "need": need, "radiusKm": radius, "widened": widened,
            "candidates": len(scored), "results": results}


def service_catalog(ui: str) -> dict:
    t = load_taxonomy()
    return {"sectors": [{"id": s["id"], "label": s.get(ui) or s["fr"]} for s in t["sectors"]],
            "services": [{"id": s["id"], "sector": s["sector"], "label": s.get(ui) or s["fr"]} for s in t["services"]]}
