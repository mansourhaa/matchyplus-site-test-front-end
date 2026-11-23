"""Tests sans modèle : la transcription et le LLM sont simulés. Lancer : cd voice_ai && pytest -q"""
from __future__ import annotations

import re

import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import asr, extract, llm, rules, taxonomy
from app.config import settings
from app.main import app

client = TestClient(app)


def F(v, e=None):
    return {"value": v, "evidence": e}


@pytest.fixture(scope="session")
def media(tmp_path_factory) -> dict[str, Path]:
    d = tmp_path_factory.mktemp("media")
    files = {
        "ok": (["-f", "lavfi", "-i", "sine=frequency=300:duration=4", "-f", "lavfi", "-i",
                "color=c=blue:s=160x120:d=4", "-shortest", "-c:v", "libvpx", "-c:a", "libopus"], "ok.webm"),
        "long": (["-f", "lavfi", "-i", "sine=frequency=300:duration=25", "-c:a", "libopus"], "long.webm"),
        "silent": (["-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "4", "-c:a", "libopus"], "silent.webm"),
    }
    out = {}
    for key, (args, name) in files.items():
        path = d / name
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args, str(path)], check=True)
        out[key] = path
    (d / "fake.webm").write_text("pas une vidéo")
    out["fake"] = d / "fake.webm"
    return out


TRANSCRIPT = "أهلا أنا سلمى نخدم معينة في الديار في سوسة femme de ménage"


@pytest.fixture
def mode(monkeypatch):
    def set_mode(m: str) -> None:
        monkeypatch.setattr(settings, "llm_mode", m)
    return set_mode


@pytest.fixture(autouse=True)
def _vider_cache_asr():
    """Chaque test repart sans transcription en mémoire (les faux moteurs changent d'un test à l'autre)."""
    from app import pipeline
    pipeline._ASR_CACHE.clear()
    yield
    pipeline._ASR_CACHE.clear()


@pytest.fixture
def fake_asr(monkeypatch):
    result = asr.AsrResult(primary=asr.Transcript(TRANSCRIPT, "linto-vosk-ar-tn", "aeb"),
                           secondary=asr.Transcript("Ahla ana Salma, femme de ménage fi Sousse", "whisper-small", "ar", 0.7),
                           route="derja+whisper")
    monkeypatch.setattr(asr, "transcribe", lambda wav: result)


def profile_raw(ui: str) -> dict:
    ar = ui == "ar"
    return {
        "first_name": F("سلمى" if ar else "Salma", "أنا سلمى"), "last_name": F(None),
        "usage_type": F("provider", "نخدم معينة"), "profession_spoken": F("معينة في الديار", "معينة في الديار"),
        "sector_id": F("10"), "city": F("سوسة" if ar else "Sousse", "في سوسة"),
        "years_experience": F("10", "عشرة سنين"), "price": F(None), "availability": F(None),
        "spoken_languages": F(None), "bio": F("عاملة تنظيف في سوسة." if ar else "Aide ménagère à Sousse."),
    }


# ----------------------------------------------------------------------------- référentiel
@pytest.mark.parametrize("spoken,expected", [
    ("معينة في الديار", "menage.aide_menagere"), ("m3ina fil diar", "menage.aide_menagere"),
    ("fam de ménage", "menage.aide_menagere"), ("نصلح الروبينيات والماء", "batiment.plomberie"),
    ("تريسيان", "batiment.electricite"), ("plombier", "batiment.plomberie"), ("شوفور تاكسي", "transport.taxi"),   # v1.3.8 : le plus précis
])
def test_lexical(spoken, expected):
    cands = taxonomy.lexical_candidates(spoken)
    assert cands and cands[0][0] == expected


def test_plumber_never_cleaning():
    assert all(not c[0].startswith("menage.") for c in taxonomy.lexical_candidates("نصلح الروبينيات"))


def test_ambiguous_goes_to_llm_and_suggests(monkeypatch):
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: {"serviceId": "batiment.plomberie"})
    out = taxonomy.normalize_profession("je répare les robinets et les climatiseurs", "", "fr", extract.status_for)
    assert out["value"] == "batiment.plomberie" and out["status"] == "suggest" and out["alternatives"]


def test_pejorative_label_hidden():
    assert taxonomy.display_label("menage.aide_menagere", "خدامة في الديار", "ar") == "عاملة تنظيف"


# ----------------------------------------------------------------------------- langue de la page
@pytest.mark.parametrize("ui,name,prof_label", [("ar", "سلمى", "عاملة تنظيف"), ("fr", "Salma", "Aide ménagère")])
def test_values_follow_page_language(media, fake_asr, monkeypatch, mode, ui, name, prof_label):
    mode("on")
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: profile_raw(ui))
    with open(media["ok"], "rb") as fh:
        r = client.post("/analyze", files={"media": ("ok.webm", fh, "video/webm")}, data={"uiLocale": ui}).json()
    p = r["profile"]
    # Règle du 5 nov. (demande de Nadia) : un prénom retrouvé dans ce qui a été dit est rempli automatiquement.
    assert r["ok"] and p["first_name"]["value"] == name and p["first_name"]["status"] == "fill"
    assert p["profession"]["value"] == "menage.aide_menagere" and p["profession"]["label"] == prof_label
    assert p["profession"]["status"] == "fill" and p["sector_id"]["value"] == "10"   # 10 secteurs officiels (9 nov.)
    assert p["years_experience"]["status"] == "empty"           # preuve absente de la transcription


def test_wrong_script_never_autofilled(media, fake_asr, monkeypatch, mode):
    mode("on")
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: profile_raw("fr"))    # valeurs latines…
    with open(media["ok"], "rb") as fh:                                           # …sur une page arabe
        p = client.post("/analyze", files={"media": ("ok.webm", fh)}, data={"uiLocale": "ar"}).json()["profile"]
    assert p["city"]["status"] == "suggest"
    # « عنك » peut être rempli, mais seulement avec ce qui a été dit en arabe (jamais les valeurs latines du LLM)
    from app import extract
    assert p["bio"]["status"] == "suggest" or extract.script_ok(p["bio"]["value"], "ar")


def test_field_mode_returns_one_field(media, fake_asr, monkeypatch):
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: profile_raw("fr"))
    with open(media["ok"], "rb") as fh:
        p = client.post("/analyze", files={"media": ("ok.webm", fh)}, data={"uiLocale": "fr", "field": "city"}).json()["profile"]
    assert list(p) == ["city"]


# ----------------------------------------------------------------------------- erreurs média
@pytest.mark.parametrize("key,code,status", [("long", "VIDEO_TOO_LONG", 422), ("silent", "NO_SPEECH_DETECTED", 422),
                                             ("fake", "UNSUPPORTED_MEDIA", 415)])
def test_media_errors(media, key, code, status):
    with open(media[key], "rb") as fh:
        r = client.post("/analyze", files={"media": (media[key].name, fh)}, data={"uiLocale": "fr"})
    assert r.status_code == status and r.json()["error"] == code


