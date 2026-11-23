"""Moteur de matching Matchy+ v2.1.0 — portage serveur de AIMatchingEngine.ts (11 nov. 2026).

Même logique que le fichier du chef (6 dimensions, Jaccard + softMatch, matrice objectifs × catégorie, apprentissage par
catégorie et par tag, textes FR / EN / AR), avec les corrections demandées par
« MatchyPlus_Documentation_Fonctionnelle_Technique_Moteur_IA_v2 » :
  P0  calcul côté serveur ; score 0..99 (plus de plancher à 40) ; « données insuffisantes » ; formule qualité corrigée
  P1  pas de jitter dans le score (départage stable à part) ; le comportement ne touche pas la proximité ;
      pas de bonus « disponible » dans la qualité ; boost de tags = moyenne (pas le maximum)
  P2  poids, seuils et matrice dans data/engine_config.json (versionné) ; engineVersion dans chaque résultat
Chaque dimension est une fonction pure : mêmes entrées → même sortie, sans accès au stockage.
"""
from __future__ import annotations

import json
import math
import unicodedata
from functools import lru_cache

from .config import settings


@lru_cache(maxsize=1)
def config() -> dict:
    cfg = json.loads((settings.data_dir / "engine_config.json").read_text(encoding="utf-8"))
    total = round(sum(cfg["weights"].values()), 6)
    if total != 1.0:                                              # DEV-10 : la somme des poids doit faire 1,00
        raise ValueError(f"engine_config.json : la somme des poids vaut {total}, pas 1,00")
    return cfg


def version() -> str:
    return config()["engineVersion"]


# --- Normalisation (doc v2 §8 : normalizers) -----------------------------------------------------------------------
def norm(s: str) -> str:
    """Minuscules, sans accents latins (« développement » = « developpement », DEV-13), arabe simplifié."""
    s = unicodedata.normalize("NFKD", str(s or "").lower())
    s = "".join(c for c in s if not (unicodedata.combining(c) and "̀" <= c <= "ͯ"))
    s = unicodedata.normalize("NFKC", s)
    for a, b in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ة", "ه"), ("ى", "ي")):
        s = s.replace(a, b)
    return " ".join(s.replace("_", " ").replace("-", " ").split())


@lru_cache(maxsize=1)
def _lang_index() -> dict[str, str]:
    return {norm(v): code for code, variants in config()["languages"].items() for v in variants}


def normalize_lang(lang: str) -> str:
    """« Français », « french », « الفرنسية » → « fr ». Langue inconnue : libellé normalisé (doc fonctionnel §10)."""
    n = norm(lang)
    return _lang_index().get(n, n)


@lru_cache(maxsize=1)
def _day_index() -> dict[str, str]:
    return {norm(v): code for code, variants in config()["days"].items() for v in variants}


def normalize_days(days: list[str]) -> set[str]:
    return {_day_index().get(norm(d), norm(d)) for d in days or []}


# --- Outils de AIMatchingEngine.ts ---------------------------------------------------------------------------------
def jaccard_sim(a: list[str], b: list[str]) -> float:
    """Part de mots en commun (DEV-01 : deux listes vides → 0, jamais NaN)."""
    sa, sb = {norm(x) for x in a if x}, {norm(x) for x in b if x}
    union = len(sa | sb)
    return len(sa & sb) / union if union else 0.0


def soft_match(source: list[str], target: str) -> float:
    """1 si égal, 0,7 si l'un contient l'autre, 0,4 si les 4 premières lettres se retrouvent (comme le .ts)."""
    t, best = norm(target), 0.0
    for s in source:
        sl = norm(s)
        if not sl or not t:
            continue
        if sl == t:
            return 1.0
        if sl in t or t in sl:
            best = max(best, 0.7)
        if len(sl) > 3 and len(t) > 3 and (t[:4] in sl or sl[:4] in t):
            best = max(best, 0.4)
    return best


