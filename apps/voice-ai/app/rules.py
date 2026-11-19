"""
Extraction SANS LLM : règles + référentiel + dictionnaires. Très léger, déterministe, explicable.
Produit le même format que le LLM : {champ: {"value": ..., "evidence": ...}}.
Toutes les valeurs sont écrites dans la langue de la page (ui).
"""
from __future__ import annotations

import re
from functools import lru_cache

from . import lexicon as lx
from .taxonomy import fuzzy_candidates, label, lexical_candidates, load, norm, strip_accents

AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
AR_MARKS = re.compile(r"[ؐ-ًؚ-ٰٟـ]")


def light(text: str) -> str:
    """Normalisation douce SANS conversion arabizi (pour garder les chiffres intacts)."""
    t = strip_accents(AR_MARKS.sub("", (text or "").lower().translate(AR_DIGITS)))
    t = re.sub("[أإآ]", "ا", t).replace("ى", "ي").replace("ة", "ه")
    t = re.sub(r"[^\w\s'.]", " ", t)
    t = re.sub(r"\.{2,}|(?<=\w)\.(?=\s|$)", " ", t)   # « ena… Sami » : points de suspension et point final = espace
    return re.sub(r"\s+", " ", t).strip()


def _find_word(text_l: str, words: list[str]) -> str | None:
    """Premier mot ou expression trouvé, en respectant les limites de mots."""
    for w in sorted(words, key=len, reverse=True):
        wl = light(w)
        # En arabe, « et » se colle au mot : « والفرنسية », « وفرنساوي ».
        prefix = "(?:و)?" if re.match(r"[؀-ۿ]", wl or "") else ""
        if wl and re.search(rf"(?<!\w){prefix}{re.escape(wl)}(?!\w)", text_l):
            return wl
    return None


def F(value, evidence=None) -> dict:
    return {"value": value, "evidence": evidence}


# ----------------------------------------------------------------------------- champs
# Lettres arabes souvent confondues à l'écoute : « صوصة » pour « سوسة », « طونس » pour « تونس ».
PHONETIC = str.maketrans({"ص": "س", "ط": "ت", "ض": "د", "ظ": "ذ"})


def _place(text_l: str) -> tuple[dict, str] | None:
    best = None
    text_f = text_l.translate(PHONETIC)
    for p in _places():
        for name in p["names"]:
            n = light(name).translate(PHONETIC)
            m = re.search(rf"(?<!\w)(?:ال|ل|ف|ب|و)?{re.escape(n)}(?!\w)", text_f) if n else None
            if m and (best is None or len(n) > len(best[2])):
                best = (p, text_l[m.start():m.end()], n)
    return (best[0], best[1]) if best else None


def _places() -> list[dict]:
    from .matching import places   # import tardif (évite une boucle d'imports)
    return places()


def city(text_l: str, ui: str) -> dict:
    found = _place(text_l)
    if not found:
        return F(None)
    p, ev = found
    return F(p["ar"] if ui == "ar" else p["fr"], ev)


def _no_alef(t: str) -> str:
    return light(t).replace("ا", "")                 # « صلح » = « صالح » (le modèle oublie souvent le alif)


def _known_name(token: str) -> tuple[str, str] | None:
    t = light(token)
    def bare(x: str) -> str:                       # « حمامي » = « الحمامي » ; « رندة » = « رندا »
        x = x[2:] if x.startswith("ال") and len(x) > 4 else x
        return x[:-1] if len(x) > 3 and x[-1] in "اه" else x
    # D'abord l'écriture exacte : « سامي » = Sami, jamais Samia (« ساميه » sans son « ه » final donne aussi « سامي »).
    for lat, ar in lx.NAMES.items():
        if t in (light(lat), light(ar)):
            return lat, ar
    for lat, ar in lx.NAMES.items():
        a = light(ar)
        if bare(t) == bare(a) or (len(t) >= 3 and _no_alef(bare(t)) == _no_alef(bare(a))):
            return lat, ar
    return None


_TRANSLIT = {"ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z",
             "س": "s", "ش": "ch", "ص": "s", "ض": "dh", "ط": "t", "ظ": "dh", "ع": "a", "غ": "gh", "ف": "f", "ق": "k",
             "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ة": "a", "ء": "", "ئ": "i", "ؤ": "ou", "ا": "a", "أ": "a",
             "إ": "i", "آ": "a", "ى": "a", "و": "ou", "ي": "i", "ڨ": "g"}
