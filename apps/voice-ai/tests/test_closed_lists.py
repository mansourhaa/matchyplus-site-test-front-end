"""Jours, moments et langues dits avec l'article ou « fi » collés (derja) : « العربي », « فالصباح »."""
from app import rules


def test_days_slots_and_languages_with_the_article():
    text = rules.light("نخدم السبت و نخدم الأحد فالصباح نحكي العربي و الفرنساوي و الانقليزي")
    assert rules.availability(text, "ar")["value"] == "السبت، الأحد · صباحًا"
    assert rules.spoken_languages(text, "ar")["value"] == "العربية، الفرنسية، الإنجليزية"


def test_without_the_article_nothing_changes():
    text = rules.light("نخدم السبت والأحد في الصباح ونحكي عربي وفرنسي")
    assert rules.availability(text, "fr")["value"] == "samedi, dimanche · matin"
    assert rules.spoken_languages(text, "fr")["value"] == "arabe, français"
