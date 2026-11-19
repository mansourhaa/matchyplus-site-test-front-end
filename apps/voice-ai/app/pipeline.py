"""Pipeline complet : média → audio → transcription locale → règles (+ LLM si besoin) → référentiel → confiance."""
from __future__ import annotations

import hashlib
import logging
from collections import OrderedDict
import re
import tempfile
import time

from . import arabic_letters, names, asr, classify, extract, llm, rules, taxonomy
from . import lexicon as lx
from .config import settings
from .media import prepare

log = logging.getLogger(__name__)
KEY_FIELDS = ("first_name", "usage_type", "profession_spoken", "city")


_ASR_CACHE: "OrderedDict[str, tuple]" = OrderedDict()


def _transcribe(path: str):
    """Transcrit le média. La même voix (mêmes octets) n'est transcrite qu'une fois : quand on change le drapeau,
    l'interface renvoie le même enregistrement et le résultat revient tout de suite (seule l'extraction est refaite)."""
    key = hashlib.sha1(open(path, "rb").read()).hexdigest()
    if key in _ASR_CACHE:
        _ASR_CACHE.move_to_end(key)
        result, duration = _ASR_CACHE[key]
        return result, duration, 0.0
    with tempfile.TemporaryDirectory() as tmp:
        wav, duration = prepare(path, tmp)          # lève MediaError (VIDEO_TOO_LONG, NO_SPEECH_DETECTED…)
        t = time.time()
        result = asr.transcribe(wav)
    _ASR_CACHE[key] = (result, duration)
    while len(_ASR_CACHE) > settings.asr_cache_size:
        _ASR_CACHE.popitem(last=False)
    return result, duration, round(time.time() - t, 2)


def _has(raw: dict, f: str) -> bool:
    return bool(isinstance(raw.get(f), dict) and raw[f].get("value"))


def _merge(primary: dict, secondary: dict, p_name: str, s_name: str) -> tuple[dict, dict]:
    merged, sources = {}, {}
    for f in set(primary) | set(secondary):
        if _has(primary, f):
            merged[f], sources[f] = primary[f], p_name
        elif _has(secondary, f):
            merged[f], sources[f] = secondary[f], s_name
        else:
            merged[f] = {"value": None, "evidence": None}
    return merged, sources


def _rules_need_help(raw: dict, prof_key: str) -> bool:
    prof = raw.get(prof_key) or {}
    ambiguous_or_missing = not prof.get("value") or not prof.get("evidence")
    return ambiguous_or_missing or sum(_has(raw, f) for f in KEY_FIELDS if f in raw) < 3


def _combine(rules_raw: dict, llm_call, prof_key: str) -> tuple[dict, dict, dict]:
    """Applique LLM_MODE. Si Ollama est indisponible, on continue avec les règles seules."""
    mode, info = settings.llm_mode, {"llmMode": settings.llm_mode, "llmCalled": False}
    if mode == "off" or (mode == "fallback" and not _rules_need_help(rules_raw, prof_key)):
        return rules_raw, {f: "rules" for f in rules_raw if _has(rules_raw, f)}, info
    try:
        llm_raw = llm_call()
        info["llmCalled"] = True
    except llm.LlmError as exc:
        log.warning("LLM indisponible, règles seules : %s", exc)
        info["llmError"] = "AI_UNAVAILABLE"
        return rules_raw, {f: "rules" for f in rules_raw if _has(rules_raw, f)}, info
    if mode == "on":
        merged, sources = _merge(llm_raw, rules_raw, "llm", "rules")
    else:
        merged, sources = _merge(rules_raw, llm_raw, "rules", "llm")
        # Métier ambigu pour les règles : on prend les mots repérés par le LLM.
        if not (rules_raw.get(prof_key) or {}).get("evidence") and _has(llm_raw, prof_key):
            merged[prof_key], sources[prof_key] = llm_raw[prof_key], "llm"
        if _has(llm_raw, "bio"):                       # la bio du LLM est plus naturelle que le modèle de phrase
            merged["bio"], sources["bio"] = llm_raw["bio"], "llm"
    return merged, sources, info


