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

The Docker image and the compose service are prepared separately (see the PR description).
