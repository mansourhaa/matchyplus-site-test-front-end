"""Changement de langue de la page SANS IA (v1.3.3, demande du chef, 11 nov.).

Avant (≤ 1.3.0) : changer le drapeau relançait l'analyse de la vidéo (Whisper + modèle derja) : beaucoup d'IA.
Maintenant : chaque champ est réécrit dans la langue de la page avec les dictionnaires et les règles
(catalogue des métiers, villes, chiffres, jours, langues, prénoms connus). Aucun modèle n'est appelé (~10 ms).

Pour chaque champ :
- sûr (le dictionnaire connaît la valeur)  → écrit directement dans la langue de la page ;
- deviné (nom inconnu, ville inconnue…)     → écrit avec le badge « à vérifier » (la personne n'a rien à retaper) ;
- impossible                                → vidé.
Jamais d'écriture mélangée sur une page (v1.3.4 : « عنك » non plus, aucune lettre latine sur la page arabe).
"""
from __future__ import annotations

import re

from . import names, rules, taxonomy
from .extract import script_ok

ARABIC = re.compile(r"[؀-ۿ]")
RULE_FIELDS = {"city": rules.city, "years_experience": rules.years, "price": rules.money, "availability": rules.availability}
TEXT_FIELDS = ("first_name", "last_name", "profession", "bio", "years_experience", "price", "availability",
               "city", "spoken_languages")

_NAME2AR = [("ch", "ش"), ("sh", "ش"), ("kh", "خ"), ("gh", "غ"), ("dh", "ذ"), ("th", "ث"), ("ou", "و"), ("oo", "و"),
            ("ss", "س"), ("ll", "ل"), ("mm", "م"), ("nn", "ن"), ("tt", "ت"), ("rr", "ر"), ("ee", "ي"), ("ie", "ي"),
            ("qu", "ك"), ("ph", "ف"), ("a", "ا"), ("b", "ب"), ("c", "ك"), ("d", "د"), ("e", ""), ("f", "ف"),
            ("g", "ڨ"), ("h", "ه"), ("i", "ي"), ("j", "ج"), ("k", "ك"), ("l", "ل"), ("m", "م"), ("n", "ن"),
            ("o", "و"), ("p", "ب"), ("q", "ق"), ("r", "ر"), ("s", "س"), ("t", "ت"), ("u", "و"), ("v", "ف"),
            ("w", "و"), ("x", "كس"), ("y", "ي"), ("z", "ز")]


def arabize_name(word: str) -> str:
    """Écriture approchée d'un nom en lettres arabes, à faire vérifier (« Oussama » → « أوسامة », « Ichraf » → « إشراف »)."""
    w = taxonomy.strip_accents(word.lower())
    out = ""
    if w[:1] in "aeiou":                                   # voyelle au début : alif avec hamza
        out = "أ" if w[:1] in "aou" else "إ"
        w = w[1:] if w[:1] in "aei" else w
    while w:
        for src, dst in _NAME2AR:
            if w.startswith(src):
                if src == "a" and len(w) == 1 and len(out) > 1:
                    dst = "ة"                              # « Nadia » → « نادية », « Hela » → « هالة »
                out, w = out + dst, w[len(src):]
                break
        else:
            w = w[1:]
    return out


def _guess_word(w: str, ui: str) -> str:
    return rules.translit(w) if ui != "ar" else arabize_name(w)


def _guess(value: str, ui: str) -> str | None:
    """Écriture devinée mot par mot (arabe ↔ latin), pour un texte court inconnu des dictionnaires."""
    words = [w if script_ok(w, ui) else _guess_word(w, ui) for w in value.replace("،", ",").split()]
    out = " ".join(w for w in words if w)
    return out if out and script_ok(out, ui) else None


def _name(value: str, ui: str) -> tuple[str | None, bool]:
    out, sure = [], True
    for w in value.split():
        known = rules._known_name(w)
        if known:
            out.append(known[1] if ui == "ar" else known[0])
        elif w.lower() in ("ben", "bin", "بن", "ابن"):
            out.append("بن" if ui == "ar" else "Ben")
        elif w.lower() in ("bent", "بنت"):
            out.append("بنت" if ui == "ar" else "Bent")
        elif script_ok(w, ui):
            out.append(w)
        else:
            out.append(_guess_word(w, ui))
            sure = False
    return (" ".join(out) or None), sure


def _field(field: str, value: str, ui: str, service_id: str | None) -> tuple[str | None, bool]:
    """(valeur dans la langue de la page, sûre ?)."""
    if not value:
        return None, True
    if field == "profession":
        if service_id and service_id in taxonomy.load()["by_id"]:
            return taxonomy.label(service_id, ui), True
        cands = taxonomy.lexical_candidates(value)
        if cands:
            return taxonomy.label(cands[0][0], ui), cands[0][1] >= 0.9
        return (value, True) if script_ok(value, ui) else (None, False)
    if field in ("first_name", "last_name"):
        return _name(value, ui)
    if field in RULE_FIELDS:
        v = (RULE_FIELDS[field](rules.light(value), ui) or {}).get("value")
        if v and script_ok(str(v), ui):
            return str(v), True
    elif field == "spoken_languages":
        v = rules.spoken_languages(rules.light(value), ui, direct=True).get("value")
        if v:
            return v, True
    if script_ok(value, ui):
        return value, True
    return _guess(value, ui), False


