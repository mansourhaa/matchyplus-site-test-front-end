"""Agents Matchy+ de la démo 2.0.8, branchés sur les profils et les swipes de l'application.

Mêmes agents et mêmes règles que la 2.0.8 ; seule la source des données change. Dans la démo, les profils venaient
de providers.json et les swipes d'une base SQLite ; ici, l'API envoie à chaque appel le profil de la personne, les
candidats déjà filtrés (Postgres) et son historique de swipes. Le service ne garde donc rien (sans état).

Le chef d'orchestre enchaîne les agents, comme orchestrator.feed de la 2.0.8 :

    classification  le métier (catalogue de 79 métiers) et le secteur (10 secteurs du chef) de chaque profil
    comportement    les poids appris des swipes : like → catégorie +0,12, tags +0,05 ; pass → −0,06, −0,02
                    (bornés 0,3..2,0 ; le poids de la catégorie multiplie le score, borné 0,6..1,4)
    matching        le score sur 100 du moteur du chef (engine.py, AIMatchingEngine.ts) : 28 % compétences,
                    22 % proximité, 18 % objectifs, 12 % disponibilité, 10 % langues, 10 % qualité
    boost           vidéo de présentation ×3, multiplié par celui de la formule (Free ×1, Premium ×2, Premium+ ×5) :
                    il choisit la place « mise en avant », sans toucher au score de pertinence

Likes, matchs, messages, blocages et quotas restent ceux de l'application (pas d'agent « social » ici).
"""
from __future__ import annotations

import logging
import time
from functools import lru_cache

from . import classify, engine
from .taxonomy import label, lexical_candidates, load as load_taxonomy, sector_label

# Valeurs du formulaire de l'application → codes du moteur.
INDUSTRY_SECTOR = {
    "commerce_retail": "1", "professional_services": "2", "tech_digital": "3", "finance_insurance": "4",
    "industry_production": "5", "agriculture_food": "6", "health_wellness": "7", "education_training": "8",
    "transport_logistics": "9", "local_services_trades": "10",
}
GOAL_CODES = {
    "Recruter quelqu'un": "HIRE_TALENT", "Trouver un job": "FIND_JOB", "Proposer mes services": "OFFER_MY_SERVICES",
    "Travailler comme prestataire": "WORK_PROVIDER", "Demander un service": "REQUEST_SERVICE",
    "Trouver un prestataire": "FIND_PRO", "Rencontrer des personnes près de moi": "MEET_NEARBY",
    "Trouver des missions": "FIND_TASKS", "Découvrir des idées et opportunités": "DISCOVER_OPPORTUNITIES",
    "Service à domicile": "HOME_SERVICE",
}
DAY_CODES = {"Lun": "mon", "Mar": "tue", "Mer": "wed", "Jeu": "thu", "Ven": "fri", "Sam": "sat", "Dim": "sun"}
PLAN_KEYS = {"FREE": "free", "PREMIUM": "premium", "PREMIUM_PLUS": "premium_plus"}

log = logging.getLogger("matchy.agents")


class Trace:
    """« orchestration.steps » de la 2.0.8 : quel agent a travaillé, pour quoi, en combien de millisecondes."""

    def __init__(self) -> None:
        self.steps: list[dict] = []

    def add(self, agent: str, role: str, t0: float, **info) -> None:
        self.steps.append({"agent": agent, "role": role, "ms": round((time.perf_counter() - t0) * 1000, 1), **info})

    def out(self) -> dict:
        return {"steps": self.steps, "agents": list(dict.fromkeys(s["agent"] for s in self.steps))}


# ------------------------------------------------------------------------------------------------ classification
@lru_cache(maxsize=2048)
def _classify_text(job: str, service_type: str, interests: str, bio: str) -> tuple[str | None, tuple[str, ...], str | None]:
    """(métier du catalogue, concepts du dictionnaire du chef, secteur) d'après ce que le profil a écrit."""
    service = None
    for text in (job, service_type):
        cands = lexical_candidates(text) if text else []
        if cands:
            service = cands[0][0]
            break
    cls = classify.classify({"main_job_service": job or service_type, "service_type": service_type,
                             "interests_services": interests, "about": bio}, "fr", use_model=False)
    concepts = tuple(c["concept_id"] for c in cls.get("concepts", []))[:8]
    sector = cls.get("sector_id") if cls.get("status") in ("fill", "suggest") else None
    return service, concepts, (str(sector) if sector else None)


