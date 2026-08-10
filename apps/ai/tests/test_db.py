from app.db import _strip_prisma_only_params


def test_strip_prisma_only_params_removes_schema():
    url = "postgresql://postgres:postgres@host:5432/saas_db?schema=public"
    assert _strip_prisma_only_params(url) == "postgresql://postgres:postgres@host:5432/saas_db"


def test_strip_prisma_only_params_keeps_other_query_params():
    url = "postgresql://postgres:postgres@host:5432/saas_db?schema=public&sslmode=require"
    assert _strip_prisma_only_params(url) == (
        "postgresql://postgres:postgres@host:5432/saas_db?sslmode=require"
    )


def test_strip_prisma_only_params_is_a_noop_without_schema():
    url = "postgresql://postgres:postgres@host:5432/saas_db"
    assert _strip_prisma_only_params(url) == url