_VOWELS = set("aeiou")


def translit(word: str) -> str:
    """« شاكر » → « Chaker », « شروق » → « Cherouk » : approximation à la tunisienne pour un nom INCONNU
    (les noms connus de la liste ont leur vraie orthographe). Sert aussi à vérifier une lecture latine."""
    w = word[2:] if word.startswith("ال") and len(word) > 4 else word
    if len(w) > 2 and w[-1] == "ه" and w[-2] in "يا":                  # « عطيه » = « عطية » (ة écrit ه)
        w = w[:-1] + "ة"
    parts = []
    for i, ch in enumerate(w):
        if ch in "وي" and (i == 0 or w[i - 1] in "اوي"):
            parts.append("w" if ch == "و" else "y")          # consonne en début de mot ou après une voyelle
        else:
            parts.append(_TRANSLIT.get(ch, ""))
    out = ""
    for part in parts:
        if out and part and out[-1] not in _VOWELS and part[0] not in _VOWELS and part != "h":
            out += "e"                                           # « chkr » → « chaker » : voyelle courte non écrite
        out += part
    return out[:1].upper() + out[1:] if out else word


def _name_in_ui(token: str, ui: str) -> str:
    known = _known_name(token)
    if known:
        return known[1] if ui == "ar" else known[0]
    if ui != "ar" and re.search(r"[؀-ۿ]", token):
        return translit(token)
    if ui == "ar" and len(token) > 3 and token.endswith(("يه", "ايه")):
        return token[:-1] + "ة"                          # « رقايه » → « رقاية » (ة souvent écrit ه)
    return token[:1].upper() + token[1:] if not re.search(r"[؀-ۿ]", token) else token


def _is_name_token(tok: str) -> bool:
    t = light(tok)
    if len(t) < 2 or "'" in t or t in {light(w) for w in lx.NOT_A_NAME} or any(c.isdigit() for c in t):
        return False
    keywords = lx.PROVIDER_WORDS + lx.CUSTOMER_WORDS + lx.INTRO_WORDS + lx.SPEAK_VERBS
    if t in {light(w) for w in keywords}:                  # verbe ou mot-clé, pas un nom
        return False
    if any(light(n) == t for p in _places() for n in p["names"]):
        return False
    if _known_name(t):
        return True
    # Rejeté seulement si c'est EXACTEMENT un mot de métier (« plombier », « سباك »), pas s'il y ressemble :
    # « ياسين » ressemble à « بيسين » (piscine) mais c'est un prénom (cas réel du 5 nov.).
    if t in _job_words():
        return False
    # Mot français écrit en lettres arabes (« جردنيين » = jardinier) : c'est un métier, pas un nom (cas réel du 5 nov.).
    from .taxonomy import arabized_candidates
    return not arabized_candidates(tok)


@lru_cache(maxsize=1)
def _job_words() -> frozenset:
    words = set()
    for s in load()["by_id"].values():
        for syn in [s["fr"], s["ar"], s["en"], *s["synonyms"], *s.get("hidden_synonyms", [])]:
            words.add(light(syn))
            words.update(light(w) for w in syn.split() if len(w) >= 4)
    return frozenset(words)


