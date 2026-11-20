# voice-ai: speech → onboarding form fields, and the matching agents (apps/voice-ai).
#
# Build context is the monorepo root, like the api/app images, because the service reads
# the project lead's CSV files from data/taxonomy/ (never copied into apps/voice-ai):
#
#   docker build -f apps/voice-ai/Dockerfile -t matchy-voice-ai .
#
# Same layout as apps/ai/Dockerfile: python:3.12-slim, one stage (every requirement is a
# prebuilt wheel, so a separate deps stage would only duplicate site-packages), non-root
# user, healthcheck on /health.
#
# Speech models are NOT baked into the image (~1 GB). They are downloaded once into
# /models on first start (scripts/docker_entrypoint.py) and kept on a volume, the same way
# apps/ai keeps the DeepFace weights in saas_ai_deepface_cache. DOWNLOAD_MODELS=false skips
# the download (e.g. a cluster without internet, with the volume filled beforehand).

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ffmpeg / ffprobe: audio extraction and duration checks (app/media.py). curl: healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       curl \
       ffmpeg \
  && rm -rf /var/lib/apt/lists/*

FROM base AS runner

RUN groupadd --gid 1001 voiceai \
  && useradd --system --uid 1001 --gid voiceai voiceaiuser

# requirements.txt first, so a change under app/ does not reinstall the speech libraries.
COPY apps/voice-ai/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Optional fine-tuned derja Whisper (DERJA_ENGINE=hf, HF_ASR_MODEL=...): needs torch +
# transformers, several GB, so it is off by default. CPU wheels of torch by default; on a
# machine with an NVIDIA GPU, build with the CUDA wheels so the model runs on the GPU:
#   --build-arg TORCH_INDEX_URL=https://download.pytorch.org/whl/cu124
ARG WITH_HF=false
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
RUN if [ "$WITH_HF" = "true" ]; then \
      pip install --index-url "$TORCH_INDEX_URL" torch \
      && pip install "transformers>=4.44"; \
    fi

COPY apps/voice-ai/app ./app
COPY apps/voice-ai/data ./data
COPY apps/voice-ai/scripts ./scripts
COPY data/taxonomy ./taxonomy

# voiceaiuser has no real home directory.
ENV HOME=/tmp

# Chown before the volume mount (see compose.dev.yaml) so Docker copies this ownership onto
# the volume on first use — otherwise it defaults to root and voiceaiuser can't write.
RUN mkdir -p /models && chown voiceaiuser:voiceai /models
ENV MODELS_DIR=/models \
    HF_HOME=/models/huggingface \
    TAXONOMY_DIR=/app/taxonomy \
    DATA_DIR=/app/data \
    LLM_MODE=off \
    VOICE_AI_PORT=8001

USER voiceaiuser

EXPOSE 8001

# Long start period: the first start downloads the models before the server listens.
HEALTHCHECK --interval=15s --timeout=5s --start-period=600s --retries=5 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "scripts/docker_entrypoint.py"]
