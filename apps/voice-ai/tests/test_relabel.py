"""v1.3.3 : changement de langue sans IA (dictionnaires) ; chaque page dans sa langue, jamais d'écriture mélangée."""
import re

from fastapi.testclient import TestClient

from app import relabel as R
from app.main import app

ARABIC = re.compile(r"[؀-ۿ]")
LATIN = re.compile(r"[A-Za-zÀ-ÿ]")
AR = {"first_name": "هالة", "last_name": "بن صالح", "profession": "عاملة تنظيف", "city": "سوسة",
      "years_experience": "5 سنوات", "price": "20 د.ت", "availability": "كل يوم",
      "spoken_languages": "العربية، الفرنسية", "bio": "بونجور انا هالة نعمل le ménage في سوسة"}
FR = {"first_name": "Hela", "last_name": "Ben Salah", "profession": "Aide ménagère", "city": "Sousse",
      "years_experience": "5 ans", "price": "20 DT", "availability": "tous les jours",
      "spoken_languages": "arabe, français", "bio": "Bonjour, ena Hela, je fais le ménage à Sousse"}


def vals(r):
    return {k: x["value"] for k, x in r["fields"].items()}


def test_arabe_vers_francais_et_anglais():
    for ui, attendu in (("fr", {"first_name": "Hela", "last_name": "Ben Salah", "city": "Sousse", "price": "20 DT",
                                "profession": "Aide ménagère", "spoken_languages": "arabe, français",
                                "availability": "tous les jours"}),
                        ("en", {"city": "Sousse", "price": "20 TND", "years_experience": "5 years", "profession": "Housekeeper"})):
        r = R.relabel(AR, ui, "menage.aide_menagere", ai_fields=list(AR))
        out = vals(r)
        for k, v in attendu.items():
            assert out[k] == v, (ui, k, out[k])
        assert not any(v and ARABIC.search(v) for v in out.values()), out
        assert out["bio"].startswith("Aide ménagère" if ui == "fr" else "Housekeeper")
        assert not any(x["review"] for x in r["fields"].values())          # tout est connu : rien à vérifier


def test_champs_tapes_par_la_personne_aussi_traduits():
    r = R.relabel(FR, "ar", None, ai_fields=[])                           # tout tapé à la main sur la page française
    out = vals(r)
    assert out["first_name"] == "هالة" and out["last_name"] == "بن صالح" and out["city"] == "سوسة"
    assert out["profession"] == "عاملة تنظيف" and out["years_experience"] == "5 سنوات" and out["price"] == "20 د.ت"
    assert not any(v and LATIN.search(v) for k, v in out.items() if k != "bio"), out
    assert r["fields"]["bio"]["review"] and ARABIC.search(out["bio"])     # « À propos » tapé en français : résumé à vérifier


def test_nom_inconnu_devine_a_verifier():
    r = R.relabel({"first_name": "Nadia", "last_name": "Benrekaya"}, "ar")
    assert r["fields"]["first_name"] == {"value": "نادية", "review": False, "original": "Nadia", "alternatives": []}
    assert r["fields"]["last_name"]["value"] == "بنركاية" and r["fields"]["last_name"]["review"]
    assert [R.arabize_name(w) for w in ("Oussama", "Ichraf")] == ["أوسامة", "إشراف"]
    assert R.relabel({"first_name": "شاكر"}, "fr")["fields"]["first_name"] == {"value": "Chaker", "review": False, "original": "شاكر",
                                                                                             "alternatives": []}
    r = R.relabel({"last_name": "بنرقاية"}, "fr")                          # nom inconnu : deviné, à vérifier
    assert r["fields"]["last_name"]["review"] and not ARABIC.search(r["fields"]["last_name"]["value"])


def test_meme_ecriture_rien_ne_change():
    r = R.relabel({"first_name": "Nadia", "bio": "Développeuse à Sousse"}, "en", ai_fields=[])
    assert vals(r) == {"first_name": "Nadia", "bio": "Développeuse à Sousse"} and not any(x["review"] for x in r["fields"].values())


