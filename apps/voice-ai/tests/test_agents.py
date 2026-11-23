"""Agents 2.0.8 branchés sur les données de l'application (app/agents.py)."""
from fastapi.testclient import TestClient

from app import agents
from app.main import app

ME = {"id": "me", "job": "", "industry": "local_services_trades", "selected_goals": ["Demander un service"],
      "interests": ["Ménage"], "availability_days": ["Sam", "Dim"], "availability_hours": ["morning"],
      "languages": ["ar", "fr"]}
CLEANER = {"id": "c1", "job": "Aide ménagère", "service_type": "Aide ménagère", "industry": "local_services_trades",
           "availability_days": ["Sam"], "availability_hours": ["morning"], "languages": ["ar"], "rating": 4.5,
           "reviews": 12, "distance_km": 2.0, "plan": "FREE"}
PLUMBER = {"id": "p1", "job": "Plombier", "industry": "local_services_trades", "availability_days": ["Lun"],
           "languages": ["fr"], "rating": 4.0, "reviews": 3, "distance_km": 5.0, "plan": "FREE", "video": "/uploads/v.webm"}
DEV = {"id": "d1", "job": "Développeur web", "industry": "tech_digital", "languages": ["en"], "distance_km": 30.0}


def test_classification_reads_the_job_and_the_sector():
    c = agents.classify_profile({"job": "معينة منزلية"})
    assert c["service"] == "menage.aide_menagere"
    assert c["sector"] == "10"
    assert agents.classify_profile({"job": "x", "industry": "tech_digital"})["sector"] == "3"


def test_behaviour_learns_from_swipes_with_the_2_0_8_rules():
    prefs = agents.learn([
        {"direction": "like", "at": "2026-11-19T10:00:00Z", "profile": CLEANER},
        {"direction": "pass", "at": "2026-11-19T10:01:00Z", "profile": DEV},
    ])
    assert prefs["categoryWeights"] == {"10": 1.12, "3": 0.94}
    assert prefs["tagWeights"]["menage.aide_menagere"] == 1.05
    assert prefs["interactionCount"] == 2


def test_feed_ranks_with_the_engine_of_the_chef_and_boosts_the_video():
    out = agents.feed(ME, [DEV, PLUMBER, CLEANER], [], "fr")
    ids = [r["id"] for r in out["results"]]
    assert ids[0] == "c1"                                   # même métier, même secteur, même jour, proche
    assert ids[-1] == "d1"
    assert [d["key"] for d in out["results"][0]["dimensions"]] == [
        "interests", "geo", "goals", "availability", "language", "quality"]
    assert out["sponsored"] == "p1"                         # vidéo de présentation : boost ×3
    assert out["orchestration"]["agents"] == ["comportement", "classification", "matching", "boost"]


def test_likes_raise_the_sector_in_the_ranking():
    neutral = {r["id"]: r for r in agents.feed(ME, [DEV], [], "fr")["results"]}["d1"]
    learned = agents.feed(ME, [DEV], [{"direction": "like", "at": "1", "profile": DEV}] * 3, "fr")
    assert learned["results"][0]["behaviorMultiplier"] > 1
    assert learned["results"][0]["score"] >= neutral["score"]


def test_feed_reuses_the_weights_cached_by_the_api():
    """Poids déjà appris (cache Redis de l'API) : pas besoin des swipes, même résultat."""
    me = {"id": "me", "job": "Client", "selected_goals": ["Demander un service"]}
    cands = [{"id": "p1", "job": "Plombier", "distance_km": 2},
             {"id": "e1", "job": "Électricien", "distance_km": 2}]
    swipes = [{"direction": "like", "at": "2026-11-19T10:00:00Z", "profile": {"id": "z", "job": "Plombier"}}]

    learned = agents.feed(me, cands, swipes)
    assert learned["prefs"]["interactionCount"] == 1

    cached = agents.feed(me, cands, [], prefs=learned["prefs"])
    assert [r["id"] for r in cached["results"]] == [r["id"] for r in learned["results"]]
    assert [r["score"] for r in cached["results"]] == [r["score"] for r in learned["results"]]


def test_feed_ignores_malformed_cached_weights():
    out = agents.feed({"id": "me"}, [{"id": "p1", "job": "Plombier"}], [],
                      prefs={"categoryWeights": "x", "tagWeights": None, "interactionCount": -3})
    assert out["ok"] and out["prefs"]["interactionCount"] == 0


def test_endpoint():
    res = TestClient(app).post("/agents/feed", json={"me": ME, "candidates": [CLEANER], "uiLocale": "ar"})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True and body["results"][0]["id"] == "c1"