# --- Textes (FR / EN / AR) -----------------------------------------------------------------------------------------
LABELS = {
    "interests": ("Compétences & intérêts", "Skills & interests", "المهارات والاهتمامات", "🎯"),
    "geo": ("Proximité géographique", "Geographic proximity", "القرب الجغرافي", "📍"),
    "goals": ("Alignement des objectifs", "Goal alignment", "توافق الأهداف", "🚀"),
    "availability": ("Disponibilité commune", "Shared availability", "التوفر المشترك", "⏰"),
    "language": ("Langues communes", "Common languages", "اللغات المشتركة", "🌐"),
    "quality": ("Qualité du profil", "Profile quality", "جودة الملف", "⭐"),
}
LANG_NAMES = {"ar": ("arabe", "Arabic", "العربية"), "fr": ("français", "French", "الفرنسية"), "en": ("anglais", "English", "الإنجليزية"),
              "ar-dialect": ("derja", "Derja", "الدارجة"), "de": ("allemand", "German", "الألمانية"), "es": ("espagnol", "Spanish", "الإسبانية")}


def _km(x: float) -> str:
    return f"{x:.1f}".rstrip("0").rstrip(".")


def _reason(key: str, score: float, ctx: dict) -> tuple[str, str, str]:
    """Raison d'une dimension, dans les 3 langues (même sens que les phrases du .ts)."""
    if key == "interests":
        tags = ", ".join(ctx.get("tags_fr", [])[:2]) or ctx.get("role_fr", "")
        cat = ctx.get("category_fr", "")
        if score >= 60:
            return (f"Compétences très alignées avec votre besoin ({tags})", f"Skills highly aligned with your need ({ctx.get('tags_en_txt') or tags})",
                    f"مهارات متوافقة جداً مع طلبك ({ctx.get('tags_ar_txt') or tags})")
        if score >= 30:
            return (f"Domaine partiellement compatible ({cat})", f"Partially compatible domain ({ctx.get('category_en', cat)})",
                    f"مجال متوافق جزئياً ({ctx.get('category_ar', cat)})")
        return ("Peu de recoupements détectés", "Few overlaps detected", "عدد قليل من التقاطعات")
    if key == "geo":
        km = ctx.get("km")
        if km is None:
            return ("Localisation inconnue — proximité neutralisée", "Location unknown — proximity not used", "الموقع غير معروف — لم تُحتسب المسافة")
        d, dc = _km(km), _km(km).replace(".", ",")          # « 1,5 km » en français et en arabe
        if km < 2:
            return (f"À {dc} km — très proche", f"{d} km away — very close", f"على بُعد {dc} كم — قريب جداً")
        if km < 5:
            return (f"À {dc} km — dans votre zone", f"{d} km — in your zone", f"{dc} كم — في منطقتك")
        return (f"À {dc} km", f"{d} km away", f"على بُعد {dc} كم")
    if key == "goals":
        if ctx.get("goals_neutral"):
            return ("Objectifs sans règle pour ce secteur — score neutre", "No goal rule for this sector — neutral score", "لا توجد قاعدة أهداف لهذا القطاع — نتيجة محايدة")
        if score >= 70:
            return ("Objectifs très compatibles", "Goals very compatible", "الأهداف متوافقة جداً")
        if score >= 40:
            return ("Objectifs partiellement alignés", "Goals partially aligned", "الأهداف متوافقة جزئياً")
        return ("Alignement faible des objectifs", "Low goal alignment", "توافق ضعيف للأهداف")
    if key == "availability":
        if score >= 70:
            return ("Disponibilités bien alignées", "Availability well aligned", "التوفر متوافق بشكل جيد")
        if score >= 40:
            return ("Quelques créneaux en commun", "Some shared time slots", "بعض الأوقات المشتركة")
        return ("Peu de créneaux communs", "Few common slots", "أوقات مشتركة قليلة")
    if key == "language":
        shared = ctx.get("shared_langs") or []
        if shared:
            n = LANG_NAMES.get(shared[0], (shared[0],) * 3)
            return (f"Vous parlez tous les deux {n[0]}", f"Both speak {n[1]}", f"كلاكما يتحدث {n[2]}")
        return ("Langues à vérifier", "Languages to check", "اللغات للتحقق")
    # quality
    r, n, av = ctx.get("rating", 0), ctx.get("reviews", 0), ctx.get("available", True)
    if not n:
        return ("Nouveau profil — pas encore d'avis", "New profile — no reviews yet", "ملف جديد — لا توجد تقييمات بعد")
    rs = f"{r:.1f}".rstrip("0").rstrip(".")
    rc = rs.replace(".", ",")
    return (f"Note {rc}/5 · {n} avis" + (" · Disponible" if av else ""), f"Rating {rs}/5 · {n} reviews" + (" · Available" if av else ""),
            f"تقييم {rc}/5 · {n} تقييم" + (" · متاح" if av else ""))