def names(original: str, ui: str) -> tuple[dict, dict]:
    # v1.3.8 : « Benrekaya » collé = « Ben Rekaya » (nom de famille), seulement juste après un prénom connu.
    def _split_ben(m: re.Match) -> str:
        return m.group(1) + " " + m.group(2) + " " + m.group(3) if _known_name(m.group(1)) else m.group(0)
    original = re.sub(r"(\S+)\s+(ben|bin)([a-zA-Z]{3,})\b", _split_ben, original, flags=re.I)
    text_l = light(original)
    first, last = F(None), F(None)
    def matches():
        for intro in sorted(lx.INTRO_WORDS, key=len, reverse=True):
            yield intro, re.search(rf"(?<!\w){re.escape(light(intro))}\s+(\S+)(?:\s+(\S+))?", text_l)
        # Sans « أنا » : la phrase COMMENCE par un prénom connu, après une salutation éventuelle
        # (« رندا تواتي عمري ستة و عشرين… », cas réel du 6 nov.). Seulement un prénom de la liste : jamais un mot inconnu.
        greet = "|".join(re.escape(light(g)) for g in sorted(lx.GREETINGS, key=len, reverse=True))
        m = re.match(rf"\s*(?:(?:{greet})[\s,،.!]+)*(\S+)(?:\s+(\S+))?", text_l)
        if m and _known_name(m.group(1)):
            yield "", m
    for intro, m in matches():
        if not m or not _is_name_token(m.group(1)):
            continue
        first = F(_name_in_ui(m.group(1), ui), m.group(1) if not intro else
                  m.group(0) if not m.group(2) else f"{light(intro)} {m.group(1)}")
        # Nom de famille : seulement après une présentation explicite (« je m'appelle Mehdi Trabelsi »).
        explicit = light(intro) in {light(w) for w in ("je m'appelle", "my name is", "ismi", "esmi", "اسمي", "إسمي")}
        if explicit and m.group(2) and _is_name_token(m.group(2)):
            last = F(_name_in_ui(m.group(2), ui), f"{m.group(1)} {m.group(2)}")
        # Nom de famille tunisien en « -i » juste après un prénom connu : « ena Walid Hammami », « أنا وليد حمامي ».
        # On écarte les verbes à la 1re personne (« نبني », « nebni ») : ils commencent par « n ».
        tok = m.group(2) or ""
        if not last["value"] and tok and _known_name(m.group(1)) and _is_name_token(tok) and len(light(tok)) >= 4 \
                and light(tok)[-1] in "يi" and light(tok)[0] not in "نn":
            last = F(_name_in_ui(tok, ui), f"{m.group(1)} {tok}")
        # Nom de famille suivi d'un verbe de travail ou d'un métier : « أنا شروق شاكر نخدم خياطة ».
        after = text_l[m.end(2):].split()[:1] if m.group(2) else []
        # Nom deviné sans « اسمي » : refusé s'il ressemble à un métier (« جردنيين » = « jardinier » en lettres arabes).
        looks_like_job = bool(tok) and not _known_name(tok) and bool(lexical_candidates(tok) or fuzzy_candidates(tok))
        if not last["value"] and tok and _is_name_token(tok) and not looks_like_job and after and \
                (after[0] in {light(w) for w in lx.PROVIDER_WORDS + lx.CUSTOMER_WORDS} or after[0] in _job_words()):
            last = F(_name_in_ui(tok, ui), f"{m.group(1)} {tok}")
        # Particule tunisienne : « Hela Ben Salah », « هالة بن صالح », « Amira Bent Ali ».
        pm = re.match(r"\s+(ben|bin|bent|بن|بنت|ابن)\s+(\S+)", text_l[m.end(1):])
        if pm and _is_name_token(pm.group(2)):
            word = _name_in_ui(pm.group(2), ui)
            arabic = ui == "ar" and bool(re.search(r"[؀-ۿ]", word))      # particule dans la même écriture que le nom
            particle = {"ben": "بن", "bin": "بن", "bent": "بنت"}.get(pm.group(1), pm.group(1)) if arabic else \
                {"بن": "Ben", "ابن": "Ben", "بنت": "Bent"}.get(pm.group(1), pm.group(1).capitalize())
            last = F(f"{particle} {word}", f"{m.group(1)} {pm.group(1)} {pm.group(2)}")
        break
    for kw in lx.LAST_NAME_WORDS:
        m = re.search(rf"{re.escape(light(kw))}\s+(\S+)", text_l)
        if m and _is_name_token(m.group(1)):
            last = F(_name_in_ui(m.group(1), ui), m.group(0))
    return first, last


def usage(text_l: str, has_profession: bool) -> dict:
    prov = _find_word(text_l, [w for w in lx.PROVIDER_WORDS if w not in ("je suis", "ena", "انا", "أنا")])
    cust = _find_word(text_l, lx.CUSTOMER_WORDS)
    if prov:
        return F("provider", prov)
    if cust:
        return F("customer", cust)
    if has_profession:
        intro = _find_word(text_l, ["je suis", "ena", "انا", "أنا", "i am a", "i'm a"])
        if intro:
            return F("provider", intro)
    return F(None)