def test_ollama_down_degrades_to_rules(media, fake_asr, monkeypatch, mode):
    mode("on")
    def boom(*a, **k):
        raise llm.LlmError("connexion refusée")
    monkeypatch.setattr(llm, "chat_json", boom)
    with open(media["ok"], "rb") as fh:
        r = client.post("/analyze", files={"media": ("ok.webm", fh)}, data={"uiLocale": "fr"})
    body = r.json()
    assert r.status_code == 200 and body["llmError"] == "AI_UNAVAILABLE"
    assert body["profile"]["profession"]["value"] == "menage.aide_menagere"


# ----------------------------------------------------------------------------- mode règles (sans LLM)
RULE_CASES = [
    ("أهلا أنا سلمى نخدم معينة في الديار في سوسة عندي عشرة سنين خبرة", "ar",
     {"first_name": "سلمى", "usage_type": "provider", "city": "سوسة", "years_experience": "10 سنوات"}, "menage.aide_menagere"),
    ("Bonjour, ena Salma, nekhdem femme de ménage fi Sousse, disponible samedi w dimanche, 25 dinars", "fr",
     {"first_name": "Salma", "usage_type": "provider", "city": "Sousse", "price": "25 DT"}, "menage.aide_menagere"),
    ("ena Karim plombier fi Sfax", "ar", {"first_name": "كريم", "city": "صفاقس"}, "batiment.plomberie"),
    ("je m'appelle Mehdi Trabelsi, je suis électricien à Monastir, 10 ans d'expérience", "fr",
     {"first_name": "Mehdi", "last_name": "Trabelsi", "city": "Monastir", "years_experience": "10 ans"}, "batiment.electricite"),
    ("Hi, my name is Karim, I work as a plumber in Sfax", "en", {"first_name": "Karim", "city": "Sfax"}, "batiment.plomberie"),
]


@pytest.mark.parametrize("text,ui,expected,service", RULE_CASES)
def test_rules_only(monkeypatch, mode, text, ui, expected, service):
    mode("off")
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: pytest.fail("le LLM ne doit pas être appelé"))
    result = asr.AsrResult(primary=asr.Transcript(text, "test"))
    profile, info = __import__("app.pipeline", fromlist=["x"]).build_profile(result, ui)
    assert not info["llmCalled"]
    for f, v in expected.items():
        assert profile[f]["value"] == v, (f, profile[f])
    assert profile["profession"]["value"] == service and profile["profession"]["status"] == "fill"
    assert profile["bio"]["value"] and extract.script_ok(profile["bio"]["value"], ui)


def test_fallback_calls_llm_only_when_needed(monkeypatch, mode):
    mode("fallback")
    calls = []
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: calls.append(1) or {"serviceId": "batiment.plomberie"})
    from app.pipeline import build_profile
    build_profile(asr.AsrResult(primary=asr.Transcript("ena Karim plombier fi Sfax", "t")), "fr")
    assert calls == []                                            # règles suffisantes
    build_profile(asr.AsrResult(primary=asr.Transcript("je répare les robinets et les climatiseurs", "t")), "fr")
    assert calls                                                  # métier ambigu → LLM appelé


def test_ambiguous_without_llm_proposes_choices(mode):
    mode("off")
    from app.pipeline import build_profile
    p, _ = build_profile(asr.AsrResult(primary=asr.Transcript("je répare les robinets et les climatiseurs", "t")), "fr")
    assert p["profession"]["status"] == "suggest" and p["profession"]["alternatives"]


def test_customer_detected():
    assert rules.extract_profile("n7eb fam de ménage nhar sebt fi Sahloul", "fr")["usage_type"]["value"] == "customer"


# ----------------------------------------------------------------------------- matching
def test_health_without_ollama():
    h = client.get("/health").json()
    assert h["status"] == "ok" and "ollama" in h


def test_real_colab_case_mecanicien(mode):
    """Cas réel (Colab, 3 nov.) : « Ena Sami, mécanicien fi Sfax, disponible kol nhar » mal transcrit."""
    mode("off")
    from app.pipeline import build_profile
    result = asr.AsrResult(primary=asr.Transcript("نجيكم في صفاقس موش قليل كل نهار", "linto-vosk-ar-tn", "aeb"),
                           secondary=asr.Transcript("Ena, c'est-me, me canisciam fa Sfax disponible con un'har.", "whisper-small", "pt", 0.18))
    p, _ = build_profile(result, "fr")
    assert p["first_name"]["status"] == "empty"                   # plus de « C'est » comme prénom
    assert p["city"]["value"] == "Sfax"
    assert p["availability"]["value"]                              # « كل نهار » = tous les jours
    assert p["profession"]["value"] == "auto.mecanique" and p["profession"]["status"] == "suggest"


def test_router_forces_french_second_pass(monkeypatch):
    """Langue mal détectée (cas réel : « pt 0.18 ») → LinTO + Whisper forcé en français."""
    class FakeWhisper:
        def transcribe(self, wav, language=None):
            if language == "fr":
                return asr.Transcript("Bonjour, ena Hela, je fais le ménage fi Sahloul, 20 dinars l'heure", "whisper-fr", "fr", 1.0)
            return asr.Transcript("Anaela, je fais l'humidité. Anaela. Anaela. Anaela.", "whisper", "pt", 0.18)

    class FakeLinto:
        def transcribe(self, wav):
            return asr.Transcript("je سالوني نشري عندي نهار حذاك", "linto", "aeb")

    monkeypatch.setattr(asr, "_get", lambda name: FakeWhisper() if name == "whisper" else FakeLinto())
    monkeypatch.setattr(asr, "derja_available", lambda: True)
    res = asr.transcribe("x.wav")
    engines = [res.primary.engine, res.secondary.engine] + [x.engine for x in res.extra]
    assert "ménage" in res.primary.text and engines[-1] == "linto" and len(engines) == 3


def test_hela_sentence_rules(mode):
    mode("off")
    from app.pipeline import build_profile
    text = "Bonjour, ena Hela, je fais le ménage fi Sahloul, 20 dinars l'heure"
    p, _ = build_profile(asr.AsrResult(primary=asr.Transcript("je سالوني", "linto"), secondary=asr.Transcript(text, "w")), "ar")
    assert p["first_name"]["value"] == "هالة" and p["city"]["value"] == "سهلول" and p["price"]["value"] == "20 د.ت"
    assert p["profession"]["value"] == "menage.aide_menagere" and p["usage_type"]["value"] == "provider"