# --- Les 6 dimensions (fonctions pures, 0..100) --------------------------------------------------------------------
def dim_interests(user_kw: list[str], profile_kw: list[str], tag_ids: list[str], tag_weights: dict[str, float]) -> float:
    """28 % : Jaccard 50 % + softMatch 50 %, × moyenne des poids des tags appris (doc v2 P1 : moyenne, pas maximum)."""
    if not user_kw or not profile_kw:
        return 0.0
    soft = sum(soft_match(profile_kw, k) for k in user_kw) / len(user_kw)
    raw = (jaccard_sim(user_kw, profile_kw) * 0.5 + soft * 0.5) * 100
    learned = [tag_weights[t] for t in tag_ids if t in tag_weights]
    boost = sum(learned) / len(learned) if learned else 1.0
    return min(100.0, raw * boost)


def dim_geo(km: float | None, radius_km: float) -> float | None:
    """22 % : (1 − d/rayon)^1,6 × 100 ; hors rayon → 0 ; distance inconnue → None (dimension neutralisée, AC-10)."""
    if km is None or not radius_km:
        return None
    return max(0.0, min(100.0, max(0.0, 1 - km / radius_km) ** config()["geoExponent"] * 100))


def dim_goals(user_goals: list[str], category: str | None) -> tuple[float, bool]:
    """18 % : matrice objectif × catégorie (secteur). Pas d'objectif ou pas de règle → 50, neutre."""
    matrix = config()["goalMatrix"].get(str(category or ""), {})
    if not user_goals or not matrix:
        return float(config()["neutral"]["goals"]), True
    return min(100.0, sum(matrix.get(g, 0.0) for g in user_goals) / len(user_goals) * 100), False


def dim_availability(user_days: list[str], user_slots: list[str], prof_days: list[str], prof_slots: list[str]) -> float:
    """12 % : 60 % jours en commun + 40 % horaires (créneaux structurés, comme le recommande le doc fonctionnel)."""
    u, p = normalize_days(user_days), normalize_days(prof_days)
    days = len(u & p) / max(len(u), len(p)) if u and p else config()["neutral"]["availabilityDays"]
    if not user_slots:
        hours = config()["neutral"]["availabilityHours"]
    else:
        common = set(user_slots) & set(prof_slots or [])
        hours = 1.0 if common == set(user_slots) else 0.7 if common else 0.4
    return min(100.0, (days * 0.6 + hours * 0.4) * 100)


def dim_language(user_langs: list[str], prof_langs: list[str]) -> tuple[float, list[str]]:
    """10 % : au moins une langue commune → 40 + Jaccard × 60 ; aucune → Jaccard × 40 ; non renseigné → 60."""
    u = [normalize_lang(x) for x in user_langs or []]
    p = [normalize_lang(x) for x in (prof_langs or ["ar", "fr"])]
    if not u:
        return float(config()["neutral"]["language"]), []
    shared = [x for x in u if x in p]
    sim = jaccard_sim(u, p)
    return min(100.0, 40 + sim * 60 if shared else sim * 40), shared