def _meta(asr_result, duration: float, t_asr: float, t0: float, info: dict) -> dict:
    return {
        "transcript": asr_result.primary.text,
        "transcriptSecondary": asr_result.secondary.text if asr_result.secondary else None,
        "readings": [{"engine": t.engine, "text": t.text, "seconds": getattr(t, "seconds", 0.0)}
                     for t in [asr_result.primary, asr_result.secondary, *asr_result.extra] if t],
        "asrRoute": asr_result.route,
        "durationSeconds": round(duration, 1),
        "timings": {"asr": t_asr, "total": round(time.time() - t0, 2)},
        **info,
        "model": {"asr": [asr_result.primary.engine] + ([asr_result.secondary.engine] if asr_result.secondary else []),
                  "llm": settings.llm_model if info.get("llmCalled") else None,
                  "promptVersion": settings.prompt_version, "taxonomyVersion": taxonomy.load()["version"]},
    }



def _arabic_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    return sum(1 for c in letters if "\u0600" <= c <= "\u06ff") / len(letters) if letters else 0.0


def _readings(asr_result) -> list:
    return [t for t in [asr_result.primary, asr_result.secondary, *asr_result.extra] if t and t.text.strip()]


def _detected_lang(asr_result) -> str:
    m = re.search(r"(?:détecté|whisper-only \()\s*(\w+)", asr_result.route or "")
    return m.group(1) if m else (asr_result.primary.language or "")


def spoken_text(asr_result, ui: str) -> tuple[str | None, bool]:
    """Ce que la personne a dit, pour « عنك / À propos de vous ». Renvoie (texte, sûr ?).

    Page arabe : la lecture la plus « arabe » (Whisper en arabe, sinon LinTO). Si elle contient encore des mots
    en lettres latines (derja + français), on la propose quand même, mais à vérifier.
    Page française ou anglaise : la lecture Whisper seulement si la personne a parlé cette langue.
    """
    readings = _readings(asr_result)
    if ui == "ar":
        # Le modèle derja code-switching écrit la phrase comme on la dit (arabe + mots français) : on la garde telle quelle.
        # v1.3.10 : plus de seuil « assez d'arabe » : même avec beaucoup de français (« vingt dinar l'heure disponible »),
        # la lecture derja reste la phrase dite ; ses mots français sont ensuite écrits en lettres arabes.
        mixed = [t for t in readings if t.engine.startswith("hf:") and _arabic_ratio(t.text) > 0]
        if mixed:
            return mixed[0].text.strip()[:400], True
        ranked = sorted(readings, key=lambda t: (-_arabic_ratio(t.text), 0 if t.language == "ar" else 1))
        if ranked and _arabic_ratio(ranked[0].text) >= 0.5:
            return ranked[0].text.strip()[:400], extract.script_ok(ranked[0].text, "ar")
        return None, False
    good = [t for t in readings if _arabic_ratio(t.text) <= 0.2 and t.language == ui and _detected_lang(asr_result) == ui]
    return (good[0].text.strip()[:400], True) if good else (None, False)


def pure_script(text: str, ui: str) -> bool:
    """Texte écrit en entier dans l'écriture de la page : aucune lettre latine sur la page arabe, aucune lettre arabe ailleurs."""
    if ui == "ar":
        return bool(re.search(r"[؀-ۿ]", text)) and not re.search(r"[A-Za-zÀ-ÿ]", text)
    return not re.search(r"[؀-ۿ]", text)


def _summary(profile: dict, ui: str) -> str | None:
    """Petit résumé à partir des champs trouvés (« كهربائي في مساكن، خبرة 7 سنوات… »)."""
    job = (profile.get("profession") or {}).get("value")
    def val(f):                                       # seulement les valeurs sûres, dans l'écriture de la page
        item = profile.get(f) or {}
        return item.get("value") if item.get("status") == "fill" and extract.script_ok(str(item.get("value")), ui) else None
    if job in taxonomy.load()["by_id"]:
        return rules.bio(job, val("city"), val("years_experience"), val("availability"), ui)["value"]
    # Métier inconnu (ou dit en arabe sur une page française) : résumé sans le métier, s'il reste quelque chose à dire.
    city, years, avail = val("city"), val("years_experience"), val("availability")
    if not (city or years or avail):
        return None
    parts = {"fr": [f"Basé(e) à {city}" if city else "", f"{years} d'expérience" if years else "", f"disponible : {avail}" if avail else ""],
             "en": [f"Based in {city}" if city else "", f"{years} of experience" if years else "", f"available: {avail}" if avail else ""],
             "ar": [f"مقيم(ة) في {city}" if city else "", f"خبرة {years}" if years else "", f"التوفر: {avail}" if avail else ""]}[ui]
    text = ("، " if ui == "ar" else ", ").join(x for x in parts if x)
    return text[:1].upper() + text[1:] + "."


