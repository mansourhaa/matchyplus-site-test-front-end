"""Référentiel métiers : « femme de ménage » → menage.aide_menagere, jamais batiment.plomberie."""
from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache

from rapidfuzz import fuzz

from . import llm
from .config import settings, taxonomy_csv

AR_MARKS = re.compile(r"[ؐ-ًؚ-ٰٟـ]")  # voyelles courtes + tatweel
ARABIZI = str.maketrans({"3": "ع", "7": "ح", "9": "ق", "5": "خ"})
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def strip_accents(text: str) -> str:
    """é → e, à → a ; les lettres arabes avec hamza/madda sont ramenées à leur forme de base."""
    return "".join(c for c in unicodedata.normalize("NFKD", text) if unicodedata.category(c) != "Mn")


def norm(text: str | None) -> str:
    if not text:
        return ""
    t = strip_accents(AR_MARKS.sub("", text.lower().translate(AR_DIGITS)))
    t = re.sub("[أإآ]", "ا", t).replace("ى", "ي").replace("ة", "ه")
    t = t.translate(ARABIZI)
    t = re.sub(r"[^\w\s']", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def is_arabic(text: str | None) -> bool:
    return bool(re.search(r"[؀-ۿ]", text or ""))


@lru_cache(maxsize=1)
def load() -> dict:
    data = json.loads((settings.data_dir / "services.json").read_text(encoding="utf-8"))
    # Nom des métiers dans les 3 langues : le dictionnaire du catalogue (services.json), jamais l'IA — comme en 2.0.3.
    # Les mots du dictionnaire du chef (data/taxonomy/matchyplus_tags_metiers_interets.csv, tag « métier ») sont en plus reconnus
    # quand on les dit, sans changer le nom affiché.
    lead = taxonomy_csv("tags_metiers_interets.csv")
    if lead.exists():
        import csv
        chef: dict[str, list[str]] = {}
        for r in csv.DictReader(lead.open(encoding="utf-8")):
            if r.get("tag_type") == "métier" and r.get("language_code") in ("fr", "en", "ar"):
                chef.setdefault(r["concept_id"], []).append(r["tag"].strip())
        # Un mot du chef n'est ajouté que s'il n'existe encore nulle part, et à un seul métier (pas d'ambiguïté créée).
        known = {x.lower() for s in data["services"] for x in [s["fr"], s["en"], s["ar"], *(s.get("synonyms") or [])]}
        for s in data["services"]:
            for w in dict.fromkeys(w for c in (s.get("concepts") or []) for w in chef.get(c, [])):
                if w.lower() not in known:
                    s.setdefault("synonyms", []).append(w)
                    known.add(w.lower())
    data["by_id"] = {s["id"]: s for s in data["services"]}
    data["sector_by_id"] = {s["id"]: s for s in data["sectors"]}
    return data


def label(service_id: str, ui: str) -> str:
    s = load()["by_id"][service_id]
    return s.get(ui) or s["fr"]


def sector_label(sector_id: str, ui: str) -> str:
    s = load()["sector_by_id"][sector_id]
    return s.get(ui) or s["fr"]


# ----------------------------------------------------------------------------- mots français écrits en arabe
# Le modèle derja écrit les mots français en lettres arabes : « jardinier » → « جردنيين », « ménage » → « ميناج »,
# « plombier » → « بلومبي ». On compare le « squelette » (les consonnes) du mot arabe à celui des synonymes français
# et anglais de la liste, écrits eux aussi en lettres arabes. Ainsi TOUT métier de la liste est reconnu, sans ajouter
# chaque orthographe à la main (cas réel du 5 nov. : « Anis, jardinier »).
_FR2AR = [("tion", "سيون"), ("ier", "يي"), ("eur", "ور"), ("eau", "و"), ("ch", "ش"), ("ou", "و"), ("ai", "ي"),
          ("ei", "ي"), ("au", "و"), ("gn", "ني"), ("qu", "ك"), ("ph", "ف"), ("th", "ت"), ("ll", "ل"), ("ss", "س"),
          ("tt", "ت"), ("rr", "ر"), ("nn", "ن"), ("mm", "م"), ("pp", "ب"), ("ge", "ج"), ("gi", "جي"), ("ce", "س"),
          ("ci", "سي"), ("a", "ا"), ("b", "ب"), ("c", "ك"), ("d", "د"), ("e", ""), ("f", "ف"), ("g", "ڨ"), ("h", ""),
          ("i", "ي"), ("j", "ج"), ("k", "ك"), ("l", "ل"), ("m", "م"), ("n", "ن"), ("o", "و"), ("p", "ب"), ("q", "ك"),
          ("r", "ر"), ("s", "س"), ("t", "ت"), ("u", "و"), ("v", "ف"), ("w", "و"), ("x", "كس"), ("y", "ي"), ("z", "ز")]
_LONG_VOWELS = set("اويىةهءأإآ")


def arabize(latin: str) -> str:
    """Écriture approximative d'un mot français en lettres arabes (« jardinier » → « جارديني ي »)."""
    w, out = strip_accents(latin.lower()), ""
    while w:
        for src, dst in _FR2AR:
            if w.startswith(src):
                out, w = out + dst, w[len(src):]
                break
        else:
            w = w[1:]
    return out


def skeleton(arabic: str) -> str:
    """Consonnes seulement (« جردنيين » → « جردنن »), sans article collé (ال, ل, بال, فال, وال)."""
    w = norm(arabic).replace(" ", "")
    for pre in ("وال", "بال", "فال", "لل", "ال", "ل"):
        if w.startswith(pre) and len(w) - len(pre) >= 3:
            w = w[len(pre):]
            break
    sk = "".join(ch for ch in w if ch not in _LONG_VOWELS)
    return re.sub(r"(.)\1+", r"\1", sk).replace("ڨ", "ق")


@lru_cache(maxsize=1)
def _arabized_index() -> dict[str, set]:
    index: dict[str, set] = {}
    for sid, s in load()["by_id"].items():
        for syn in [s["fr"], s["en"], *s["synonyms"]]:
            if is_arabic(syn) or len(syn) < 5:
                continue
            for word in strip_accents(syn.lower()).split():
                if len(word) >= 5:
                    sk = skeleton(arabize(word))
                    if len(sk) >= 3:
                        index.setdefault(sk, set()).add(sid)
    return index


@lru_cache(maxsize=1)
def _place_names() -> tuple:
    """Noms complets des lieux, du plus long au plus court (« hammam sousse » avant « sousse »)."""
    places = json.loads((settings.data_dir / "places.json").read_text(encoding="utf-8"))
    places = places if isinstance(places, list) else places.get("places", [])
    return tuple(sorted({norm(n) for p in places for n in p["names"] if norm(n)}, key=len, reverse=True))


def without_places(q: str) -> str:
    """« jardinier fil hammam sousse » → « jardinier fil » : un nom de ville ne doit pas devenir un métier."""
    for name in _place_names():
        if " " in name:                                   # seulement les noms en plusieurs mots (« hammam sousse »)
            q = re.sub(rf"(?<!\w){re.escape(name)}(?!\w)", " ", q)
    return q


@lru_cache(maxsize=1)
def _place_words() -> frozenset:
    """Mots des noms de lieux (« مونستير » ressemble à « moniteur » : ce n'est pas un métier)."""
    places = json.loads((settings.data_dir / "places.json").read_text(encoding="utf-8"))
    places = places if isinstance(places, list) else places.get("places", [])
    words = set()
    for p in places:
        for name in p["names"]:
            for w in norm(name).split():
                words.add(w)
                words.add(skeleton(w) if is_arabic(w) else skeleton(arabize(w)))
    return frozenset(words)


@lru_cache(maxsize=4096)
def _arabized_token(tok: str) -> frozenset:
    """Métiers pour UN mot arabe (mis en mémoire : les mêmes mots reviennent sans cesse)."""
    index, places = _arabized_index(), _place_words()
    if len(tok) < 4 or norm(tok) in places:
        return frozenset()
    sk = skeleton(tok)
    if len(sk) < 3 or sk in places:
        return frozenset()
    hits = set(index.get(sk, set()))
    if not hits and len(sk) >= 5:                         # une lettre de plus ou de moins sur un mot long
        for key, ids in index.items():
            if len(key) >= 5 and key[:2] == sk[:2] and fuzz.ratio(sk, key) >= 90:
                hits |= ids
    return frozenset(hits)


@lru_cache(maxsize=1)
def _common_arabic_words() -> frozenset:
    """v1.4.2 : mots arabes / derja de tous les jours (années, chiffres, jours, « نخدم », « عندي », prénoms…).
    Ils ne sont jamais des mots français écrits en lettres arabes : « سنوات » ressemblait à « soignante »
    (cas réel du 12 nov. : « مُعينة منزلية » devenait « مرافقة مرضى »)."""
    from . import lexicon as lx
    words: set[str] = set()
    def add(v):
        if isinstance(v, str):
            for w in v.split():
                if is_arabic(w):
                    words.add(norm(w))
        elif isinstance(v, dict):
            for k, x in v.items():
                add(k); add(x)
        elif isinstance(v, (list, tuple, set, frozenset)):
            for x in v:
                add(x)
    for name in dir(lx):
        if name.isupper():
            add(getattr(lx, name))
    words |= {norm(w) for w in ("سنوات", "سنين", "سنة", "سنه", "خبرة", "خبره", "خبراء", "عندي", "نخدم", "نعمل", "اسمي",
                                "عسلامة", "السلام", "في", "من", "مع", "على", "كل", "نهار", "يوم", "ساعة", "دينار", "انا",
                                "أنا", "اني", "و", "ولا", "باش", "برشا", "توا", "الدار", "دار")}
    return frozenset(words)


def arabized_candidates(text: str, exclude: set | None = None) -> list[tuple[str, float]]:
    """Métiers reconnus dans des mots français écrits en lettres arabes. « exclude » : mots à ignorer."""
    scores = {}
    common = _common_arabic_words()
    for tok in re.findall(r"[\u0600-\u06ff]+", text or ""):
        if (exclude and norm(tok) in exclude) or norm(tok) in common:
            continue
        for sid in _arabized_token(tok):
            scores[sid] = 0.95
    return sorted(scores.items(), key=lambda kv: -kv[1])


def lexical_candidates(spoken: str) -> list[tuple[str, float]]:
    q = without_places(norm(spoken))
    scores: dict[str, float] = {}
    exact: dict[str, str] = {}                        # métier → plus long synonyme trouvé mot pour mot
    for sid, s in load()["by_id"].items():
        weak = set(s.get("weak_synonyms", []))           # expressions générales (« نخدم في الديار ») : un vrai métier dit passe avant
        for syn in [s["fr"], s["ar"], s["en"], *s["synonyms"], *s.get("hidden_synonyms", []), *weak]:
            n = norm(syn)
            if len(n) < 4:
                continue
            if " " in n:                                   # expression : dite en entier, ou presque (« électricien auto »)
                score = 1.0 if f" {n} " in f" {q} " else (fuzz.partial_ratio(n, q) / 100 if len(q) >= len(n) else 0.0)
            else:
                # Mot ENTIER de la phrase (pluriel accepté) : « hammam » n'est pas dans « hammami » (un nom),
                # « ménage » n'est pas dans « déménagement » (cas réels du 5 nov.).
                if is_arabic(n):                           # arabe : préfixe collé (ال، و، ب، ل، ف) et fin (ين، ات، ة)
                    pattern = rf"(?<!\w)(?:وال|بال|فال|لل|ال|و|ب|ل|ف)?{re.escape(n)}(?:ين|ات|ه|ة|ي)?(?!\w)"
                else:
                    pattern = rf"(?<!\w){re.escape(n)}s?(?!\w)"
                if re.search(pattern, q):
                    score = 1.0
                else:
                    score = fuzz.token_set_ratio(q, n) / 100
            if syn in weak:
                score = min(score, 0.9)
            if score >= 0.88:
                scores[sid] = max(scores.get(sid, 0.0), score)
            if f" {n} " in f" {q} " and len(n) > len(exact.get(sid, "")):
                exact[sid] = n
    # Un mot pris DANS une expression plus longue d'un autre métier ne compte pas : « delivery driver » ≠ « driver ».
    for a, wa in exact.items():
        for b, wb in exact.items():
            if a != b and len(wb) > len(wa) and f" {wa} " in f" {wb} " and f" {wa} " not in f" {q} ".replace(f" {wb} ", " "):
                scores.pop(a, None)
    if not scores:                                    # mots français écrits en arabe par le modèle derja
        return arabized_candidates(spoken)
    return sorted(scores.items(), key=lambda kv: -kv[1])


def fuzzy_candidates(text: str) -> list[tuple[str, float]]:
    """Rattrapage des mots mal transcrits (« me canisciam » ≈ « mécanicien », « pantre » ≈ « peintre ») : on compare
    les synonymes de 7 lettres ou plus à des MOTS ENTIERS (un mot, ou deux ou trois mots collés), jamais à un bout
    de mot (« faïence » dans « expérience » = faux). Jamais rempli automatiquement."""
    words = norm(text).split()
    grams = set(words) | {"".join(words[k:k + 2]) for k in range(len(words) - 1)} | \
        {"".join(words[k:k + 3]) for k in range(len(words) - 2)}
    scores: dict[str, float] = {}
    for sid, s in load()["by_id"].items():
        for syn in [s["fr"], s["ar"], s["en"], *s["synonyms"]]:
            n = norm(syn).replace(" ", "")
            if len(n) < 7:
                continue
            def sim(g: str) -> float:                       # mot entier ; tolérance si même début et même longueur
                close = abs(len(g) - len(n)) <= 1 and g[:1] == n[:1]
                return max(fuzz.ratio(n, g), fuzz.partial_ratio(n, g) if close else 0)
            score = max((sim(g) for g in grams if abs(len(g) - len(n)) <= 4), default=0) / 100
            arabic = any("\u0600" <= ch <= "\u06ff" for ch in n)
            if score >= (0.88 if arabic else 0.78):
                scores[sid] = max(scores.get(sid, 0.0), score)
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    if len(ranked) > 1 and ranked[0][1] - ranked[1][1] < 0.1:
        return ranked[:3]
    return ranked[:1]


def display_label(service_id: str, spoken: str, ui: str) -> str:
    """Libellé officiel dans la langue de la page ; en français, une variante courante si l'utilisateur l'a dite
    (« femme de ménage »). Jamais d'arabizi ni de mot péjoratif dans le formulaire."""
    s = load()["by_id"][service_id]
    if ui == "fr":
        for alt in s.get("fr_alt", []):
            if norm(alt) and norm(alt) in norm(spoken):
                return alt
    return label(service_id, ui)


def arbitrate(spoken: str, transcript: str, ids: list[str]) -> str:
    """Le LLM local choisit dans une liste FERMÉE d'identifiants (ou OTHER)."""
    services = load()["by_id"]
    options = {i: f'{services[i]["fr"]} / {services[i]["ar"]}' for i in ids}
    schema = {"type": "object",
              "properties": {"serviceId": {"type": "string", "enum": [*ids, "OTHER"]}},
              "required": ["serviceId"]}
    system = ("Tu classes un métier dans un référentiel. Réponds uniquement par un identifiant de la liste, "
              "ou OTHER si aucun ne convient vraiment. Ne devine pas.")
    user = (f"Métier dit : « {spoken} »\nPhrase complète : « {transcript} »\n"
            f"Options : {json.dumps(options, ensure_ascii=False)}")
    choice = llm.chat_json(system, user, schema).get("serviceId", "OTHER")
    return choice if choice in ids else "OTHER"


def uncovered(spoken: str, ui: str) -> dict:
    """Métier hors liste : on écrit le mot tel qu'il a été dit (« Fleuriste »), sans secteur ni matching.
    Rempli s'il est dans l'écriture de la page, sinon proposé ; une phrase entière n'est jamais recopiée."""
    word = (spoken or "").strip(" .,،")
    if not word or len(word.split()) > 3:
        return {"value": None, "label": None, "status": "empty", "confidence": 0.0, "spoken": spoken,
                "note": "UNCOVERED_PROFESSION"}
    if is_arabic(word):
        word = word[:-1] + "ة" if len(word) > 3 and word.endswith("يه") else word      # « صيدلانيه » → « صيدلانية »
    else:
        word = word[:1].upper() + word[1:]
    if is_arabic(word) != (ui == "ar"):
        # Jamais d'arabe sur la page française (ni de latin sur la page arabe) : on laisse vide, la personne tape.
        return {"value": None, "label": None, "status": "empty", "confidence": 0.0, "spoken": spoken,
                "note": "UNCOVERED_PROFESSION_OTHER_SCRIPT"}
    return {"value": "OTHER", "label": word, "status": "fill", "confidence": 0.8, "spoken": spoken,
            "note": "UNCOVERED_PROFESSION"}


def normalize_profession(spoken: str | None, transcript: str, ui: str, status_for, use_llm: bool = True) -> dict:
    if not spoken:
        return {"value": None, "status": "empty", "confidence": 0.0}
    cands = lexical_candidates(spoken)
    fuzzy = not cands
    if fuzzy:
        cands = fuzzy_candidates(spoken)
    top = cands[0] if cands else None
    gap = top[1] - cands[1][1] if len(cands) > 1 else 1.0
    if top and top[1] >= 0.92 and gap >= 0.08:
        sid, conf, method = top[0], 0.9, "lexical"
    else:
        ids = [c[0] for c in cands[:3]] or list(load()["by_id"])
        if not use_llm:                                    # mode sans LLM : on propose des choix
            if not cands:
                return uncovered(spoken, ui)
            choice = cands[0][0]
        else:
            try:
                choice = arbitrate(spoken, transcript, ids)
            except llm.LlmError:                           # Ollama indisponible : on continue sans LLM
                if not cands:
                    return uncovered(spoken, ui)
                choice, use_llm = cands[0][0], False
        if choice == "OTHER":
            return uncovered(spoken, ui)
        agree = bool(top) and top[0] == choice
        close_rivals = len(cands) > 1 and gap < 0.08          # deux métiers proches : jamais automatique
        conf = 0.7 if (close_rivals or not agree or not use_llm or fuzzy) else 0.85
        sid, method = choice, ("llm" + ("+lexical" if agree else "")) if use_llm else "lexical-ambigu"
    out = {"value": sid, "label": display_label(sid, spoken, ui), "sectorId": load()["by_id"][sid]["sector"],
           "confidence": conf, "method": method, "spoken": spoken, "status": status_for("profession", conf)}
    # v1.3.4 : même quand le métier est sûr, les métiers proches restent proposés (un clic pour corriger, sans retaper).
    alts = [c[0] for c in cands[:4] if c[0] != sid]
    if len(alts) < 2:                                     # pas assez de candidats : métiers voisins du même secteur
        same = [x for x in load()["by_id"] if x != sid and load()["by_id"][x]["sector"] == load()["by_id"][sid]["sector"]
                and x.split(".")[0] == sid.split(".")[0]]
        alts += [x for x in same if x not in alts]
    out["alternatives"] = [{"value": a, "label": label(a, ui)} for a in alts[:2]]
    return out