def test_real_colab_case_youssef_msa(mode):
    """Cas réel : « مرحبا، اسمي يوسف، أعمل كهربائي في تونس » — Whisper bon, LinTO faible."""
    mode("off")
    from app.pipeline import build_profile
    res = asr.AsrResult(primary=asr.Transcript("مرحبا اسمي يوسف عمل كهربائي في تونس.", "whisper", "ar", 0.82),
                        secondary=asr.Transcript("شروش اسمي يوسف باهي في", "linto"))
    p, _ = build_profile(res, "fr")
    assert p["first_name"]["value"] == "Youssef" and p["last_name"]["status"] == "empty"   # ni « عمل » ni « باهي »
    assert p["profession"]["value"] == "batiment.electricite" and p["city"]["value"] == "Tunis"


def test_ines_sentence(mode):
    mode("off")
    from app.pipeline import build_profile
    text = "Je m'appelle Ines Gharbi, je donne des cours particuliers à Sousse"
    p, _ = build_profile(asr.AsrResult(primary=asr.Transcript(text, "whisper", "fr", 0.95)), "fr")
    assert p["first_name"]["value"] == "Ines" and p["last_name"]["value"] == "Gharbi"
    assert p["profession"]["value"] == "education.cours" and p["city"]["value"] == "Sousse"
    assert p["usage_type"]["value"] == "provider"


def test_no_prompt_leak():
    import inspect
    src = inspect.getsource(asr)
    assert "initial_prompt" not in src and "بلومبي في صفاقس" not in src


def test_real_colab_case_sami_plombier(mode):
    """Cas réel : « Bonjour ena Sami plombier, nsalla7 les robinets w les climatiseurs, disponible kol nhar fi Sousse »."""
    mode("off")
    from app.pipeline import build_profile
    w = "بكم ها. في صوصة Dispony بلومبيين صراحة لربيني والكليماتيزور."
    l = "كومبيزون أحلاهم لبنية يزور سخون النهار فاش باش سكوندة"
    p, _ = build_profile(asr.AsrResult(primary=asr.Transcript(w, "whisper"), secondary=asr.Transcript(l, "linto")), "fr")
    assert p["city"]["value"] == "Sousse"                                   # « صوصة » reconnu
    assert p["profession"]["value"] == "batiment.plomberie" and p["profession"]["status"] == "suggest"
    assert p["profession"]["alternatives"][0]["value"] == "batiment.climatisation"


def test_whisper_gets_numpy_not_pyav_and_falls_back_to_cpu(media, tmp_path, monkeypatch):
    """Whisper reçoit un tableau numpy (pas de PyAV) ; une erreur GPU au calcul bascule sur CPU."""
    import numpy as np
    from types import SimpleNamespace
    from app.media import to_wav
    wav = to_wav(str(media["ok"]), str(tmp_path))
    calls = []

    class FakeModel:
        def __init__(self, device):
            self.device = device
        def transcribe(self, audio, **kw):
            calls.append((self.device, type(audio)))
            if self.device == "cuda":
                raise RuntimeError("Library libcudnn_ops.so.9 is not found")
            return iter([SimpleNamespace(text=" bonjour ")]), SimpleNamespace(language="fr", language_probability=0.9)

    eng = asr.WhisperEngine.__new__(asr.WhisperEngine)
    eng.device, eng.compute, eng.model = "cuda", "float16", FakeModel("cuda")
    monkeypatch.setattr(asr.WhisperEngine, "_load", lambda self: setattr(self, "model", FakeModel(self.device)))
    out = eng.transcribe(wav)
    assert out.text == "bonjour" and eng.device == "cpu"
    assert all(t is np.ndarray for _, t in calls)


def test_nom_avec_particule_ben():
    """« ena Hela Ben Salah » : le nom de famille garde sa particule, dans l'écriture de la page."""
    from app import rules
    _, last_fr = rules.names("Bonjour ena Hela Ben Salah, na3mel le ménage", "fr")
    _, last_ar = rules.names("بونجور أنا هالة بن صالح نعمل الménage", "ar")
    assert last_fr["value"] == "Ben Salah"
    assert last_ar["value"] == "بن صالح"


def test_webm_chrome_sans_duree(tmp_path):
    """Chrome (MediaRecorder) écrit des .webm sans durée : ils doivent être acceptés, durée mesurée sur le WAV."""
    from pathlib import Path
    from app import media
    clip = Path(__file__).parent / "fixtures" / "chrome_sans_duree.webm"
    assert media.probe(str(clip))["duration"] is None
    wav, duration = media.prepare(str(clip), str(tmp_path))
    assert 2.0 < duration < 4.0 and wav.endswith(".wav")


PHRASES_DEMO = [
    # (phrase, page, champs attendus)
    ("Bonjour, ena Hela Ben Salah, na3mel le ménage fi Sousse, 20 dinars l'heure, disponible kol nhar, 5 ans d'expérience.", "ar",
     {"profession": "عاملة تنظيف", "city": "سوسة", "price": "20 د.ت", "availability": "كل يوم", "years_experience": "5 سنوات"}),
    ("Ahla, ena Sami, plombier, nsalla7 les robinets w les fuites d'eau fi Sahloul. 3andi 10 snin khebra, disponible kol nhar, 30 dinars.", "fr",
     {"profession": "Plombier", "city": "Sahloul", "years_experience": "10 ans", "price": "30 DT"}),
    ("عسلامة، أنا كريم، نخدم تريسيان في المساكن، عندي سبعة سنين خبرة، متاح كل نهار، نحكي عربي وفرنساوي.", "ar",
     {"profession": "كهربائي", "city": "مساكن", "years_experience": "7 سنوات", "spoken_languages": "العربية، الفرنسية"}),
    ("مرحبا، اسمي يوسف الطرابلسي، أعمل سائقا في تونس منذ ثماني سنوات، متاح كل يوم، أتحدث العربية والفرنسية والإنجليزية.", "fr",
     {"profession": "Chauffeur", "city": "Tunis", "years_experience": "8 ans", "spoken_languages": "arabe, français, anglais"}),
    ("Hi, my name is Mehdi, I am a mechanic in Monastir, I have twelve years of experience, available every day, I speak Arabic and English.", "ar",
     {"profession": "ميكانيكي", "city": "المنستير", "years_experience": "12 سنة"}),
    ("Bonjour, ena Amel, n9alleb 3la femme de ménage fi Khezama, nest7a9ha kol samedi.", "fr",
     {"usage_type": "customer", "city": "Khezama", "availability": "samedi"}),
]