def _latin_spelling(fl: tuple, readings_names: list, ui: str) -> tuple:
    """Prénom/nom translittérés depuis l'arabe (« Cherouk ») : si une lecture latine a un nom qui y ressemble
    (« Chourouk »), on prend son orthographe ; un mot sans rapport (« Good ») est ignoré."""
    from rapidfuzz import fuzz
    out = []
    for k, item in enumerate(fl):
        v = item["value"]
        if v and not all(rules._known_name(w) for w in v.split()):        # nom connu : sa vraie orthographe reste
            for other in readings_names:
                c = other[k]["value"]
                if c and c != v and not re.search(r"[؀-ۿ]", c) and fuzz.ratio(rules.light(c), rules.light(v)) >= 60:
                    item = {**item, "value": c}
                    break
        out.append(item)
    return tuple(out)


def _names_in_page_script(asr_result, ui: str, tn: str, profile: dict) -> None:
    """Prénom et nom pris dans la lecture écrite comme la page (« يوسف » sur la page arabe, pas « Yusuf »)."""
    readings_names = [rules.names(t.text, ui) for t in _readings(asr_result)]
    found = list(readings_names)                                        # la lecture la plus fiable d'abord
    found = [(f, l) for f, l in found if f["value"] and extract.script_ok(f["value"], ui)]
    # Un prénom connu (« Rania » → « رانية ») passe avant un mot mal coupé (« رانياك »).
    known = {rules.light(w) for pair in lx.NAMES.items() for w in pair}
    found.sort(key=lambda fl: 0 if any(rules.light(w) in known for w in fl[0]["value"].split()) else 1)
    if found and ui != "ar":
        found = [_latin_spelling(fl, readings_names, ui) for fl in found[:1]] + found[1:]
    if found:
        first, last = found[0]
        profile["first_name"] = extract.score_field("first_name", first, tn, ui)
        if last["value"] and extract.script_ok(last["value"], ui):
            profile["last_name"] = extract.score_field("last_name", last, tn, ui)
    _name_suggestions(profile, readings_names, ui)


def _sector_follows_job(profile: dict, ui: str) -> None:
    """v1.3.8 : métier du catalogue → le secteur est celui du métier ; les secteurs proposés sont seulement ceux
    des métiers proches (pas « Technologie » pour une aide ménagère)."""
    job = (profile.get("profession") or {}).get("value")
    by_id = taxonomy.load()["by_id"]
    if job not in by_id:
        return
    sec = str(by_id[job]["sector"])
    alts = []
    for a in (profile["profession"].get("alternatives") or []):
        s2 = str(by_id[a["value"]]["sector"]) if a.get("value") in by_id else None
        if s2 and s2 != sec and s2 not in [x["value"] for x in alts]:
            alts.append({"value": s2, "label": taxonomy.sector_label(s2, ui)})
    cur = profile.get("sector_id") or {}
    profile["sector_id"] = {**cur, "value": sec, "label": taxonomy.sector_label(sec, ui),
                            "confidence": max(cur.get("confidence") or 0, 0.9) if cur.get("value") in (None, sec) else 0.9,
                            "status": "fill", "alternatives": alts}


def _name_suggestions(profile: dict, readings_names: list, ui: str) -> None:
    """v1.3.5 : prénom / nom pas sûr → 2-3 orthographes proposées à cliquer, dans l'écriture de la page
    (les autres lectures de la voix d'abord, puis les noms connus proches). Nom connu : rien à proposer."""
    for key, idx in (("first_name", 0), ("last_name", 1)):
        item = profile.get(key) or {}
        v = item.get("value")
        if not v:
            continue
        heard = []
        for rn in readings_names:
            h = rn[idx]["value"]
            if h and h != v and extract.script_ok(h, ui) and h not in heard:
                heard.append(h)
        known = all(rules._known_name(w) or w.lower() in names.PARTICLES for w in v.split())
        if known:
            # v1.3.11 : nom connu du dictionnaire → on ne propose une autre lecture que si c'est aussi un nom connu
            # (plus de « Ennice » sous « Anis », ni « رابلسي » sous « الطرابلسي »).
            heard = [h for h in heard if all(rules._known_name(w) or w.lower() in names.PARTICLES for w in h.split())]
            if not heard:
                continue
        alts = names.alternatives(v, ui, chosen=v, heard=heard)
        if alts:
            item["alternatives"] = [{"value": a, "label": a} for a in alts]