def classify_profile(p: dict) -> dict:
    """Classification d'un profil de l'application : métier, tags (métier + concepts) et secteur."""
    service, concepts, guessed = _classify_text(str(p.get("job") or ""), str(p.get("service_type") or ""),
                                                ", ".join(p.get("interests") or []), str(p.get("bio") or "")[:300])
    by_id = load_taxonomy()["by_id"]
    sector = INDUSTRY_SECTOR.get(str(p.get("industry") or "")) or (
        str(by_id[service]["sector"]) if service in by_id else None) or guessed
    tags = sorted(({service} if service else set()) | set(concepts) | set(by_id.get(service, {}).get("concepts", [])))
    return {"service": service, "tags": tags, "sector": sector}


def _labels(ids: list[str]) -> dict[str, list[str]]:
    cdata = classify.data()["concepts"]
    by_id = load_taxonomy()["by_id"]
    out: dict[str, list[str]] = {"fr": [], "en": [], "ar": []}
    for i in ids:
        for lang in out:
            text = label(i, lang) if i in by_id else cdata.get(i, {}).get("labels", {}).get(lang, "")
            if text and text.casefold() not in {x.casefold() for x in out[lang]}:
                out[lang].append(text)
    return out


# ------------------------------------------------------------------------------------------------ comportement
def learn(swipes: list[dict]) -> dict:
    """Poids appris, rejoués du plus ancien au plus récent (mêmes règles que behavior.swipe de la 2.0.8)."""
    b = engine.config()["behavior"]
    cats: dict[str, float] = {}
    tags: dict[str, float] = {}

    def bump(table: dict, key: str, delta: float) -> None:
        table[key] = round(min(b["max"], max(b["min"], table.get(key, 1.0) + delta)), 4)

    for s in sorted(swipes or [], key=lambda x: str(x.get("at") or "")):
        like = s.get("direction") == "like"
        c = classify_profile(s.get("profile") or {})
        if c["sector"]:
            bump(cats, c["sector"], b["categoryLike"] if like else b["categoryPass"])
        for t in c["tags"]:
            bump(tags, t, b["tagLike"] if like else b["tagPass"])
    return {"categoryWeights": cats, "tagWeights": tags, "interactionCount": len(swipes or []),
            "personalized": len(swipes or []) >= b["personalizedAfter"]}


# ------------------------------------------------------------------------------------------------ matching
def _days(values: list[str] | None) -> list[str]:
    return [DAY_CODES.get(v, v) for v in values or []]


def _goals(values: list[str] | None) -> list[str]:
    return [GOAL_CODES[v] for v in values or [] if v in GOAL_CODES]


def _user_view(me: dict, c: dict, radius_km: float) -> dict:
    labels = _labels(c["tags"])
    cat = [sector_label(c["sector"], lang) for lang in ("fr", "en", "ar")] if c["sector"] else []
    keywords = list(dict.fromkeys(labels["fr"] + labels["en"] + labels["ar"] + cat + list(me.get("interests") or [])))
    return {"keywords": keywords, "goals": _goals(me.get("selected_goals")), "radiusKm": radius_km,
            "days": _days(me.get("availability_days")), "slots": list(me.get("availability_hours") or []),
            "languages": list(me.get("languages") or [])}


def _profile_view(p: dict, c: dict) -> dict:
    labels = _labels(c["tags"])
    cat = {lang: sector_label(c["sector"], lang) for lang in ("fr", "en", "ar")} if c["sector"] else {}
    keywords = list(dict.fromkeys(labels["fr"] + labels["en"] + labels["ar"] + list(cat.values())
                                  + list(p.get("interests") or [])))
    return {"id": p.get("id"), "tags": c["tags"], "keywords": keywords, "role": labels["fr"][0] if labels["fr"] else "",
            "category": c["sector"], "tagLabels": labels, "categoryLabels": cat, "km": p.get("distance_km"),
            "days": _days(p.get("availability_days")), "slots": list(p.get("availability_hours") or []),
            "languages": list(p.get("languages") or []), "rating": float(p.get("rating") or 0.0),
            "reviews": int(p.get("reviews") or 0), "available": True}