def _number_before(text_l: str, unit_words: list[str]) -> tuple[int, str] | None:
    """Nombre suivi d'une unité (« 5 ans », « خمسة سنين », « عشرين دينار »).

    On regarde TOUS les nombres de la phrase : « عمري ستة و عشرين سنة » (l'âge) ne doit pas devenir l'expérience
    (cas réel du 5 nov.). On écarte ceux qui suivent « عمري / âge », on préfère ceux suivis de « خبرة / expérience »,
    sinon le premier de la phrase. « اثنتي عشرة » l'emporte sur le « عشرة » qu'il contient.
    """
    units = "|".join(re.escape(light(u)) for u in sorted(unit_words, key=len, reverse=True))
    cands = [(m.start(), m.end(), int(m.group(1)), m.group(0)) for m in re.finditer(rf"(\d+)\s*(?:{units})(?!\w)", text_l)]
    for n, ws in lx.NUMBER_WORDS.items():
        for w in ws:
            for m in re.finditer(rf"(?<!\w)(?:ب|و)?{re.escape(light(w))}\s+(?:{units})(?!\w)", text_l):
                cands.append((m.start(), m.end(), n, m.group(0)))
    kept = []
    for c in sorted(cands, key=lambda c: -(c[1] - c[0])):            # le plus long d'abord
        if not any(k[0] <= c[0] and c[1] <= k[1] for k in kept):
            kept.append(c)
    age = {light(w) for w in lx.AGE_WORDS}
    exp = {light(w) for w in lx.EXPERIENCE_WORDS}
    def is_age(c):
        before = text_l[:c[0]].split()[-4:]
        after = text_l[c[1]:].split()[:1]
        return any(w in age for w in before) or any(w in age for w in after)
    def near_exp(c):
        for w in text_l[c[1]:].split()[:3]:
            if any(ch.isdigit() for ch in w):         # un autre nombre commence : ce n'est plus le nôtre
                return False
            if w.split("'")[-1] in exp:               # « d'expérience »
                return True
        return False
    kept = [c for c in kept if not is_age(c)]
    if not kept:
        return None
    best = sorted(kept, key=lambda c: (0 if near_exp(c) else 1, c[0]))[0]
    return best[2], best[3]


def years(text_l: str, ui: str) -> dict:
    found = _number_before(text_l, lx.YEAR_WORDS)
    if not found:
        # « سانك أمور اكسبريونس » (cinq ans d'expérience mal entendu) : un nombre, 0 à 2 mots, puis « expérience »
        exp = "|".join(re.escape(light(w)) for w in lx.EXPERIENCE_WORDS)
        pairs = sorted(((n, w) for n, ws in lx.NUMBER_WORDS.items() for w in ws), key=lambda nw: -len(nw[1]))
        for n, w in [(None, r"\d+")] + [(n, re.escape(light(w))) for n, w in pairs]:
            m = re.search(rf"(?<!\w)(?:ب|و)?({w})(?:\s+\S+){{0,2}}?\s+(?:{exp})(?!\w)", text_l)
            if m:
                found = (int(m.group(1)) if n is None else n, m.group(0))
                break
    if not found:
        return F(None)
    n, ev = found
    ar = "سنة واحدة" if n == 1 else "سنتان" if n == 2 else f"{n} سنوات" if n <= 10 else f"{n} سنة"   # règle du nombre en arabe
    return F({"fr": f"{n} an" if n == 1 else f"{n} ans", "ar": ar, "en": f"{n} year" if n == 1 else f"{n} years"}[ui], ev)


def money(text_l: str, ui: str) -> dict:
    found = _number_before(text_l, lx.MONEY_WORDS)
    if not found:
        return F(None)
    n, ev = found
    return F({"fr": f"{n} DT", "ar": f"{n} د.ت", "en": f"{n} TND"}[ui], ev)


def _codes(text_l: str, table: dict[str, list[str]]) -> tuple[list[str], str | None]:
    codes, ev = [], None
    for code, words in table.items():
        w = _find_word(text_l, words)
        if w:
            codes.append(code)
            ev = ev or w
    return codes, ev


ORDER = list(lx.DAYS)                                    # lundi … dimanche
_DAY = {light(w): c for c, ws in lx.DAYS.items() for w in ws}
_DAY_ALT = "|".join(re.escape(w) for w in sorted(_DAY, key=len, reverse=True))
_RANGE = re.compile(rf"(?:من|men|mel|de|du|from)\s+(?:nhar\s+|نهار\s+|يوم\s+|el\s+|le\s+)?({_DAY_ALT})\s+"
                    rf"(?:لل|ل|الى|الي|إلى|حتي|حتى|l|lel|lil|li|a|à|au|jusqu'au|to|till|until)\s*(?:el\s+|le\s+)?({_DAY_ALT})(?!\w)")