def _single_field(asr_result, ui: str, field: str, tn: str, profile: dict) -> None:
    """Micro d'un seul champ : la personne dit juste « رندا », « تواتي », « عربي و فرنساوي »… sans phrase autour."""
    readings = _readings(asr_result)
    if field in ("first_name", "last_name") and not (profile.get(field) or {}).get("value"):
        for t in readings:                               # lecture la plus fiable d'abord
            words = [w for w in rules.light(t.text).split() if w not in {rules.light(x) for x in lx.INTRO_WORDS}]
            if not 1 <= len(words) <= 3:
                continue
            raw_words = t.text.replace("،", " ").replace(",", " ").replace(".", " ").split()[-len(words):]
            value = " ".join(rules._name_in_ui(w, ui) for w in raw_words)
            if extract.script_ok(value, ui):
                # La personne a dicté ce champ exprès : on remplit (elle voit et corrige tout de suite).
                profile[field] = {"value": value, "confidence": 0.85, "evidence": t.text, "status": "fill"}
                return
    if field == "spoken_languages" and not (profile.get(field) or {}).get("value"):
        for t in readings:
            item = rules.spoken_languages(rules.light(t.text), ui, direct=True)
            if item["value"]:
                profile[field] = {"value": item["value"], "confidence": 0.85, "evidence": item["evidence"], "status": "fill"}
                return


def build_profile(asr_result, ui: str, field: str | None = None) -> tuple[dict, dict]:
    text = asr_result.all_text
    raw, sources, info = _combine(rules.extract_profile(text, ui),
                                  lambda: extract.extract_profile(asr_result, ui, field), "profession_spoken")
    tn = taxonomy.norm(text)
    profile = {f: extract.score_field(f, raw.get(f), tn, ui)
               for f in extract.PROFILE_FIELDS if f not in ("profession_spoken", "sector_id")}
    spoken = (raw.get("profession_spoken") or {}).get("value")
    prof = taxonomy.normalize_profession(spoken, text, ui, extract.status_for, use_llm=settings.llm_mode != "off")
    profile["profession"] = prof
    if prof.get("sectorId"):                         # secteur déduit du service quand il est connu
        conf = prof["confidence"]
        profile["sector_id"] = {"value": prof["sectorId"], "label": taxonomy.sector_label(prof["sectorId"], ui),
                                "confidence": conf, "evidence": spoken, "status": extract.status_for("sector_id", conf)}
    else:
        sec = extract.score_field("sector_id", raw.get("sector_id"), tn, ui)
        if sec["value"]:
            sec["label"] = taxonomy.sector_label(sec["value"], ui)
        profile["sector_id"] = sec
    # Agent classification (fichiers du chef) : concepts pour le matching, et le secteur quand le métier
    # n'est pas dans notre catalogue (secteurs 1, 4, 5, 6 : commerce, finance, industrie, agriculture…).
    cls = classify.classify({"main_job_service": spoken or "", "about": text}, ui)
    info["classification"] = {k: cls[k] for k in ("sector_id", "confidence", "status", "method", "category", "role", "tags")} | {
        "concepts": [{"concept_id": c["concept_id"], "label": c["label"], "type": c["type"]} for c in cls["concepts"][:8]],
        "goals": [g["concept_id"] for g in cls["goals"]]}
    if not profile["sector_id"].get("value") and cls["sector_id"] and cls["status"] in ("fill", "suggest"):
        conf = 0.86 if cls["status"] == "fill" else 0.7       # « fill » de l'agent = assez sûr pour remplir (seuil 0,85)
        profile["sector_id"] = {"value": str(cls["sector_id"]), "label": cls["sector_label"], "confidence": conf,
                                "evidence": ", ".join(e["tag"] for e in cls["evidence"][:3]) or None,
                                "status": extract.status_for("sector_id", conf),
                                "alternatives": [{"value": str(a["sector_id"]), "label": a["label"]} for a in cls["alternatives"][1:3]]}
        sources["sector_id"] = "classification"
    _sector_follows_job(profile, ui)
    _names_in_page_script(asr_result, ui, tn, profile)
    for f in ("first_name", "last_name"):
        # v1.3.8 : nom entendu dans l'autre écriture (« Benrekaya » sur la page arabe) : pas rempli, mais proposé
        # en suggestions dans l'écriture de la page (un clic), au lieu de rien.
        v = profile.get(f) or {}
        if v.get("value") and not extract.script_ok(str(v["value"]), ui):
            opts = names.alternatives(str(v["value"]), ui)
            if opts:
                profile[f] = {"value": opts[0], "confidence": 0.6, "evidence": v.get("evidence"), "status": "suggest",
                              "alternatives": [{"value": o, "label": o} for o in opts[1:]]}
            else:
                profile[f] = dict(extract.EMPTY)
        elif v.get("value") and v.get("status") == "empty":     # nom trouvé mais peu sûr : proposé (un clic), pas perdu
            profile[f] = {**v, "confidence": max(v.get("confidence") or 0, 0.6), "status": "suggest"}
    # « عنك » (v1.3.4 → 1.3.6) : page arabe = la phrase dite mot pour mot (en lettres arabes) ; pages FR / EN = résumé propre.
    # Ce que la personne a dit n'est proposé (suggestion, un clic) que s'il est écrit en entier dans la langue de la page :
    # jamais d'écriture mélangée. La phrase entendue reste visible dans « ماذا سمع الذكاء الاصطناعي؟ ».
    said, sure = spoken_text(asr_result, ui)
    if said and ui == "ar":
        # v1.3.6 : page arabe → la phrase mot pour mot, en derja, les mots français écrits en lettres arabes
        # (« le ménage » → « لو ميناج ») : fidèle à ce qui a été dit, sans écriture mélangée, sans IA ni traduction.
        said = arabic_letters.to_arabic_letters(said)
    said = said if said and pure_script(said, ui) else None
    old = (profile.get("bio") or {}).get("value")
    summary = old if old and pure_script(old, ui) else _summary(profile, ui)
    alt = lambda v: [{"value": v, "label": v}] if v else []
    if said and ui == "ar":                          # « عنك » = ce que la personne a dit ; le résumé en suggestion
        profile["bio"] = {"value": said, "confidence": 0.8, "evidence": None, "status": "fill", "alternatives": alt(summary)}
        sources["bio"] = "transcription"
    elif summary:
        profile["bio"] = {"value": summary, "confidence": 0.8, "evidence": None, "status": "fill", "alternatives": alt(said)}
    elif said:
        profile["bio"] = {"value": said, "confidence": 0.6, "evidence": None, "status": "suggest", "alternatives": []}
        sources["bio"] = "transcription"
    else:
        profile["bio"] = dict(extract.EMPTY)
    for f, item in profile.items():
        src = sources.get(f) if f == "sector_id" and sources.get(f) == "classification" else \
            sources.get("profession_spoken" if f in ("profession", "sector_id") else f)
        if item.get("value") and src:
            item["source"] = src
    if field:
        _single_field(asr_result, ui, field, tn, profile)
    if field:                                        # mode micro par champ : ne renvoyer que ce champ
        key = "profession" if field == "profession" else field
        profile = {key: profile.get(key, dict(extract.EMPTY))}
    return profile, info


