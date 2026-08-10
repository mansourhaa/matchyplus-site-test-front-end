FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       curl \
       libglib2.0-0 \
       libsm6 \
       libxext6 \
       libxrender1 \
       libxcb1 \
       libgl1 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

FROM base AS runner

RUN groupadd --gid 1001 ai \
  && useradd --system --uid 1001 --gid ai aiuser

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY app ./app
COPY gunicorn.conf.py .

# aiuser has no real home directory; gunicorn's control server falls back to $HOME.
ENV HOME=/tmp

# Chown before the volume mount (see compose.dev.yaml) so Docker copies this ownership
# onto the volume on first use — otherwise it defaults to root and aiuser can't write.
RUN mkdir -p /data/deepface-cache && chown aiuser:ai /data/deepface-cache
ENV DEEPFACE_HOME=/data/deepface-cache

USER aiuser

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["python", "-m", "app.entrypoint"]