def test_phrases_de_demo():
    """Les phrases données à Nadia pour tester : le texte entendu doit donner ces champs."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    for phrase, ui, attendu in PHRASES_DEMO:
        profil, _ = pipeline.build_profile(AsrResult(primary=Transcript(phrase, "texte", "auto", .9)), ui)
        for champ, valeur in attendu.items():
            p = profil[champ]
            assert (p.get("label") or p.get("value")) == valeur, (phrase[:30], champ, p)


def test_cas_nadia_arabe_standard():
    """Cas réel : « اسمي يوسف الطرابلسي… » donnait « Yusuf » sur la page arabe, et « عنك » restait vide."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    auto = Transcript("مرحبا، اسمي يوسف الطرابلسي، أعمل سائقاً في تونس منذ ثماني سنوات، متاح كل يوم، أتحدث العربية والفرنسية والإنجليزية.", "w", "ar", .93)
    forced = Transcript("Marhaba, ismi Yusuf al-Tarabulsi, a'malu sa'iqan fi Tunis munzu thamani sanawat.", "w", "fr", .93)
    r = AsrResult(primary=auto, secondary=forced, route="w+w (détecté ar 0.93)")
    ar, _ = pipeline.build_profile(r, "ar")
    assert ar["first_name"]["value"] == "يوسف" and ar["last_name"]["value"] == "الطرابلسي"
    assert ar["profession"]["label"] == "سائق" and ar["bio"]["value"].startswith("مرحبا، اسمي يوسف")   # v1.3.6 : mot pour mot
    assert ar["bio"]["alternatives"][0]["value"].startswith("سائق في تونس")                     # le résumé : en suggestion
    fr, _ = pipeline.build_profile(r, "fr")
    assert fr["first_name"]["value"] == "Youssef" and fr["last_name"]["value"] == "Trabelsi"


def test_bio_jamais_vide_si_on_a_entendu():
    """Cas réel : « عسلامة، أنا كريم، نخدم تريسيان… » remplissait le métier mais laissait « عنك » vide."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    fr = Transcript("Asslema, ana Karim, nekhdem trisien fil Msaken, andi sabaa snin khebra, metah kol nhar.", "w", "fr", .4)
    mix = Transcript("عسلامة أنا كريم نخدم électricien في المساكن عندي سبعة سنين خبرة متاح كل نهار", "w", "ar", .4)
    for r in (AsrResult(primary=fr, route="w (détecté ar 0.4)"), AsrResult(primary=fr, secondary=mix, route="w+w (détecté ar 0.4)")):
        for ui in ("ar", "fr"):
            p, _ = pipeline.build_profile(r, ui)
            assert p["bio"]["value"], (ui, r.route)
            from app import extract
            assert p["bio"]["status"] != "fill" or extract.script_ok(p["bio"]["value"], ui)


def test_cas_nadia_rania_coiffeuse():
    """Cas réel : « coiffeuse » entendu « Kouafouz » / « وفوز », proposé comme nom de famille en latin sur la page arabe."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    ar = Transcript("حسلمة أنا رانياك وفوز ومكياج في مونستير عندي أربع سنين خبرة ديسبوني بكل نهار", "w", "ar", .55)
    fr = Transcript("Ahla, ena Rania Kouafouz w maquillage fi Monastir, 3andi arba snin khebra, disponible kol nhar.", "w", "fr", .55)
    p, _ = pipeline.build_profile(AsrResult(primary=fr, secondary=ar, route="w+w (détecté ar 0.55)"), "ar")
    assert not p["last_name"]["value"]                                   # plus de « Kouafouz »
    assert p["city"]["value"] == "المنستير" and p["years_experience"]["value"] == "4 سنوات"
    assert p["profession"]["status"] == "suggest"                        # coiffeuse OU esthéticienne : la personne choisit


def test_cas_nadia_rania_trois_lectures_reelles():
    """Les 3 lectures exactes de la capture de Nadia (Whisper arabe, Whisper forcé FR, LinTO) sur les 3 pages."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    a = Transcript("حسلمة أنا رانياك وفوز ومكياج في مونستير عندي أربع سنين خبرة ديسبوني بكل نهار", "w", "ar", .6)
    f = Transcript("Je m'appelle Rania Kouafouz et maquillage dans monastère. Il y a eu 4 ans.", "w-fr", "fr", .6)
    l = Transcript("عالسلامة رانيا ريزو ماكياج في منستير عندي أربعة سنين من بلادية نابل", "linto-vosk-ar-tn", "aeb")
    r = AsrResult(primary=a, secondary=f, extra=[l], route="w+w+linto (détecté ar 0.6)")
    attendu = {"ar": ("رانية", "المنستير", "4 سنوات"), "fr": ("Rania", "Monastir", "4 ans"), "en": ("Rania", "Monastir", "4 years")}
    for ui, (prenom, ville, ans) in attendu.items():
        p, _ = pipeline.build_profile(r, ui)
        assert (p["first_name"]["value"], p["city"]["value"], p["years_experience"]["value"]) == (prenom, ville, ans), ui
        assert not p["last_name"]["value"]                         # ni « Kouafouz » ni « ريزو »
        assert {p["profession"]["value"], *[x["value"] for x in p["profession"]["alternatives"]]} >= {"beaute.coiffure"}


PHRASES_DIFFICILES = [
    ("أهلا، أنا مريم، نقعد بالصغار في حمام سوسة، عندي خمسطاش سنة خبرة، نخدم من الاثنين للجمعة الصباح، بعشرة دينارات الساعة.", "fr",
     {"profession": "Garde d'enfants", "city": "Hammam Sousse", "years_experience": "15 ans", "price": "10 DT",
      "availability": "du lundi au vendredi · matin"}),
    ("Asslema, ena Walid Hammami, bannay, nebni w nrakka7 les murs fil Kalaa Kebira, 3andi 3echrin sna khebra, nekhdem kol youm ken el a7ad.", "fr",
     {"profession": "Maçon", "city": "Kalaa Kebira", "years_experience": "20 ans", "availability": "du lundi au samedi"}),
    ("Salut, ena Leila, 3andi mochkla fil climatiseur, n7eb frigoriste ya9ra fi Sahloul, ghodwa fil 3chiya ken possible.", "fr",
     {"usage_type": "customer", "profession": "Frigoriste / climatisation", "city": "Sahloul"}),
    ("Hello, my name is Aymen Ben Ali, I work as delivery driver in Tunis, I have two years experience, I speak Arabic, French and a little English.", "ar",
     {"profession": "عامل توصيل", "last_name": "بن علي", "years_experience": "سنتان"}),
    ("السلام عليكم، اسمي خليل، أعمل نجارا في صفاقس منذ اثنتي عشرة سنة، أصنع الأبواب والخزائن، متاح في المساء.", "fr",
     {"profession": "Menuisier", "city": "Sfax", "years_experience": "12 ans", "availability": "soir"}),
    ("Bonjour, ena Mouna, nnadhef les bureaux w les sociétés fi Tunis, 3andi 6 snin expérience, nekhdem fil lil.", "fr",
     {"profession": "Nettoyage de bureaux", "years_experience": "6 ans", "availability": "soir"}),
]


def test_phrases_difficiles():
    from app import pipeline
    from app.asr import AsrResult, Transcript
    for phrase, ui, attendu in PHRASES_DIFFICILES:
        profil, _ = pipeline.build_profile(AsrResult(primary=Transcript(phrase, "texte", "auto", .9)), ui)
        for champ, valeur in attendu.items():
            p = profil[champ]
            assert (p.get("label") or p.get("value")) == valeur, (phrase[:30], champ, p)


def test_jamais_islandais(media, tmp_path):
    """Cas réel (4 nov.) : derja + français détecté « is » (islandais). On retranscrit dans la meilleure langue autorisée."""
    from types import SimpleNamespace
    from app.media import to_wav
    wav = to_wav(str(media["ok"]), str(tmp_path))
    calls = []

    class FakeModel:
        def transcribe(self, audio, language=None, **kw):
            calls.append(language)
            if language is None:
                info = SimpleNamespace(language="is", language_probability=0.31,
                                       all_language_probs=[("is", 0.31), ("fr", 0.28), ("ar", 0.22), ("en", 0.05)])
                return iter([SimpleNamespace(text="Bún svar, má, Sérénís")]), info
            return iter([SimpleNamespace(text="Bonsoir, moi c'est Anis, je suis peintre")]), SimpleNamespace(language=language, language_probability=1.0)

    eng = asr.WhisperEngine.__new__(asr.WhisperEngine)
    eng.device, eng.compute, eng.model = "cpu", "int8", FakeModel()
    out = eng.transcribe(wav)
    assert calls == [None, "fr"] and out.language == "fr" and out.text.startswith("Bonsoir")


def test_cas_nadia_anis_peintre_mal_entendu():
    """Lecture réelle : « je suis pantre en Batimou… disponible le samedi et le dimanche »."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    f = Transcript("Bonsoir, moi, c'est Elis, je suis pantre en Batimou, nous n'avons pas les appartements au Fils-Ferques, "
                   "ça continue la journée disponible le samedi et le dimanche.", "w-fr", "fr", .5)
    l = Transcript("صفاقس نجمة au maximum of محمد", "linto-vosk-ar-tn", "aeb")
    p, _ = pipeline.build_profile(AsrResult(primary=f, extra=[l], route="w (détecté fr 0.5)"), "fr")
    assert p["profession"]["label"] == "Peintre en bâtiment" and p["city"]["value"] == "Sfax"
    assert p["availability"]["value"] == "samedi, dimanche" and p["usage_type"]["value"] == "provider"