def dim_quality(rating: float, reviews: int) -> float:
    """10 % — formule CORRIGÉE (doc v2 P0, à valider par le chef) :
    70 % note bayésienne (prior 4/5 sur 5 avis fictifs) + 30 % volume d'avis logarithmique (200 avis = 100).
    Sans avis → 50 neutre (« nouveau profil »). Pas de bonus « disponible » (déjà compté à 12 %)."""
    if not reviews:
        return float(config()["neutral"]["quality"])
    bayes = (4.0 * 5 + rating * reviews) / (5 + reviews)
    volume = min(1.0, math.log10(1 + reviews) / math.log10(201))
    return min(100.0, max(0.0, (bayes / 5) * 100 * 0.7 + volume * 100 * 0.3))


# --- Score complet ---------------------------------------------------------------------------------------------------
def confidence(total: float) -> str:
    c = config()["confidence"]
    return "high" if total >= c["high"] else "medium" if total >= c["medium"] else "low"


def sanitize_weights(weights, log: list | None = None) -> dict:
    """Poids reçus (client, base, ancienne version) : seuls les invalides reviennent à 1,0 (doc fonctionnel §10,
    DEV-05) ; les valides sont gardés, bornés à 0,3..2,0. Rien ne lève d'exception (JSON malformé, None, texte, NaN)."""
    b = config()["behavior"]
    out: dict = {}
    if not isinstance(weights, dict):
        if weights not in (None, {}) and log is not None:
            log.append("weights:not_a_dict")
        return out
    for k, v in weights.items():
        try:
            w = float(v)
            if w != w or w in (float("inf"), float("-inf")):
                raise ValueError
        except (TypeError, ValueError):
            if log is not None:
                log.append(f"weight_invalid:{k}")
            out[str(k)] = 1.0
            continue
        out[str(k)] = min(b["max"], max(b["min"], w))
    return out


