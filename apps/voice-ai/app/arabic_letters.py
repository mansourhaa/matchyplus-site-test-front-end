"""Écrire en lettres arabes les mots français d'une phrase en derja (v1.3.6, 11 nov.) — sans IA, sans traduction.

« bonjour أنا هالة نعمل le ménage » → « بونجور أنا هالة نعمل لو ميناج » : la phrase reste mot pour mot comme la personne
l'a dite (c'est de la derja), seules les lettres changent. Sert pour « عنك » sur la page arabe : pas d'écriture mélangée.
"""
from __future__ import annotations

import re

from .taxonomy import arabize, strip_accents

# Mots français courants dans la derja, écrits comme on les écrit en Tunisie (lettres, pas traduction).
FR_IN_AR = {
    "bonjour": "بونجور", "bonsoir": "بونسوار", "salut": "سالي", "merci": "مرسي", "ok": "أوكي", "oui": "وي", "non": "نون",
    "le": "لو", "la": "لا", "les": "لي", "un": "آن", "une": "إين", "des": "دي", "du": "دو", "de": "دو", "et": "إي",
    "à": "آ", "a": "آ", "au": "أو", "en": "آن", "avec": "آفاك", "pour": "بور", "par": "بار", "je": "جو", "fais": "في",
    "suis": "سوي", "c'est": "سي", "très": "تري", "bien": "بيان", "ans": "آن", "an": "آن", "heure": "أور",
    "l'heure": "لور", "d'expérience": "ديكسبيريونس", "expérience": "ديكسبيريونس", "ménage": "ميناج",
    "disponible": "ديسبونيبل", "dinars": "دينار", "dinar": "دينار", "dt": "دينار", "vingt": "فان", "cinq": "سانك",
    "dix": "ديس", "trente": "ترونت", "quarante": "كارونت", "cent": "سون", "lundi": "لوندي", "mardi": "ماردي",
    "mercredi": "ميركردي", "jeudi": "جودي", "vendredi": "فوندردي", "samedi": "سامدي", "dimanche": "ديمانش",
    "plombier": "بلومبيي", "électricien": "إلكتريسيان", "mécanicien": "ميكانيسيان", "chauffeur": "شوفور",
    "femme": "فام", "travail": "ترافاي", "service": "سارفيس", "services": "سارفيس", "client": "كليون",
    "clients": "كليون", "maison": "ميزون", "bureau": "بيرو", "bureaux": "بيرو", "tous": "تو", "jours": "جور",
    "jour": "جور", "soir": "سوار", "matin": "ماتان", "week-end": "ويكاند", "weekend": "ويكاند", "freelance": "فريلانس",
    "sousse": "سوسة", "tunis": "تونس", "sfax": "صفاقس", "monastir": "المنستير", "mahdia": "المهدية", "nabeul": "نابل",
}
# Derja écrite en lettres latines (arabizi) : les mots les plus courants.
ARABIZI = {
    "ena": "أنا", "ana": "أنا", "enti": "إنتي", "enta": "إنتا", "na3mel": "نعمل", "nekhdem": "نخدم", "n5dem": "نخدم",
    "nekhdm": "نخدم", "fi": "في", "f": "في", "w": "و", "wa": "و", "kol": "كل", "nhar": "نهار", "3andi": "عندي",
    "andi": "عندي", "nahki": "نحكي", "3arbi": "عربي", "fransaoui": "فرنساوي", "fransawi": "فرنساوي", "sna": "سنة",
    "snin": "سنين", "esmi": "اسمي", "ismi": "اسمي", "3aslema": "عسلامة", "aslema": "عسلامة", "behi": "باهي",
    "barcha": "برشا", "mta3": "متاع", "mte3": "متاع", "ken": "كان", "bech": "باش", "lyoum": "اليوم", "ghodwa": "غدوة",
    "nheb": "نحب", "n7eb": "نحب", "khebra": "خبرة", "5ebra": "خبرة", "khibra": "خبرة", "dar": "دار", "edar": "الدار", "khedma": "خدمة", "5edma": "خدمة", "sa3a": "ساعة",
}
LATIN_WORD = re.compile(r"[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’-]*")


def _word(w: str) -> str:
    from .rules import _known_name                        # prénoms / noms connus : leur vraie orthographe arabe
    low = w.lower().replace("’", "'")
    if low in FR_IN_AR:
        return FR_IN_AR[low]
    if low in ARABIZI:
        return ARABIZI[low]
    known = _known_name(w)
    if known:
        return known[1]
    if re.search(r"[a-z][23579]|[23579][a-z]", low):     # arabizi : 3 = ع, 7 = ح, 9 = ق, 5 = خ, 2 = ء
        for d, ar in (("3", "ع"), ("7", "ح"), ("9", "ق"), ("5", "خ"), ("2", "ء")):
            low = low.replace(d, ar)
        return "".join(c if "؀" <= c <= "ۿ" else arabize(c) for c in low)
    for pre, ar in (("l'", "ل"), ("d'", "د"), ("j'", "ج"), ("c'", "س"), ("n'", "ن"), ("qu'", "ك")):
        if low.startswith(pre) and len(low) > len(pre) + 1:
            return ar + _word(low[len(pre):])
    bare = strip_accents(low)
    if "kh" in bare or "gh" in bare:                     # arabizi « kh » = خ, « gh » = غ
        return "".join(arabize(p) if p not in ("خ", "غ") else p
                       for p in re.split(r"(خ|غ)", bare.replace("kh", "خ").replace("gh", "غ")) if p)
    out = arabize(bare)
    if bare[:1] in "aeiouy":                              # voyelle au début : alif (« avec » → « آفاك »)
        out = ("إ" if bare[:1] in "ei" else "أ") + (out[1:] if out[:1] in "اوي" else out)
    return out or w


def to_arabic_letters(text: str) -> str:
    """Remplace chaque mot en lettres latines par le même mot en lettres arabes ; le reste ne bouge pas."""
    out = LATIN_WORD.sub(lambda m: _word(m.group(0)) if re.search(r"[A-Za-zÀ-ÿ]", m.group(0)) else m.group(0), text)
    return out.replace(",", "،").replace("?", "؟").replace(";", "؛")
