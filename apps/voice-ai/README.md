# voice-ai (internal service)

Turns a short onboarding video (20 s max) into the profile form fields, in the page language (FR / AR / EN).
It runs **only inside our network**: the `apps/ai` worker calls it for `ANALYZE_VIDEO` jobs. The browser never calls it.

```
Next.js ──► Fastify POST /api/v1/ai/jobs (ANALYZE_VIDEO, mediaPath) ──► Redis ──► apps/ai worker
                                                                              └─► voice-ai POST /analyze
```

No cloud API, no API key: speech-to-text runs locally (faster-whisper + a Tunisian derja model).

## Endpoints

| Method | Path                                          | Used by                                                                                                         |
| ------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                                     | Docker / compose healthcheck                                                                                    |
| POST   | `/analyze`                                    | `apps/ai/app/processors/analyze_video.py` (multipart: `media`, `uiLocale`, `field`)                             |
| POST   | `/relabel`                                    | Language switch without AI (dictionaries only)                                                                  |
| POST   | `/classify`                                   | Sector classification (10 official sectors)                                                                     |
| POST   | `/agents/feed`                                | Home feed ranking by the matching agents, when the API runs with `MATCHING_ENGINE=agents` (see `app/agents.py`) |
| GET    | `/taxonomy`, `/form-options`, `/convert-name` | Labels and options in the page language                                                                         |

## Data

- `data/services.json`, `data/places.json`: job catalogue and cities used by the extraction rules.
- The project lead's files are **read from `data/taxonomy/matchyplus_*.csv`** at the monorepo root
  (`TAXONOMY_DIR`), never copied here.
- Models are downloaded by `scripts/download_models.py` into `models/` (ignored by git).

## Run locally

```bash
cd apps/voice-ai
pip install -r requirements-dev.txt
python scripts/download_models.py            # once (internet), Whisper small + LinTO derja
uvicorn app.main:app --port 8001
pytest -q                                     # no model needed: the tests use a fake ASR
```

## Environment variables

| Variable                             | Default                | Role                                |
| ------------------------------------ | ---------------------- | ----------------------------------- |
| `TAXONOMY_DIR`                       | `<repo>/data/taxonomy` | Project lead's CSV files            |
| `MODELS_DIR`                         | `apps/voice-ai/models` | Downloaded speech models            |
| `DERJA_ENGINE`                       | `vosk`                 | `vosk` (light, CPU) or `hf` (GPU)   |
| `WHISPER_DEVICE` / `WHISPER_COMPUTE` | `cpu` / `int8`         | `cuda` / `float16` on GPU           |
| `LLM_MODE`                           | `fallback`             | `off` = rules and dictionaries only |
| `PRELOAD_MODELS`                     | `false`                | Load models at startup              |
| `MAX_UPLOAD_MB`                      | `25`                   | Upload limit                        |
| `DOWNLOAD_MODELS`                    | `true` (Docker)        | Download the models on first start  |
| `WHISPER_SIZE`                       | `small` (Docker)       | Whisper size downloaded in Docker   |

## Docker

`apps/voice-ai/Dockerfile` builds from the monorepo root (it also copies `data/taxonomy`):

```bash
docker build -f apps/voice-ai/Dockerfile -t matchy-voice-ai .
# GPU-quality derja engine (DERJA_ENGINE=hf), several GB more:
docker build -f apps/voice-ai/Dockerfile --build-arg WITH_HF=true -t matchy-voice-ai .
```

Local dev runs it with the other services:

```bash
docker compose -f compose.dev.yaml up -d --build voice-ai
docker compose -f compose.dev.yaml logs -f voice-ai
```

- The first start downloads Whisper + LinTO (~1 GB) into the `saas_voice_ai_models` volume;
  later starts reuse it. The healthcheck allows 10 minutes for that first start.
- The `ai` container calls it on `http://voice-ai:8001`; the API on the host keeps
  `VOICE_AI_URL=http://host.docker.internal:8001` (port 8001 is published).
- Compose variables: `VOICE_AI_WITH_HF` and `VOICE_AI_TORCH_INDEX_URL` (build), `VOICE_AI_DERJA_ENGINE`, `VOICE_AI_HF_ASR_MODEL`,
  `VOICE_AI_SKIP_CPU_WHISPER_WITH_HF`, `VOICE_AI_WHISPER_SIZE`, `VOICE_AI_LLM_MODE`,
  `VOICE_AI_PRELOAD_MODELS`, `VOICE_AI_DOWNLOAD_MODELS`, `VOICE_AI_PORT`.
- Fine-tuned derja Whisper (the quality used in the 2.0.8 tests), on CPU:

  ```bash
  VOICE_AI_WITH_HF=true VOICE_AI_DERJA_ENGINE=hf \
  VOICE_AI_HF_ASR_MODEL=oddadmix/Whisperv3-tunisian-codeswitch \
  VOICE_AI_SKIP_CPU_WHISPER_WITH_HF=false \
  docker compose -f compose.dev.yaml up -d --build voice-ai
  ```

  On CPU the model needs about 8–10 GB of RAM for Docker. On a machine with an NVIDIA GPU, add
  `VOICE_AI_TORCH_INDEX_URL=https://download.pytorch.org/whl/cu124` (CUDA build of torch) and
  give the container the GPU (`gpus: all` in compose, or `nvidia.com/gpu` in Kubernetes).

  Check the model licence before a commercial use.