# Sans « de / from » devant : seulement avec un mot de liaison sans ambiguïté (« Monday to Friday », « lundi au vendredi »).
_RANGE_BARE = re.compile(rf"(?<!\w)({_DAY_ALT})\s+(?:to|till|until|au|jusqu'au|إلى|الى|الي)\s+(?:el\s+|le\s+)?({_DAY_ALT})(?!\w)")
_WEEKDAYS = ("weekdays", "week days", "en semaine", "pendant la semaine")
_EXCEPT = re.compile(rf"(?:ken|كان|غير|sauf|except|excepté|ما عدا|ma 3ada|الا|illa|ella)\s+(?:nhar\s+|نهار\s+|el\s+|le\s+|يوم\s+)?({_DAY_ALT})(?!\w)")


def availability(text_l: str, ui: str) -> dict:
    days, ev = _codes(text_l, lx.DAYS)
    every = _find_word(text_l, lx.ALL_DAYS)
    rng = _RANGE.search(text_l) or _RANGE_BARE.search(text_l)
    if not rng and _find_word(text_l, _WEEKDAYS):     # « weekdays », « en semaine » = du lundi au vendredi
        days, ev = ORDER[:5], _find_word(text_l, _WEEKDAYS)
    if rng:                                           # « من الاثنين للجمعة », « du lundi au vendredi »
        i, j = ORDER.index(_DAY[rng.group(1)]), ORDER.index(_DAY[rng.group(2)])
        days, ev = [ORDER[k % 7] for k in range(i, (j if j >= i else j + 7) + 1)], rng.group(0)
    exc = _EXCEPT.search(text_l) if every else None
    if exc:                                           # « kol youm ken el a7ad » = tous les jours SAUF dimanche
        every, days, ev = None, [d for d in ORDER if d != _DAY[exc.group(1)]], exc.group(0)
    slots, ev2 = _codes(text_l, lx.SLOTS)
    if every and not rng:
        days, ev = list(lx.DAYS), every
    if not days and not slots:
        return F(None)
    sep = "، " if ui == "ar" else ", "
    every_label = {"fr": "tous les jours", "ar": "كل يوم", "en": "every day"}[ui]
    def days_label(ds: list[str]) -> str:
        idx = [ORDER.index(d) for d in ds]
        if len(ds) >= 3 and idx == list(range(idx[0], idx[0] + len(ds))):      # jours qui se suivent → une plage
            a, b = lx.DAY_LABEL[ui][ds[0]], lx.DAY_LABEL[ui][ds[-1]]
            return {"fr": f"du {a} au {b}", "ar": f"من {a} إلى {b}", "en": f"{a} to {b}"}[ui]
        return sep.join(lx.DAY_LABEL[ui][d] for d in ds)
    parts = ([every_label] if every else [days_label(days)]) if days else []
    parts += [sep.join(lx.SLOT_LABEL[ui][s] for s in slots)] if slots else []
    return F(" · ".join(parts), ev or ev2)


def spoken_languages(text_l: str, ui: str, direct: bool = False) -> dict:
    """« نحكي عربي وفرنساوي » ; direct=True (micro du champ « langues ») : le verbe n'est pas nécessaire."""
    if not direct and not _find_word(text_l, lx.SPEAK_VERBS):
        return F(None)
    codes, ev = _codes(text_l, lx.LANGS)
    sep = "، " if ui == "ar" else ", "
    return F(sep.join(lx.LANG_LABEL[ui][c] for c in codes), ev) if codes else F(None)


_JOB_VERBS = ["je suis", "je travaille comme", "mon metier c'est", "mon metier est", "i am a", "i am an", "i'm a",
              "i work as", "نخدم", "nekhdem", "n5dem", "ne5dem", "nakhdem", "اعمل", "أعمل", "مهنتي", "صنعتي", "san3ti"]
_JOB_STOP = {"un", "une", "a", "an", "le", "la", "les", "de", "des", "du", "en", "comme", "fi", "في", "w", "و", "f", "fil",
             "à", "in", "the", "chez", "ben", "bin", "بن", "ka", "كـ", "ك", "dans"}


def _job_word_ok(tok: str) -> bool:
    t = light(tok)
    if len(t) < 4 or any(c.isdigit() for c in t) or t in _JOB_STOP:
        return False
    words = lx.PROVIDER_WORDS + lx.CUSTOMER_WORDS + lx.INTRO_WORDS + lx.SPEAK_VERBS + lx.YEAR_WORDS + lx.MONEY_WORDS
    words += [w for ws in lx.NUMBER_WORDS.values() for w in ws] + [w for ws in lx.DAYS.values() for w in ws] + lx.ALL_DAYS
    if t in {light(w) for w in words} or _known_name(t):
        return False
    return not any(light(n) == t for p in _places() for n in p["names"])