def test_router_modele_codeswitch_en_premier(monkeypatch):
    """Avec le modèle derja code-switching (DERJA_ENGINE=hf), sa lecture passe en premier et tourne toujours."""
    from app.config import settings
    class FakeWhisper:
        def __init__(self, lang, prob): self.lang, self.prob = lang, prob
        def transcribe(self, wav, language=None):
            if language == "fr":
                return asr.Transcript("Bonsoir moi c'est Anis je suis pantre", "whisper-fr", "fr", 1.0)
            return asr.Transcript("Bonsoir moi c'est Anis", "whisper", self.lang, self.prob)

    class FakeHf:
        def transcribe(self, wav):
            return asr.Transcript("بونسوار أنا أنيس، نخدم peintre en bâtiment، ندهن الديار في صفاقس، خمسين دينار النهار", "hf:codeswitch", "aeb")

    monkeypatch.setattr(settings, "derja_engine", "hf")
    monkeypatch.setattr(settings, "hf_asr_model", "oddadmix/Whisperv3-tunisian-codeswitch")
    # Par défaut (5 nov.) : pas de 3e passe « forcée en français » quand le modèle derja tourne (plus rapide).
    for lang, prob, n in (("ar", 0.5, 2), ("fr", 0.9, 2)):
        w = FakeWhisper(lang, prob)
        monkeypatch.setattr(asr, "_get", lambda name, w=w: w if name == "whisper" else FakeHf())
        res = asr.transcribe("x.wav")
        engines = [res.primary.engine] + ([res.secondary.engine] if res.secondary else []) + [x.engine for x in res.extra]
        assert engines[0] == "hf:codeswitch" and len(engines) == n, engines
    from app.pipeline import build_profile
    p, _ = build_profile(res, "ar")
    assert p["profession"]["value"] == "batiment.peinture" and p["city"]["value"] == "صفاقس"
    assert p["bio"]["value"].startswith("بونسوار") and not re.search(r"[A-Za-z]", p["bio"]["value"])   # v1.3.6 : mot pour mot, lettres arabes


def test_hf_engine_recoit_le_son_en_memoire(media, tmp_path, monkeypatch):
    """Le modèle derja reçoit le son déjà lu (numpy, 16 kHz), en arabe, décodage glouton ; transformers 4 ou 5."""
    import sys, types
    import numpy as np
    from app.config import settings
    from app.media import to_wav
    wav = to_wav(str(media["ok"]), str(tmp_path))
    seen = {}

    def fake_pipeline(task, dtype=None, **kw):            # transformers 5 (« dtype »)
        seen["init"] = (task, dtype is not None)
        def run(audio, generate_kwargs=None):
            seen["audio"], seen["gen"] = audio, generate_kwargs
            return {"text": " نخدم peintre في صفاقس "}
        return run

    torch_stub = types.SimpleNamespace(cuda=types.SimpleNamespace(is_available=lambda: False), float16="f16", float32="f32")
    monkeypatch.setitem(sys.modules, "torch", torch_stub)
    monkeypatch.setitem(sys.modules, "transformers", types.SimpleNamespace(pipeline=fake_pipeline))
    monkeypatch.setattr(settings, "hf_asr_model", "oddadmix/Whisperv3-tunisian-codeswitch")
    out = asr.HfEngine().transcribe(wav)
    assert seen["init"] == ("automatic-speech-recognition", True)
    assert isinstance(seen["audio"]["raw"], np.ndarray) and seen["audio"]["sampling_rate"] == 16000
    assert seen["gen"] == {"language": "ar", "task": "transcribe", "num_beams": 1}
    assert out.text == "نخدم peintre في صفاقس" and out.engine == "hf:Whisperv3-tunisian-codeswitch"


def test_cas_nadia_hela_modele_codeswitch():
    """Lecture réelle du modèle code-switching : « … أنا هالة بن صلح نعمل فال ménage في سوسة … » (alif oublié)."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    t = Transcript("Bonjour أنا هالة بن صلح نعمل فال ménage في سوسة شاندي نهار ال heure disponible كل نهار cinq ans d'expérience",
                   "hf:Whisperv3-tunisian-codeswitch", "aeb")
    p, _ = pipeline.build_profile(AsrResult(primary=t, route="hf (détecté ar 0.5)"), "ar")
    assert p["first_name"]["value"] == "هالة" and p["last_name"]["value"] == "بن صالح"
    assert p["profession"]["label"] == "عاملة تنظيف" and p["city"]["value"] == "سوسة" and p["years_experience"]["value"] == "5 سنوات"
    assert p["bio"]["value"].startswith("بونجور أنا هالة") and not re.search(r"[A-Za-z]", p["bio"]["value"])   # v1.3.6
    assert p["bio"]["alternatives"][0]["value"].startswith("عاملة تنظيف في سوسة")              # résumé en suggestion


def test_cas_nadia_hela_trois_lectures_0_9():
    """Lectures réelles (0.9.1) : le modèle code-switching écrit le français en lettres arabes (« سانك » = cinq)."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("bonjour أنا هالة بن صلح نعمل ميناج في سوسة عشرين دينار لار ديسبوني بكل نهار سانك أمور اكسبريونس", "hf:codeswitch", "aeb")
    a = Transcript("المنفوخ الهيلة بالصالح من الملاش في سوسة 20 دينار لير يستخدمكم كل نهار سنة كم الإكسperience", "w", "ar", .5)
    f = Transcript("Je vous remercie de la maison Je vous remercie de la maison 20 dinars l'heure C'est disponible pour vous d'expérience", "w-fr", "fr", 1.0)
    p, _ = pipeline.build_profile(AsrResult(primary=h, secondary=a, extra=[f], route="hf+w+w (détecté ar 0.5)"), "ar")
    got = {k: (p[k].get("label") or p[k]["value"]) for k in ("first_name", "last_name", "profession", "city", "price", "availability", "years_experience")}
    assert got == {"first_name": "هالة", "last_name": "بن صالح", "profession": "عاملة تنظيف", "city": "سوسة",
                   "price": "20 د.ت", "availability": "كل يوم", "years_experience": "5 سنوات"}
    assert p["profession"]["status"] == "fill"


