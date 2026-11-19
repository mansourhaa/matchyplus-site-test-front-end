"""Suggestions d'orthographe pour un prénom ou un nom (v1.3.5, 11 nov.) — sans IA.

Quand un nom n'est pas sûr (pas dans le dictionnaire, ou mal entendu), on ne l'écrit plus seul : on propose
2 à 3 orthographes à cliquer, dans l'écriture de la page. Sources, dans l'ordre :
1. les noms entendus dans les autres lectures de la voix (« بن القاية » / « بن الرقاية ») ;
2. les noms connus les plus proches du dictionnaire (« باسم » → « Bassem ») ;
3. des variantes d'écriture courantes (« Basem » → « Bassem », « Besem »).
"""
from __future__ import annotations

import re

from rapidfuzz import fuzz

from . import lexicon as lx
from . import rules

ARABIC = re.compile(r"[؀-ۿ]")
PARTICLES = {"ben": ("Ben", "بن"), "bin": ("Ben", "بن"), "بن": ("Ben", "بن"), "ابن": ("Ben", "بن"),
             "bent": ("Bent", "بنت"), "بنت": ("Bent", "بنت")}


def _closest_known(word: str, ui: str, limit: int = 3) -> list[str]:
    """Noms connus qui ressemblent au mot (même écriture que le mot), rendus dans l'écriture de la page."""
    arabic = bool(ARABIC.search(word))
    w = rules.light(word)
    if arabic and w.startswith("ال") and len(w) > 4:
        w = w[2:]
    scored = []
    for lat, ar in lx.NAMES.items():
        ref = rules.light(ar) if arabic else lat.lower()
        if arabic and ref.startswith("ال") and len(ref) > 4:
            ref = ref[2:]
        score = fuzz.ratio(w, ref)
        if arabic:                                         # v1.3.10 : alif ignoré, ر/ل confondus à l'oreille (« صرح » ≈ « صالح »)
            sk = lambda x: x.replace("ا", "").replace("ر", "ل")
            score = max(score, fuzz.ratio(sk(w), sk(ref)) - 5)
        if score >= 70:
            scored.append((score, ar if ui == "ar" else lat))
    scored.sort(key=lambda x: -x[0])
    out: list[str] = []
    for _, name in scored:
        if name not in out:
            out.append(name)
    return out[:limit]


def _latin_variants(base: str) -> list[str]:
    """« Basem » → « Bassem », « Besem » : consonne doublée, a ↔ e (orthographes tunisiennes courantes)."""
    out = []
    m = re.match(r"^([^aeiou]*[aeiou]+)([bdfklmnrst])([aeiou].*)$", base, re.I)
    if m:
        out.append(m.group(1) + m.group(2) * 2 + m.group(3))
    if len(base) > 2:
        swapped = base[0] + base[1:].replace("a", "e", 1) if "a" in base[1:] else base[0] + base[1:].replace("e", "a", 1)
        out.append(swapped)
    return [v[:1].upper() + v[1:] for v in out if v.lower() != base.lower()]


def _word_options(word: str, ui: str) -> list[str]:
    from .relabel import arabize_name                      # import tardif : relabel importe ce module
    if word.lower() in PARTICLES:
        return [PARTICLES[word.lower()][1 if ui == "ar" else 0]]
    known = rules._known_name(word)
    if known:
        return [known[1] if ui == "ar" else known[0]]
    same_script = (bool(ARABIC.search(word)) == (ui == "ar"))
    opts = [word] if same_script else []
    opts += _closest_known(word, ui)
    if ui == "ar":
        guess = word if same_script else arabize_name(word)
        opts += [guess]
        if not guess.startswith("بن"):
            opts.append("ال" + guess if not guess.startswith("ال") else guess[2:])
    else:
        guess = word if same_script else rules.translit(word)
        opts += [guess] + _latin_variants(guess)
    seen: list[str] = []
    for o in opts:
        if o and o not in seen:
            seen.append(o)
    return seen


def alternatives(value: str, ui: str, chosen: str | None = None, heard: list[str] | None = None,
                 limit: int = 3) -> list[str]:
    """Autres orthographes possibles du nom `value`, dans l'écriture de `ui` (sans `chosen`).
    `heard` : le même nom tel qu'il a été entendu dans les autres lectures de la voix."""
    words = value.split()
    if len(words) == 1 and re.match(r"^(ben|bin)[a-z]{3,}$", words[0], re.I):   # « Benrekaya » → « Ben Rekaya »
        words = ["Ben", words[0][3:].capitalize()]
    out: list[str] = []
    for h in heard or []:                                  # 1. les autres lectures de la voix
        rendered = " ".join(_word_options(w, ui)[0] for w in h.split())
        if rendered and rendered != chosen and rendered not in out:
            out.append(rendered)
    # 2-3. une seule partie du nom varie à la fois (« Ben » reste « Ben »)
    per_word = [_word_options(w, ui) for w in words]
    first = [opts[0] for opts in per_word]
    for i, opts in enumerate(per_word):
        for o in opts[1:] if len(opts) > 1 else []:
            cand = " ".join(first[:i] + [o] + first[i + 1:])
            if cand != chosen and cand not in out:
                out.append(cand)
    base = " ".join(first)
    if base != chosen and base not in out:
        out.insert(len(heard or []), base)
    def page_script(o: str) -> bool:
        return bool(ARABIC.search(o)) and not re.search(r"[A-Za-z]", o) if ui == "ar" else not ARABIC.search(o)
    ok = [o for o in out if page_script(o)]
    return ok[:limit]
