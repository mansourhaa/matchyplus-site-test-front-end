# ArgoCD GitOps

ArgoCD watches [github.com/matchy-plus/matchy-plus](https://github.com/matchy-plus/matchy-plus) and syncs Kubernetes manifests from `deploy/k8s/overlays/`.

## GitOps flow

```mermaid
flowchart TD
    GH[GitHub repo] -->|watch branch| Argo[ArgoCD]
    Argo -->|staging branch| Staging[saas-staging app]
    Argo -->|main branch| Prod[saas-production app]
    Staging --> NS1[namespace saas-staging]
    Prod --> NS2[namespace saas-production]
    NS1 --> K8s1[api + app + ai + redis + ingress]
    NS2 --> K8s2[api + app + ai + redis + ingress]
    Secrets[bootstrap-secrets.sh] -.->|manual| NS1
    Secrets -.->|manual| NS2
```

## Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## Bootstrap

```bash
kubectl apply -f deploy/argocd/projects/
kubectl apply -f deploy/argocd/app-of-apps.yaml
```

## Applications

| Application | Git branch | Manifest path | Namespace |
| --- | --- | --- | --- |
| `saas-staging` | `staging` | `deploy/k8s/overlays/staging` | `saas-staging` |
| `saas-production` | `main` | `deploy/k8s/overlays/production` | `saas-production` |

Repository URL in all manifests:

`https://github.com/matchy-plus/matchy-plus.git`

## Sync policy

Applications use automated sync with self-heal and `CreateNamespace=true`.

## Secrets

Create secrets before the first sync:

```bash
./deploy/scripts/bootstrap-secrets.sh saas-staging .env.staging
./deploy/scripts/bootstrap-secrets.sh saas-production .env.production
```

Verify the API secret includes `TRUST_PROXY=true` before syncing so Fastify trusts
forwarded client IPs behind Ingress:

```bash
kubectl -n saas-staging get secret saas-api-env -o jsonpath='{.data.TRUST_PROXY}' | base64 -d && echo
kubectl -n saas-production get secret saas-api-env -o jsonpath='{.data.TRUST_PROXY}' | base64 -d && echo
```

ArgoCD syncs manifests only — it does not create application secrets.
