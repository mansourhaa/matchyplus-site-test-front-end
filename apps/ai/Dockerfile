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

FROM base AS runner

RUN groupadd --gid 1001 ai \
  && useradd --system --uid 1001 --gid ai aiuser

# Installed straight into this stage rather than built in a separate "deps"
# stage and copied across. The copy was costing a full duplicate of
# site-packages, which for this service is not small: deepface pulls in
# TensorFlow, tf-keras, onnxruntime and two separate builds of OpenCV.
#
# On 27 Oct 2026 that duplicate is what filled the production host. Build
# main #30 took the root filesystem from 80% to 100% in under five minutes
# and died on this exact instruction:
#
#   > [runner 2/6] COPY --from=deps /usr/local/lib/python3.12/site-packages ...
#   ERROR: failed to copy files: copy file range failed: no space left on device
#
# kubelet then tainted the node and evicted every pod in matchy-prod, and the
# site was down for twenty-four minutes.
#
# The separate stage was buying nothing. It would be worth keeping if the
# install left build tooling behind, but python:3.12-slim compiles none of
# this, every requirement resolves to a prebuilt wheel, and PIP_NO_CACHE_DIR
# is already set in the base stage, so there is no pip cache to strip either.
# requirements.txt is still copied on its own, ahead of the application code,
# so a change under app/ does not reinstall TensorFlow.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

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