def test_cas_nadia_hela_ville_sous():
    """Lectures réelles : « في سوس » (sans ة) et « le ménage Vissous » (« fi Sousse » collé) → Sousse."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("bonjour أنا هالة بن صالح نعمل ميناج في سوس 20 دينار لواير ديسبونيبل كل نهار 5 أن ديسبيرينس", "hf:codeswitch", "aeb")
    w = Transcript("Bonjour, je suis Hélène Ben Salah, le ménage Vissous, 20 dinars l'heure, disponible pour 5 ans d'expérience.", "w", "fr", .9)
    for ui, ville in (("ar", "سوسة"), ("fr", "Sousse"), ("en", "Sousse")):
        p, _ = pipeline.build_profile(AsrResult(primary=h, secondary=w, route="hf+w (détecté fr 0.9)"), ui)
        assert p["city"]["value"] == ville and p["years_experience"]["value"] and p["price"]["value"], ui


def test_cas_nadia_walid_kalaa_kebira():
    """Lectures réelles (phrase 2) : « فالقلعة لكبيرة » / « القلعة الكبيرة » et le nom « حمامي » après « أنا وليد »."""
    from app import pipeline, rules
    from app.asr import AsrResult, Transcript
    h = Transcript("عسلامة أنا وليد حمامي بناي نبني و نركح les murs فالقلعة لكبيرة عندي عشرين سنة خبرة نخدم كل يوم كان الاحد", "hf:codeswitch", "aeb")
    a = Transcript("انا وليد حمامي بناي نبني في الركح ليمير في القلعة الكبيرة عندي 20 سنة خبرة نخدم كل يوم كان لأحد", "w", "ar", .7)
    r = AsrResult(primary=h, secondary=a, route="hf+w (détecté ar 0.7)")
    ar, _ = pipeline.build_profile(r, "ar")
    fr, _ = pipeline.build_profile(r, "fr")
    assert ar["city"]["value"] == "القلعة الكبرى" and fr["city"]["value"] == "Kalaa Kebira"
    assert ar["last_name"]["value"] == "الحمامي" and fr["last_name"]["value"] == "Hammami"   # nom connu : les deux écritures
    assert fr["availability"]["value"] == "du lundi au samedi" and fr["profession"]["label"] == "Maçon"
    assert rules.names("ena Sami nebni", "fr")[1]["value"] is None                   # un verbe n'est pas un nom


def test_convert_name_pour_changement_de_langue():
    """Nom tapé à la main : « Gharbi » ↔ « الغربي » ; nom inconnu : on ne devine pas."""
    for value, ui, attendu in (("Gharbi", "ar", "الغربي"), ("الغربي", "fr", "Gharbi"), ("Ben Salah", "ar", "بن صالح"),
                               ("حمامي", "fr", "Hammami"), ("Xyzabc", "ar", None)):
        assert client.get("/convert-name", params={"value": value, "ui": ui}).json()["value"] == attendu, value


def test_cas_nadia_ines_soust():
    """Lecture réelle : « …cours particulier à Soust… » → Sousse ; le bio arabe garde la ville."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    t = Transcript("Bonjour, je m'appelle Ines Rabi, je donne du cours particulier à Soust, 3 ans d'expérience.", "whisper-small", "fr", .95)
    p, _ = pipeline.build_profile(AsrResult(primary=t, route="whisper-only (fr 0.95)"), "ar")
    assert p["city"]["value"] == "سوسة" and p["bio"]["value"] == "دروس خصوصية في سوسة، خبرة 3 سنوات."


@pytest.mark.parametrize("field,ui,said,attendu", [
    ("first_name", "ar", ["رندا", "رند", "Rende"], "رندا"),          # cas réel : « Randa » dit seul dans le micro du prénom
    ("first_name", "fr", ["رندا", "رند", "Rende"], "Randa"),
    ("last_name", "ar", ["تواتي", "Touati"], "التواتي"),
    ("profession", "ar", ["خياطة"], "خياطة / خياط"),
    ("spoken_languages", "ar", ["عربي و فرنساوي"], "العربية، الفرنسية"),
    ("spoken_languages", "fr", ["arabe et français"], "arabe, français"),
    ("city", "fr", ["سوسة"], "Sousse"),
])
def test_micro_d_un_seul_champ(field, ui, said, attendu):
    """Micro d'un seul champ : la personne dit seulement le mot, sans phrase autour."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    engines = ["hf:codeswitch", "whisper", "whisper-fr"]
    ts = [Transcript(t, engines[i], "fr" if i == 2 else "ar", .8) for i, t in enumerate(said)]
    r = AsrResult(primary=ts[0], secondary=ts[1] if len(ts) > 1 else None, extra=ts[2:], route="x (détecté ar 0.5)")
    p, _ = pipeline.build_profile(r, ui, field)
    key = list(p)[0]
    assert (p[key].get("label") or p[key]["value"]) == attendu and p[key]["status"] == "fill"


def test_cas_nadia_randa_age_et_noms():
    """Cas réel : « عسلامة آني رندة تواتي نخدم خياطة عندي خمسة سنين خبرة عمري ستة و عشرين سنة ».
    « آني » = je ; l'âge (26 ans) ne doit pas devenir l'expérience ; prénom et nom remplis automatiquement."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("عسلامة آني رندة تواتي نخدم خياطة عندي خمسة سنين خبرة عمري ستة و عشرين سنة", "hf:codeswitch", "aeb")
    for ui, (prenom, nom, ans) in {"ar": ("رندا", "التواتي", "5 سنوات"), "fr": ("Randa", "Touati", "5 ans")}.items():
        p, _ = pipeline.build_profile(AsrResult(primary=h, route="hf (détecté ar 0.5)"), ui)
        assert (p["first_name"]["value"], p["last_name"]["value"], p["years_experience"]["value"]) == (prenom, nom, ans), ui
        assert p["first_name"]["status"] == "fill" and p["last_name"]["status"] == "fill"
    from app import rules
    assert rules.years(rules.light("j'ai 30 ans, 5 ans d'expérience"), "fr")["value"] == "5 ans"


