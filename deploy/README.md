# Deployment

Kubernetes manifests and ArgoCD applications for GitOps deployment.

**Repository:** [github.com/matchy-plus/matchy-plus](https://github.com/matchy-plus/matchy-plus)

This project uses **GitHub Actions** for CI and **Kubernetes + ArgoCD** for GitOps deployment.

## End-to-end deploy flow

```mermaid
flowchart TD
    Push[git push] --> GHA[GitHub Actions]
    GHA --> Lint[lint]
    Lint --> Test[test]
    Test --> Build[build]
    Build --> Images[build & push API App AI images]
    Images --> Argo[ArgoCD detects manifest/image]
    Argo --> K8s[Kubernetes rollout]
    K8s --> Job[migration Job]
    Job --> Pods[api + app + ai + redis pods]
    Pods --> Ingress[Ingress]
    Ingress --> App[saas-app]
    Ingress --> API[saas-api]
    API --> Redis[saas-redis]
    AI[saas-ai] --> Redis
    API --> PG[(PostgreSQL)]
    AI --> PG
    Ingress --> Live[Live traffic]
```

## CI pipeline

Workflows: `.github/workflows/ci.yml`, `.github/workflows/pr-guard.yml`

On every PR to `dev` / `staging` / `main` (and pushes to `main` / `staging`):

1. PR Guard — enforce feature → `dev` → `staging` → `main` topology
2. `pnpm` format check, lint, test, build

On push to `main` or `staging` (after CI passes):

3. Build & push `ghcr.io/matchy-plus/saas-boilerplate-api`
4. Build & push `ghcr.io/matchy-plus/saas-boilerplate-app`
5. Build & push `ghcr.io/matchy-plus/saas-boilerplate-ai`

ArgoCD then deploys the updated images to Kubernetes.

## Layout

```mermaid
flowchart TB
    subgraph deploy
        subgraph k8s
            Base[base/ api app ai redis ingress]
            Staging[overlays/staging]
            Prod[overlays/production]
            Base --> Staging
            Base --> Prod
        end
        subgraph argocd
            Project[projects/]
            Apps[applications/]
            AOA[app-of-apps.yaml]
            Project --> AOA --> Apps
        end
        Scripts[scripts/bootstrap-secrets.sh]
    end
```

```
deploy/
├── k8s/
│   ├── base/                 Shared manifests (api, app, ai, redis, ingress, migration)
│   └── overlays/
│       ├── staging/          Namespace saas-staging
│       └── production/       Namespace saas-production
├── argocd/
│   ├── projects/             ArgoCD project
│   ├── applications/         staging + production Applications
│   └── app-of-apps.yaml      Root Application
└── scripts/
    └── bootstrap-secrets.sh  Create K8s secrets from env files
```

## Container registry

| Image | Tag (staging) | Tag (production) |
| --- | --- | --- |
| `ghcr.io/matchy-plus/saas-boilerplate-api` | `staging` | `production` |
| `ghcr.io/matchy-plus/saas-boilerplate-app` | `staging` | `production` |
| `ghcr.io/matchy-plus/saas-boilerplate-ai` | `staging` | `production` |

Redis runs from the public `redis:7.4-alpine` image (not built by CI).

## Quick start

### 1. Run tests and build images

```bash
pnpm test
pnpm build

docker login ghcr.io -u USERNAME
docker build -t ghcr.io/matchy-plus/saas-boilerplate-api:staging -f apps/api/Dockerfile .
docker build -t ghcr.io/matchy-plus/saas-boilerplate-app:staging -f apps/app/Dockerfile .
docker build -t ghcr.io/matchy-plus/saas-boilerplate-ai:staging -f apps/ai/Dockerfile apps/ai
docker push ghcr.io/matchy-plus/saas-boilerplate-api:staging
docker push ghcr.io/matchy-plus/saas-boilerplate-app:staging
docker push ghcr.io/matchy-plus/saas-boilerplate-ai:staging
```

### 2. Create secrets

```bash
cp .env.staging.example .env.staging
chmod +x deploy/scripts/bootstrap-secrets.sh
./deploy/scripts/bootstrap-secrets.sh saas-staging .env.staging
```

For production:

```bash
cp .env.production.example .env.production
./deploy/scripts/bootstrap-secrets.sh saas-production .env.production
```

### 3. Deploy to Kubernetes

```bash
kubectl apply -k deploy/k8s/overlays/staging
kubectl -n saas-staging wait --for=condition=complete job/saas-api-migrate --timeout=120s
```

### 4. Bootstrap ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f deploy/argocd/projects/
kubectl apply -f deploy/argocd/app-of-apps.yaml
```

ArgoCD syncs from:

- `staging` branch → `deploy/k8s/overlays/staging`
- `main` branch → `deploy/k8s/overlays/production`

## Ingress hosts

| Environment | Frontend | API |
| --- | --- | --- |
| Staging | `staging.saas-boilerplate.io` | `api.staging.saas-boilerplate.io` |
| Production | `app.saas-boilerplate.io` | `api.saas-boilerplate.io` |

Requires an NGINX Ingress Controller (`ingressClassName: nginx`).

## Local staging

```bash
cp .env.staging.example .env.staging
pnpm stage
```

## Full guide

See [doc/setup/deployment.md](../doc/setup/deployment.md).
