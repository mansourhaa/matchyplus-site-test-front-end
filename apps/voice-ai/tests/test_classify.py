"""Agent classification : nourri par les fichiers du chef de projet (data/taxonomy/ du monorepo)."""
from fastapi.testclient import TestClient

from app import classify as C
from app.main import app


def test_plombier_derja_secteur_10():
    r = C.classify({"main_job_service": "plombier", "about": "nekhdem plombier w nsalla7 chauffe-eau fi Sousse"}, "fr")
    assert r["sector_id"] == 10 and r["status"] == "fill"
    assert any(c["concept_id"] == "S10-C02" for c in r["concepts"])
    assert r["sector_label"] == "Services Locaux & Artisanat"


def test_enseignante_arabe_secteur_8_libelle_arabe():
    r = C.classify({"main_job_service": "معلّم", "about": "اسمي آمنة نقري دروس خصوصية و نعطي formation"}, "ar")
    assert r["sector_id"] == 8 and r["sector_label"] == "التعليم والتدريب"


def test_developpeur_saas_secteur_3():
    r = C.classify({"main_job_service": "développeur web", "interests_services": "SaaS"}, "en")
    assert r["sector_id"] == 3


def test_prefixe_arabe_colle():
    hits = C.tag_hits({"about": "نخدم في السباكة والكهرباء"})
    assert {h["concept_id"] for h in hits} & {"S10-C02"}               # « والسباكة » / « السباكة » → سباكة


def test_objectif_derja_trouver_emploi():
    r = C.classify({"main_goals": "nal9a 5edma"}, "fr")
    assert any(g["concept_id"] == "GEN-C01" for g in r["goals"])


def test_rien_a_classer():
    r = C.classify({"about": "   "}, "fr")
    assert r["status"] == "empty" and r["sector_id"] is None


def test_jamais_vu_le_test_et_reste_juste():
    """Garde-fou : sur les 40 exemples de test (jamais appris), au moins 95 % de bons premiers choix."""
    rows = [r for r in C.data()["training"] if r["split"] == "test"]
    ok = sum(C.classify({"about": r["transcript"]})["alternatives"][0]["sector_id"] == int(r["sector_id"]) for r in rows)
    assert ok / len(rows) >= 0.95


def test_rempli_automatiquement_seulement_si_sur():
    """Ce qui est rempli sans demander doit être juste (validation)."""
    rows = [r for r in C.data()["training"] if r["split"] == "validation"]
    filled = [(C.classify({"about": r["transcript"]}), int(r["sector_id"])) for r in rows]
    filled = [(c, g) for c, g in filled if c["status"] == "fill"]
    assert filled and all(c["sector_id"] == g for c, g in filled)


def test_endpoint_classify():
    res = TestClient(app).post("/classify", json={"fields": {"main_job_service": "سباك"}, "uiLocale": "ar"})
    assert res.status_code == 200 and res.json()["sector_id"] == 10


# --- 9 nov. : le formulaire passe aux 10 secteurs officiels ---------------------------------------------------------
def test_taxonomie_dix_secteurs_officiels():
    from app.matching import service_catalog
    t = service_catalog("ar")
    assert [s["id"] for s in t["sectors"]] == [str(i) for i in range(1, 11)]
    assert t["sectors"][9]["label"] == "الخدمات المحلية والحرف"
    assert all(s["sector"] in {str(i) for i in range(1, 11)} for s in t["services"])


def _profil(phrase, ui="fr"):
    from app import pipeline
    from app.asr import AsrResult, Transcript
    return pipeline.build_profile(AsrResult(primary=Transcript(phrase, "texte", "auto", .9)), ui)


def test_metier_connu_garde_son_secteur():
    p, info = _profil("Bonjour, ena Sami, plombier fi Sousse, 3andi 10 snin khebra.")
    assert p["sector_id"]["value"] == "10" and p["sector_id"]["status"] == "fill"
    assert any(c["concept_id"] == "S10-C02" for c in info["classification"]["concepts"])


def test_metier_hors_catalogue_secteur_par_agent():
    p, _ = _profil("Je suis agriculteur, je cultive des oliviers et j'élève des moutons à Sfax.")
    assert p["sector_id"]["value"] == "6" and p["sector_id"]["source"] == "classification"
    p, _ = _profil("أنا مستشار قروض في بنك، نعاون الناس على التمويل والتأمين", "ar")
    assert p["sector_id"]["value"] == "4" and p["sector_id"]["label"] == "التمويل والتأمين"


def test_pas_de_secteur_invente():
    p, _ = _profil("Bonjour, je suis fleuriste à Sousse, 5 ans d'expérience.")
    assert not p["sector_id"]["value"] or p["sector_id"]["status"] != "fill"


def test_metier_du_catalogue_decide_le_secteur():
    """Le dictionnaire du chef ne contient pas tous nos métiers : un métier exact du catalogue fixe le secteur."""
    from app.classify import classify
    for job, sector in (("femme de ménage", 10), ("mécanicien", 10), ("chauffeur", 9), ("plombier", 10), ("développeur web", 3)):
        r = classify({"main_job_service": job})
        assert (r["sector_id"], r["status"]) == (sector, "fill"), job