@pytest.mark.parametrize("phrase,ui,attendu,vide", [
    ("Euh… ena… Sami, chnouwa… plombier, w… nekhdem fi Sousse, euh… 3andi 10 snin khebra.", "fr",
     {"first_name": "Sami", "profession": "Plombier", "city": "Sousse", "years_experience": "10 ans"}, ["last_name"]),
    ("إيه… أنا… أنا اسمي سلمى، نخدم… كيفاش نقولها… معينة في الديار، في سهلول، كل نهار.", "ar",
     {"first_name": "سلمى", "profession": "عاملة تنظيف", "city": "سهلول", "availability": "كل يوم"}, ["last_name"]),
    ("Bonjour, ena Yassine, photographe, na3mel les mariages fi Sousse, 3andi 4 snin khebra.", "fr",
     {"profession": "Photographe", "city": "Sousse", "years_experience": "4 ans"}, []),   # ajouté au catalogue (5 nov.)
    ("Ahla, ena Fathi, jardinier, nkhadem les jardins w les villas fil Hammam Sousse, disponible kol nhar.", "fr",
     {"first_name": "Fathi", "city": "Hammam Sousse", "profession": "Jardinier"}, []),
    ("Bonjour, je suis fleuriste à Sousse, 5 ans d'expérience.", "fr",                 # hors liste : écrit tel quel
     {"profession": "Fleuriste", "city": "Sousse", "years_experience": "5 ans"}, ["sector_id"]),
    ("Bonjour, ena Hela, na3mel le ménage fi Tozeur, 20 dinars l'heure, disponible kol nhar.", "fr",
     {"profession": "Aide ménagère", "price": "20 DT"}, ["city"]),                    # ville hors liste : vide, pas fausse
    ("أنا كريم، نخدم تريسيان في قفصة، عندي سبعة سنين خبرة.", "ar",
     {"profession": "كهربائي", "years_experience": "7 سنوات"}, ["city"]),
])
def test_etape3_hesitations_et_hors_liste(phrase, ui, attendu, vide):
    from app import pipeline
    from app.asr import AsrResult, Transcript
    p, _ = pipeline.build_profile(AsrResult(primary=Transcript(phrase, "texte", "auto", .9)), ui)
    for champ, valeur in attendu.items():
        assert (p[champ].get("label") or p[champ]["value"]) == valeur, (champ, p[champ])
    for champ in vide:
        assert not p[champ]["value"] or p[champ]["status"] != "fill", (champ, p[champ])


def test_faux_metiers_evites():
    """« mariage » ≠ « ménage », « expérience » ≠ « faïence », « ménage » ≠ « déménagement »."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    cas = [("بونجور أنا ياسين فوتوغراف نعمل لي ماريياج في سوسة", "ar", "evenements.photographe"),
           ("Bonjour ena Hela, na3mel le ménage fi Sousse", "fr", "menage.aide_menagere"),
           ("Bonjour, je suis fleuriste à Sousse, 5 ans d'expérience.", "fr", "OTHER")]
    for phrase, ui, sid in cas:
        p, _ = pipeline.build_profile(AsrResult(primary=Transcript(phrase, "x", "auto", .9)), ui)
        assert p["profession"]["value"] == sid and p["profession"]["status"] == "fill", (phrase, p["profession"])


def test_cas_nadia_yassine_prenom():
    """Cas réel : « bonjour أنا ياسين photographe … » — « ياسين » ressemblait à « بيسين » (piscine) et était rejeté."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    t = Transcript("bonjour أنا ياسين photographe نعمل les mariages في سوسة عندي أربعة سنين خبرة", "hf:codeswitch", "aeb")
    for ui, prenom in (("ar", "ياسين"), ("fr", "Yassine")):
        p, _ = pipeline.build_profile(AsrResult(primary=t, route="hf (détecté ar 0.5)"), ui)
        assert p["first_name"]["value"] == prenom and p["first_name"]["status"] == "fill", ui
        assert p["profession"]["value"] == "evenements.photographe"


def test_tous_les_prenoms_connus_sont_trouves():
    """Aucun prénom de la liste ne doit être pris pour un métier (en arabe, en arabizi, en français)."""
    from app import lexicon as lx, rules
    for lat, ar in lx.NAMES.items():
        if " " in lat:
            continue
        assert rules.names(f"أنا {ar} نخدم سباك في سوسة", "ar")[0]["value"], ar
        assert rules.names(f"Bonjour, ena {lat}, plombier fi Sousse", "fr")[0]["value"], lat


def test_cas_nadia_chourouk_chaker():
    """Cas réel : « Chourouk Chaker » sur la page anglaise → « Good » (lecture anglaise) au lieu de « Chaker »."""
    from app import pipeline, rules
    from app.asr import AsrResult, Transcript
    h = Transcript("أنا شروق شاكر نخدم خياطة عندي عشرين سنة خبرة", "hf:codeswitch", "aeb")
    w = Transcript("My name is Chourouk Good, I work as a tailor, 20 years of experience.", "whisper", "en", .7)
    r = AsrResult(primary=h, secondary=w, route="hf+w (détecté en 0.7)")
    for ui, attendu in (("en", ("Chourouk", "Chaker")), ("fr", ("Chourouk", "Chaker")), ("ar", ("شروق", "شاكر"))):
        p, _ = pipeline.build_profile(r, ui)
        assert (p["first_name"]["value"], p["last_name"]["value"]) == attendu, ui
    assert rules.names("My name is Sara Good", "en")[1]["value"] is None          # « good » n'est jamais un nom
    assert rules.translit("شاكر") == "Chaker" and rules.translit("بوزيد") == "Bouzid"


def test_cache_meme_voix_transcrite_une_fois(media, monkeypatch):
    """Changer le drapeau renvoie le même enregistrement : la transcription ne doit pas être refaite."""
    from app import pipeline
    calls = []
    def fake(wav):
        calls.append(wav)
        return asr.AsrResult(primary=asr.Transcript("ena Hela, femme de ménage fi Sousse", "w", "fr", .9))
    monkeypatch.setattr(asr, "transcribe", fake)
    pipeline._ASR_CACHE.clear()
    a = pipeline.process_profile(str(media["ok"]), "ar")
    b = pipeline.process_profile(str(media["ok"]), "fr")
    assert len(calls) == 1 and a["profile"]["city"]["value"] == "سوسة" and b["profile"]["city"]["value"] == "Sousse"
    pipeline._ASR_CACHE.clear()