def _cached_prefs(prefs: dict | None) -> dict | None:
    """Poids déjà appris, renvoyés par l'API depuis son cache Redis (sinon None : on réapprend des swipes)."""
    if not isinstance(prefs, dict):
        return None
    cats = engine.sanitize_weights(prefs.get("categoryWeights"))
    tags = engine.sanitize_weights(prefs.get("tagWeights"))
    count = prefs.get("interactionCount")
    count = int(count) if isinstance(count, (int, float)) and count >= 0 else 0
    return {"categoryWeights": cats, "tagWeights": tags, "interactionCount": count,
            "personalized": count >= engine.config()["behavior"]["personalizedAfter"]}


def feed(me: dict, candidates: list[dict], swipes: list[dict], ui: str = "fr", radius_km: float | None = None,
         prefs: dict | None = None) -> dict:
    """Accueil : comportement (poids appris) → classification → matching (score du chef) → boost (place mise en avant).
    prefs : poids déjà appris (cache de l'API) ; absent → appris des swipes."""
    tr = Trace()
    t0 = time.perf_counter()
    cached = _cached_prefs(prefs)
    prefs = cached or learn(swipes)
    tr.add("comportement", "poids du cache" if cached else "poids appris des swipes", t0,
           interactions=prefs["interactionCount"])

    t0 = time.perf_counter()
    me_c = classify_profile(me)
    classified = [(p, classify_profile(p)) for p in candidates or []]
    tr.add("classification", "métier et secteur des profils", t0, profiles=len(classified))

    t0 = time.perf_counter()
    radius = radius_km or engine.config()["defaultRadiusKm"]
    user = _user_view(me, me_c, radius)
    lang = ui if ui in ("fr", "en", "ar") else "fr"
    suffix = {"fr": "", "en": "En", "ar": "Ar"}[lang]
    scored = []
    for p, c in classified:
        view = _profile_view(p, c)
        res = engine.compute_full_match_score(view, user, prefs)
        scored.append((p, view, res))
    scored.sort(key=lambda x: engine.tie_break_key(x[1], x[2]))
    tr.add("matching", "score sur 100 du moteur du chef", t0, results=len(scored))

    t0 = time.perf_counter()
    plans = engine.config()["plans"]
    results = []
    for p, view, res in scored:
        plan = plans.get(PLAN_KEYS.get(str(p.get("plan") or "FREE"), "free"), plans["free"])
        boost = engine.visibility_boost({"boost": plan.get("boost", 1), "hasVideo": bool(p.get("video"))})
        results.append({
            "id": p.get("id"), "score": res["totalScore"], "confidence": res["confidence"],
            "behaviorMultiplier": res["behaviorMultiplier"], "boost": boost, "sector": view["category"],
            "dimensions": [{"key": d["key"], "score": d["score"], "weight": d["weight"],
                            "contribution": d["contribution"], "reason": d["reason" + suffix]}
                           for d in res["dimensions"]],
            "highlights": res["highlights" + suffix],
        })
    boosted = [r for r in results if r["boost"] > 1]
    sponsored = max(boosted, key=lambda r: (r["boost"], r["score"]))["id"] if boosted else None
    tr.add("boost", "place mise en avant (vidéo ×3 × formule)", t0, sponsored=sponsored)

    _log_feed(candidates, results, sponsored, prefs)
    return {"ok": True, "engineVersion": engine.version(), "results": results, "sponsored": sponsored,
            "behavior": {k: prefs[k] for k in ("categoryWeights", "interactionCount", "personalized")},
            "prefs": prefs,
            "orchestration": tr.out()}


def _log_feed(candidates: list[dict], results: list[dict], sponsored: str | None, prefs: dict) -> None:
    """Une ligne par appel dans la console du service, pour voir le travail des agents sans outils :
    le classement, le score du moteur du chef, le poids appris (comportement) et le boost."""
    names = {p.get("id"): p.get("name") or p.get("id") for p in candidates or []}
    lines = [f"[agents] {len(results)} profil(s) · {prefs['interactionCount']} swipe(s) appris · "
             f"mise en avant (boost) : {names.get(sponsored, '—') if sponsored else '—'}"]
    for rank, r in enumerate(results[:10], start=1):
        lines.append(f"  #{rank} {names.get(r['id'], r['id'])} : score {r['score']} · "
                     f"comportement ×{r['behaviorMultiplier']} · boost ×{r['boost']}")
    log.info("\n".join(lines))