def compute_full_match_score(profile: dict, user: dict, prefs: dict | None = None) -> dict:
    """profile : id, tags (ids), keywords (libellés), role, category (secteur), km, days, slots, languages, rating, reviews, available
    user    : keywords (libellés), goals, radiusKm, days, slots, languages
    prefs   : categoryWeights {secteur: poids}, tagWeights {tag: poids} (agent comportement)"""
    prefs = prefs or {}
    w = config()["weights"]
    dims: dict[str, float] = {}
    prefs = {"categoryWeights": sanitize_weights((prefs or {}).get("categoryWeights")),
             "tagWeights": sanitize_weights((prefs or {}).get("tagWeights"))}
    dims["interests"] = dim_interests(user.get("keywords", []), profile.get("keywords", []), profile.get("tags", []), prefs.get("tagWeights", {}))
    geo = dim_geo(profile.get("km"), user.get("radiusKm") or config()["defaultRadiusKm"])
    dims["geo"] = geo if geo is not None else 0.0
    dims["goals"], goals_neutral = dim_goals(user.get("goals", []), profile.get("category"))
    dims["availability"] = dim_availability(user.get("days", []), user.get("slots", []), profile.get("days", []), profile.get("slots", []))
    dims["language"], shared = dim_language(user.get("languages", []), profile.get("languages", []))
    dims["quality"] = dim_quality(profile.get("rating", 0.0), profile.get("reviews", 0))

    # Distance inconnue : on retire la proximité et on répartit son poids sur les autres (AC-10, pas de NaN).
    weights = dict(w) if geo is not None else {k: v / (1 - w["geo"]) for k, v in w.items() if k != "geo"}
    raw = sum(dims[k] * weights[k] for k in weights)
    cat = str(profile.get("category") or "")
    b = config()["behavior"]
    mult = min(b["multiplierMax"], max(b["multiplierMin"], prefs.get("categoryWeights", {}).get(cat, 1.0)))
    insufficient = not profile.get("keywords") and not profile.get("role")
    total = 0 if insufficient else int(min(99, max(0, round(raw * mult))))       # 0..99, plus de plancher à 40

    ctx = {"km": profile.get("km"), "rating": profile.get("rating", 0), "reviews": profile.get("reviews", 0),
           "available": profile.get("available", True), "shared_langs": shared, "goals_neutral": goals_neutral,
           "tags_fr": profile.get("tagLabels", {}).get("fr", []), "tags_en_txt": ", ".join(profile.get("tagLabels", {}).get("en", [])[:2]),
           "tags_ar_txt": "، ".join(profile.get("tagLabels", {}).get("ar", [])[:2]), "role_fr": profile.get("role", ""),
           "category_fr": profile.get("categoryLabels", {}).get("fr", ""), "category_en": profile.get("categoryLabels", {}).get("en", ""),
           "category_ar": profile.get("categoryLabels", {}).get("ar", "")}
    dimensions = []
    for key in ("interests", "geo", "goals", "availability", "language", "quality"):
        fr, en, ar, icon = LABELS[key]
        rfr, ren, rar = _reason(key, dims[key], ctx)
        dimensions.append({"key": key, "label": fr, "labelEn": en, "labelAr": ar, "score": round(dims[key], 1),
                           "weight": w[key], "icon": icon, "reason": rfr, "reasonEn": ren, "reasonAr": rar,
                           "contribution": round(dims[key] * weights.get(key, 0.0), 2), "neutralized": key == "geo" and geo is None})
    top = sorted(dimensions, key=lambda d: -d["contribution"])[:3]
    if insufficient:
        hl = [("Données insuffisantes pour évaluer ce profil", "Not enough data to rate this profile", "بيانات غير كافية لتقييم هذا الملف")]
    else:
        hl = [(f"{d['icon']} {d['reason']}", f"{d['icon']} {d['reasonEn']}", f"{d['icon']} {d['reasonAr']}") for d in top]
    return {
        "profileId": profile.get("id"), "totalScore": total, "baseScore": round(raw, 1), "behaviorMultiplier": round(mult, 3),
        "confidence": "low" if insufficient else confidence(total), "insufficientData": insufficient,
        "dimensions": dimensions,
        "highlights": [h[0] for h in hl], "highlightsEn": [h[1] for h in hl], "highlightsAr": [h[2] for h in hl],
        "rankPosition": 0, "engineVersion": version(),
    }


def visibility_boost(profile: dict) -> float:
    """Boost de visibilité (doc §9) : formule (×1 / ×2 / ×5) × vidéo de présentation (×3, réunion du 13 nov.).
    Il décide seulement qui passe dans la place « Sponsorisé » ; le score de pertinence n'est jamais touché."""
    return float(profile.get("boost") or 1) * (float(config().get("videoBoost", 1)) if profile.get("hasVideo") else 1.0)


def tie_break_key(profile: dict, result: dict) -> tuple:
    """Départage stable (doc fonctionnel §7.2) : disponibilité, note, nombre d'avis, puis identifiant — jamais de jitter."""
    return (-result["totalScore"], -int(bool(profile.get("available", True))), -float(profile.get("rating", 0) or 0),
            -int(profile.get("reviews", 0) or 0), str(profile.get("id")))


def rank_profiles(profiles: list[dict], user: dict, prefs: dict | None = None, exclude_ids: list | None = None) -> list[dict]:
    """Comme rankProfiles du .ts : exclut (DEV-06 : aucun calcul pour un exclu), note, trie, donne le rang."""
    ex = set(exclude_ids or [])
    scored = [(p, compute_full_match_score(p, user, prefs)) for p in profiles if p.get("id") not in ex]
    scored.sort(key=lambda pr: tie_break_key(*pr))
    for i, (_, r) in enumerate(scored, 1):
        r["rankPosition"] = i
    return [r for _, r in scored]