def raw_job(text: str) -> str | None:
    """Métier HORS liste, tel qu'il a été dit : « je suis fleuriste », « نخدم X », « ena Yassine, fleuriste »."""
    tl = light(text)
    for verb in sorted(_JOB_VERBS, key=len, reverse=True):
        m = re.search(rf"(?<!\w){re.escape(light(verb))}\s+(.*)", tl)
        if m:
            for tok in m.group(1).split()[:3]:
                if light(tok) in _JOB_STOP:
                    continue
                return tok if _job_word_ok(tok) else None
    for intro in ("ena", "ana", "eni", "انا", "اني"):
        m = re.search(rf"(?<!\w){intro}\s+(\S+)\s+(\S+)", tl)
        if m and _is_name_token(m.group(1)) and _job_word_ok(m.group(2)):
            return m.group(2)
    return None


def profession(text: str) -> dict:
    """Mots du métier : le synonyme du référentiel retrouvé dans la phrase (ou toute la phrase si ambigu)."""
    cands = lexical_candidates(text)
    if not cands:
        # Mot mal transcrit (« me canisciam » pour « mécanicien ») : on laisse la normalisation proposer un choix.
        if fuzzy_candidates(text):
            return F(text, None)
        job = raw_job(text)                       # métier hors liste : on garde le mot dit (jamais inventé)
        return F(job, job) if job else F(None)
    if len(cands) > 1 and cands[0][1] - cands[1][1] < 0.08:
        return F(text, None)                      # ambigu : la normalisation proposera des choix
    sid = cands[0][0]
    s = load()["by_id"][sid]
    tl = norm(text)
    for syn in sorted([s["fr"], s["ar"], s["en"], *s["synonyms"], *s.get("hidden_synonyms", [])], key=len, reverse=True):
        if norm(syn) and norm(syn) in tl:
            return F(syn, syn)
    return F(text, None)


def bio(service_id: str | None, city_v: str | None, years_v: str | None, avail_v: str | None, ui: str) -> dict:
    if not service_id:
        return F(None)
    job = label(service_id, ui)
    if ui == "ar":
        s = job + (f" في {city_v}" if city_v else "") + (f"، خبرة {years_v}" if years_v else "")
        s += (f". التوفر: {avail_v}" if avail_v else "") + "."
    elif ui == "en":
        s = job + (f" in {city_v}" if city_v else "") + (f", {years_v} of experience" if years_v else "")
        s += (f". Available: {avail_v}" if avail_v else "") + "."
    else:
        s = job + (f" à {city_v}" if city_v else "") + (f", {years_v} d'expérience" if years_v else "")
        s += (f". Disponible : {avail_v}" if avail_v else "") + "."
    return F(s[:250])


# ----------------------------------------------------------------------------- entrées
def extract_profile(text: str, ui: str) -> dict:
    tl = light(text)
    prof = profession(text)
    first, last = names(text, ui)
    out = {
        "first_name": first, "last_name": last,
        "usage_type": usage(tl, bool(prof["value"])),
        "profession_spoken": prof,
        "sector_id": F(None),
        "city": city(tl, ui), "years_experience": years(tl, ui), "price": money(tl, ui),
        "availability": availability(tl, ui), "spoken_languages": spoken_languages(tl, ui),
    }
    single = lexical_candidates(text)[:1]
    out["bio"] = bio(single[0][0] if single and prof["evidence"] else None, out["city"]["value"],
                     out["years_experience"]["value"], out["availability"]["value"], ui) \
        if out["usage_type"]["value"] != "customer" else F(None)
    return out


def extract_need(text: str, ui: str) -> dict:
    tl = light(text)
    days, ev_d = _codes(tl, lx.DAYS)
    slots, ev_s = _codes(tl, lx.SLOTS)
    langs, ev_l = _codes(tl, lx.LANGS)
    prof = profession(text)
    return {
        "service_spoken": prof,
        "city": city(tl, ui),
        "day": F(", ".join(lx.DAY_LABEL[ui][d] for d in days), ev_d) if days else F(None),
        "time_slot": F(", ".join(lx.SLOT_LABEL[ui][s] for s in slots), ev_s) if slots else F(None),
        "budget": money(tl, ui),
        "languages": F(", ".join(lx.LANG_LABEL[ui][c] for c in langs), ev_l) if langs else F(None),
    }