def test_whisper_sur_processeur_pas_attendu(monkeypatch):
    """Cas réel (5 nov.) : Whisper sur processeur = 49 s. Avec le modèle derja sur GPU, on ne l'attend pas."""
    from app.config import settings
    class SlowWhisper:
        device = "cpu"
        def transcribe(self, wav, language=None):
            raise AssertionError("Whisper sur processeur ne doit pas être appelé")
    class FakeHf:
        def transcribe(self, wav):
            return asr.Transcript("عسلامة اسمي طاهر عطية نخدم planpied نصلح الروبينات عندي خمسة سنين خبرة", "hf:codeswitch", "aeb")
    monkeypatch.setattr(settings, "derja_engine", "hf")
    monkeypatch.setattr(settings, "hf_asr_model", "x")
    monkeypatch.setattr(asr, "_get", lambda name: SlowWhisper() if name == "whisper" else FakeHf())
    res = asr.transcribe("x.wav")
    assert res.primary.engine == "hf:codeswitch" and res.secondary is None


def test_cas_nadia_taher_attia_plombier():
    """Lectures réelles : modèle derja « اسمي طاهر عطية نخدم planpied » + Whisper « اسمي طاهراتية … بلومبي »."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("عسلامة اسمي طاهر عطية نخدم planpied نصلح الروبينات عندي خمسة سنين خبرة", "hf:codeswitch", "aeb")
    w = Transcript("اسلامة اسمي طاهراتية نخدم بلومبي نصلح الروبينات عندي خمسة سنين بخبرة", "whisper", "ar", .8)
    r = AsrResult(primary=h, secondary=w, route="hf+w (détecté ar 0.8)")
    for ui, attendu in (("ar", ("طاهر", "عطية", "سبّاك")), ("fr", ("Taher", "Attia", "Plombier")), ("en", ("Taher", "Attia", "Plumber"))):
        p, _ = pipeline.build_profile(r, ui)
        assert (p["first_name"]["value"], p["last_name"]["value"], p["profession"]["label"]) == attendu, ui


def test_jamais_arabe_sur_page_francaise():
    """Cas réel (5 nov.) : « نخدم مهندسة أعلامية » donnait « مهندسه » sur la page française."""
    import re
    from app import pipeline
    from app.asr import AsrResult, Transcript
    cas = {"nadia": "عسلامة اسمي نادية بن رقاية نخدم مهندسة أعلامية عمري ستة و عشرين سنة عندي خمسة سنين خبرة",
           "hors_liste": "أنا سنية نخدم صيدلانية في سوسة عندي ثلاثة سنين خبرة"}
    for nom, phrase in cas.items():
        r = AsrResult(primary=Transcript(phrase, "hf:codeswitch", "aeb"), route="hf (détecté ar 0.5)")
        for ui in ("fr", "en"):
            p, _ = pipeline.build_profile(r, ui)
            for champ, item in p.items():
                for v in [item.get("value"), item.get("label")] + [a.get("label") for a in item.get("alternatives", [])]:
                    assert not (v and re.search(r"[؀-ۿ]", str(v))), (nom, ui, champ, v)
    p, _ = pipeline.build_profile(AsrResult(primary=Transcript(cas["nadia"], "hf:codeswitch", "aeb"), route="x"), "fr")
    assert p["profession"]["label"] == "Ingénieur(e) informatique" and p["years_experience"]["value"] == "5 ans"


def test_cas_nadia_anis_jardinier_en_lettres_arabes():
    """Lecture réelle : « اهلا انا انيس جردنيين نخدم لجردان … » : « jardinier » écrit en lettres arabes.
    Avant : nom = « جردنيين », métier = « لجردان ». Attendu : pas de nom, métier = jardinier."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("اهلا انا انيس جردنيين نخدم لجردان و الفيلا في حمام سوسة ديسبونيبل كل نهار", "hf:codeswitch", "aeb")
    r = AsrResult(primary=h, route="hf (détecté ar 0.5)")
    for ui, (prenom, metier, ville) in {"ar": ("أنيس", "جنايني", "حمام سوسة"), "fr": ("Anis", "Jardinier", "Hammam Sousse"),
                                        "en": ("Anis", "Gardener", "Hammam Sousse")}.items():
        p, _ = pipeline.build_profile(r, ui)
        assert (p["first_name"]["value"], p["profession"]["label"], p["city"]["value"]) == (prenom, metier, ville), ui
        assert not p["last_name"]["value"], ui


def test_cas_nadia_anis_jardinier_mots_francais_en_arabe():
    """Cas réel : le modèle derja écrit « jardinier » = « جردنيين » et « les jardins » = « لجردان »."""
    from app import pipeline, taxonomy
    from app.asr import AsrResult, Transcript
    h = Transcript("اهلا انا انيس جردنيين نخدم لجردان و الفيلا في حمام سوسة ديسبونيبل كل نهار", "hf:codeswitch", "aeb")
    for ui, (prenom, metier, ville) in {"ar": ("أنيس", "جنايني", "حمام سوسة"), "fr": ("Anis", "Jardinier", "Hammam Sousse"),
                                        "en": ("Anis", "Gardener", "Hammam Sousse")}.items():
        p, _ = pipeline.build_profile(AsrResult(primary=h, route="hf (détecté ar 0.5)"), ui)
        assert (p["first_name"]["value"], p["profession"]["label"], p["city"]["value"]) == (prenom, metier, ville), ui
        assert not p["last_name"]["value"]                         # « جردنيين » n'est pas un nom de famille
    # d'autres mots français écrits en arabe ; une ville ou un nom ne deviennent pas des métiers
    assert taxonomy.arabized_candidates("ميناج")[0][0] == "menage.aide_menagere"
    assert taxonomy.arabized_candidates("بلومبي")[0][0] == "batiment.plomberie"
    assert taxonomy.arabized_candidates("مونستير") == []
    assert taxonomy.lexical_candidates("ena Walid Hammami, bannay")[0][0] == "batiment.maconnerie"


def test_cas_nadia_randa_sans_ana():
    """Cas réel du 6 nov. : la phrase commence directement par le prénom, sans « أنا » → prénom et nom vides."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    t = Transcript("رندا تواتي عمري ستة و عشرين سنة نخدم خياطة عندي خمسة سنوات خبرة", "hf", "ar", .9)
    for ui, first, last in (("ar", "رندا", "التواتي"), ("fr", "Randa", "Touati"), ("en", "Randa", "Touati")):
        p, _ = pipeline.build_profile(AsrResult(primary=t, secondary=None, route="hf"), ui)
        assert p["first_name"]["value"] == first and p["first_name"]["status"] == "fill"
        assert p["last_name"]["value"] == last and p["last_name"]["status"] == "fill"
    # Pas de prénom inventé quand la phrase commence par un métier ou une ville.
    from app import rules
    assert rules.names("خياطة في سوسة عندي خمسة سنين", "ar")[0]["value"] is None
    assert rules.names("Plombier à Sousse depuis 5 ans", "fr")[0]["value"] is None