def test_suggestions_reecrites():
    s = R.relabel({}, "fr", None, {"profession": [{"value": "منظف", "label": "منظف", "serviceId": "menage.nettoyage_bureaux"}],
                                   "sector_id": [{"value": "10", "label": "x"}]})["suggestions"]
    assert s["profession"][0]["label"] == "Nettoyage de bureaux" and s["sector_id"][0]["label"]


def test_endpoint_sans_ia(monkeypatch):
    from app import llm
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: (_ for _ in ()).throw(AssertionError("pas d'IA")))
    r = TestClient(app).post("/relabel", json={"values": AR, "uiLocale": "fr", "serviceId": "menage.aide_menagere",
                                               "aiFields": list(AR)}).json()
    assert r["ok"] and r["ai"] is False and r["fields"]["city"]["value"] == "Sousse"


def test_v134_suggestions_visibles_et_propres():
    """Métier sûr : les métiers proches restent proposés ; « عنك » = résumé ; rien de mélangé, sur les 3 pages."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    t = Transcript("bonjour أنا هالة بن صلح نعمل فالل ميناج في سوس vingt dinars l'heure disponible كل نهار cinq ans d'expérience",
                   "hf:codeswitch", "aeb")
    for ui in ("ar", "fr", "en"):
        p, _ = pipeline.build_profile(AsrResult(primary=t, route="hf"), ui)
        assert p["profession"]["status"] == "fill" and p["profession"]["alternatives"], ui
        bio = p["bio"]["value"]
        assert not (LATIN.search(bio) if ui == "ar" else ARABIC.search(bio)), (ui, bio)
    s = R.relabel({}, "en", None, {"profession": [{"value": "تنظيف المكاتب", "label": "تنظيف المكاتب",
                                                   "serviceId": "menage.nettoyage_bureaux"}]})["suggestions"]
    assert s["profession"][0]["label"] == "Office cleaning"                  # la suggestion suit la langue de la page


def test_v135_noms_connus_et_suggestions():
    from app import names, pipeline
    from app.asr import AsrResult, Transcript
    assert R.relabel({"first_name": "باسم"}, "fr")["fields"]["first_name"]["value"] == "Bassem"     # plus « Besem »
    f = R.relabel({"last_name": "بن القاية"}, "fr")["fields"]["last_name"]
    assert f["review"] and f["alternatives"] and all(not ARABIC.search(a) for a in f["alternatives"])
    assert names.alternatives("Benrekaya", "fr", "Benrekaya") == ["Ben Rekaya"]
    # voix : le nom entendu autrement dans l'autre lecture est proposé
    h = Transcript("عسلامة اسمي نادية بن القاية نخدم بسباك عندي خمسة سنين خبرة", "hf:codeswitch", "aeb")
    w = Transcript("اسمي نادية بن الرقايا نخدم بسباك عندي خمسة سنين خبرة", "whisper", "ar", .7)
    p, _ = pipeline.build_profile(AsrResult(primary=h, secondary=w, route="hf"), "ar")
    assert p["last_name"]["value"] == "بن القاية" and p["last_name"]["alternatives"][0]["value"] == "بن الرقاية"
    assert not p["first_name"].get("alternatives")                                  # « نادية » est connu : rien à proposer


def test_v136_mots_francais_en_lettres_arabes():
    from app.arabic_letters import to_arabic_letters as t
    assert t("Bonjour, ena Hela, na3mel le ménage fi Sousse") == "بونجور، أنا هالة، نعمل لو ميناج في سوسة"
    assert t("عندي 5 ans d'expérience") == "عندي 5 آن ديكسبيريونس" and not LATIN.search(t("3andi 7 snin khebra"))


def test_v138_randa_aide_menagere_et_secteur():
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("عسلامة اني رندا التواتي عمري ستة و عشرين سنة نخدم واعية منزلية نخدم كل نهار عندي خمسة سنين خبرة",
                   "hf:codeswitch", "aeb")
    p, _ = pipeline.build_profile(AsrResult(primary=h, route="hf"), "ar")
    assert p["profession"]["value"] == "menage.aide_menagere" and p["sector_id"]["value"] == "10"
    assert not p["sector_id"]["alternatives"]                               # pas de « Technologie » pour une aide ménagère
    r = R.relabel({"profession": "عاملة تنظيف", "years_experience": "5 سنوات", "bio": "x"}, "fr", "OTHER", ai_fields=["bio"])
    assert r["serviceId"] == "menage.aide_menagere" and r["fields"]["bio"]["value"].startswith("Aide ménagère")


def test_v1310_video_hela_beaucoup_de_francais():
    """Cas réel du 12 nov. : la lecture derja a beaucoup de français → « عنك » reste la phrase mot pour mot (lettres arabes)."""
    from app import pipeline
    from app.asr import AsrResult, Transcript
    h = Transcript("bonjour أنا هالة بن صرح نعمل ميناج في سوس vingt dinar l'heure disponible كل نهار cinq ans d'expérience",
                   "hf:codeswitch", "aeb")
    w = Transcript("Bonjour, c'est le ménage Vissous, 20 dinars l'heure, disponible pour 5 ans d'expérience.", "whisper", "fr", .6)
    p, _ = pipeline.build_profile(AsrResult(primary=h, secondary=w, route="hf"), "ar")
    assert p["bio"]["value"].startswith("بونجور أنا هالة") and not LATIN.search(p["bio"]["value"])
    assert p["bio"]["alternatives"][0]["value"].startswith("عاملة تنظيف في سوسة")
    assert p["last_name"]["alternatives"][0]["value"] == "بن صالح"                # « صرح » mal entendu → « صالح » proposé


def test_v1311_a_propos_corrige_a_la_main_suit_la_langue():
    """Cas réel du 12 nov. (Anis) : « À propos » corrigé à la main en français → page anglaise : résumé anglais à vérifier."""
    typed = "Bonjour, je m'appelle Anis Jbelli, je suis électricien à Monastir, 7 ans d'expériences, 30 dinars l'heure."
    f = R.relabel({"bio": typed, "profession": "Électricien", "city": "Monastir", "years_experience": "7 ans"},
                  "en", "batiment.electricite", ai_fields=[])["fields"]["bio"]
    assert f["value"] == "Electrician in Monastir, 7 years of experience." and f["review"] and f["original"] == typed


def test_v142_mots_derja_jamais_pris_pour_du_francais():
    """Cas réel du 12 nov. : « سنوات » ressemblait à « soignante » → « مرافقة مرضى » au lieu de « معينة منزلية »."""
    from app import pipeline, taxonomy
    from app.asr import AsrResult, Transcript
    assert taxonomy.arabized_candidates("عسلامة اسمي راندا التواتي نخدم في سوسة عندي خمسة سنوات خبراء") == []
    for t in ("أنا رندا نخدم معينة منزلية في سوسة", "ena randa ne5dem mou3ina menziliya fi sousse"):
        p, _ = pipeline.build_profile(AsrResult(primary=Transcript(t, "hf:codeswitch", "aeb"), route="hf"), "ar")
        assert p["profession"]["value"] == "menage.aide_menagere", t


def test_v202_prenom_exact_et_plages_de_jours():
    from app import rules
    assert rules._known_name("سامي") == ("Sami", "سامي") and rules._known_name("ساميه")[0] == "Samia"
    from app import pipeline
    from app.asr import AsrResult, Transcript
    for ui, t, want in (("en", "I'm a plumber available Monday to Friday", "Monday to Friday"),
                        ("en", "I'm a plumber available on weekdays", "Monday to Friday"),
                        ("fr", "je suis plombier disponible en semaine", "du lundi au vendredi")):
        p, _ = pipeline.build_profile(AsrResult(primary=Transcript(t, "t", "auto", .9), route="hf"), ui)
        assert p["availability"]["value"] == want, (t, p["availability"]["value"])


def test_v203_plages_arabes_et_creneau_seul():
    """Format écrit par le serveur et par les puces : « من الاثنين إلى السبت », « صباحًا » seul, relus dans les 3 langues."""
    from app import relabel as R
    for txt, fr in (("من الاثنين إلى السبت · مساءً", "du lundi au samedi · soir"), ("صباحًا", "matin")):
        assert R.relabel({"availability": txt}, "fr", None, [], {})["fields"]["availability"]["value"] == fr