def _summary(values: dict, ui: str, service_id: str | None) -> str | None:
    if service_id and service_id in taxonomy.load()["by_id"]:
        return rules.bio(service_id, values.get("city"), values.get("years_experience"), values.get("availability"), ui)["value"]
    parts = {"fr": ("Basé(e) à {}", "{} d'expérience", "disponible : {}"),
             "en": ("Based in {}", "{} of experience", "available: {}"),
             "ar": ("مقيم(ة) في {}", "خبرة {}", "التوفر: {}")}[ui]
    bits = [p.format(values[k]) for p, k in zip(parts, ("city", "years_experience", "availability")) if values.get(k)]
    if not bits:
        return None
    text = ("، " if ui == "ar" else ", ").join(bits)
    return text[:1].upper() + text[1:] + "."


def relabel(values: dict[str, str], ui: str, service_id: str | None = None,
            suggestions: dict[str, list[dict]] | None = None, ai_fields: list[str] | None = None) -> dict:
    """values : les champs remplis (par l'IA ou par la personne). ai_fields : ceux écrits par l'IA et pas modifiés.
    Renvoie, champ par champ, la valeur dans la langue `ui`, `review` (à vérifier) et l'ancienne valeur."""
    ai = set(ai_fields or [])
    if service_id and service_id not in taxonomy.load()["by_id"]:
        service_id = None                                   # « OTHER » ou identifiant inconnu : on cherche par le texte
    if not service_id and values.get("profession"):        # métier tapé ou non reconnu : retrouvé par le catalogue
        cands = taxonomy.lexical_candidates(str(values["profession"]))
        service_id = cands[0][0] if cands and cands[0][1] >= 0.9 else None
    fields: dict[str, dict] = {}
    for f, v in values.items():
        v = str(v or "").strip()
        if f == "bio" or not v:
            continue
        new, sure = _field(f, v, ui, service_id)
        fields[f] = {"value": new, "review": not sure and new != v, "original": v, "alternatives": []}
        if f in ("first_name", "last_name") and new and not sure:
            # v1.3.5 : nom pas sûr → autres orthographes proposées à cliquer (sans IA)
            fields[f]["alternatives"] = names.alternatives(v, ui, chosen=new)
    if values.get("bio"):
        bio = str(values["bio"]).strip()
        known = {k: x["value"] for k, x in fields.items() if x["value"]}
        same_script = (bool(ARABIC.search(bio)) and not re.search(r"[A-Za-zÀ-ÿ]", bio)) if ui == "ar" else not ARABIC.search(bio)
        summary = _summary(known, ui, service_id)
        if "bio" in ai:                                    # « À propos » écrit par l'IA : refait dans la langue de la page
            fields["bio"] = {"value": summary or (bio if same_script else None), "review": False, "original": bio}
        elif summary:
            # v1.3.11 : tapé (ou corrigé) par la personne dans la langue de l'autre page : résumé dans la langue de la page,
            # « à vérifier » ; son texte revient tel quel quand elle retourne à sa langue (mémoire côté page).
            # Avant, un texte français restait sur la page anglaise (même alphabet).
            fields["bio"] = {"value": summary, "review": True, "original": bio}
        else:                                              # rien pour faire un résumé : gardé seulement dans la bonne écriture
            fields["bio"] = {"value": bio if same_script else None, "review": not same_script, "original": bio}
    sugg_out: dict[str, list[dict]] = {}
    for f, options in (suggestions or {}).items():
        new_opts = []
        for o in options:
            if f == "bio":                                     # phrase dite : gardée seulement si déjà dans la langue de la page
                text = str(o.get("label") or o.get("value") or "")
                if (bool(ARABIC.search(text)) and not re.search(r"[A-Za-zÀ-ÿ]", text)) if ui == "ar" else not ARABIC.search(text):
                    new_opts.append(o)
                continue
            if f == "sector_id":
                if service_id:                             # métier connu : le secteur suit le métier (v1.3.8)
                    continue
                code = str(o.get("value") or "")
                if code in taxonomy.load()["sector_by_id"]:
                    new_opts.append({**o, "label": taxonomy.sector_label(code, ui)})
                continue
            v, _ = _field(f, str(o.get("label") or o.get("value") or ""), ui, o.get("serviceId") if f == "profession" else None)
            if v and all(x["value"] != v for x in new_opts) and v != (fields.get(f) or {}).get("value"):
                new_opts.append({**o, "value": v, "label": v})
        if new_opts:
            sugg_out[f] = new_opts
    return {"ok": True, "ui": ui, "fields": fields, "suggestions": sugg_out, "serviceId": service_id, "ai": False}