def process_profile(path: str, ui: str = "fr", field: str | None = None) -> dict:
    t0 = time.time()
    asr_result, duration, t_asr = _transcribe(path)
    profile, info = build_profile(asr_result, ui, field)
    return {"ok": True, "uiLocale": ui, "profile": profile, **_meta(asr_result, duration, t_asr, t0, info)}


def build_need(asr_result, ui: str) -> tuple[dict, dict]:
    text = asr_result.all_text
    raw, _, info = _combine(rules.extract_need(text, ui), lambda: extract.extract_need(asr_result, ui), "service_spoken")
    return need_from_raw(raw, text, ui), info


def process_need(path: str, ui: str = "fr") -> dict:
    t0 = time.time()
    asr_result, duration, t_asr = _transcribe(path)
    need, info = build_need(asr_result, ui)
    return {"ok": True, "uiLocale": ui, "need": need, **_meta(asr_result, duration, t_asr, t0, info)}


def need_from_raw(raw: dict, transcript: str, ui: str) -> dict:
    tn = taxonomy.norm(transcript)
    need = {f: extract.score_field(f, raw.get(f), tn, ui) for f in extract.NEED_FIELDS if f != "service_spoken"}
    spoken = (raw.get("service_spoken") or {}).get("value")
    need["service"] = taxonomy.normalize_profession(spoken, transcript, ui, extract.status_for,
                                                    use_llm=settings.llm_mode != "off")
    return need


def process_need_text(text: str, ui: str = "fr") -> dict:
    """Recherche écrite : même chaîne que pour la voix, sans transcription."""
    result = asr.AsrResult(primary=asr.Transcript(text=text.strip(), engine="texte"), route="text")
    need, info = build_need(result, ui)
    return {"ok": True, "uiLocale": ui, "transcript": text, "need": need, **info}
