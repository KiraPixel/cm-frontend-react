# cm-frontend-react Kubernetes manifests

This folder is ready for Argo CD (Kustomize source path: `k8s`).

Required updates before first deploy:

1. `k8s/argocd-application.yaml`: verify `repoURL` if repository URL differs.
2. `k8s/configmap.yaml`: set `API_UPSTREAM` to your backend service URL in cluster.
3. `k8s/service.yaml`: set `port/nodePort` for your environment (default now `32080`).

Notes:

- The frontend expects API at `/api`; nginx in container proxies `/api/*` to `API_UPSTREAM`.
- Health endpoint for probes is `/healthz`.
- External traffic path: `Nginx Proxy Manager -> <node-ip>:32080 -> NodePort service -> Pod`.
- If you manage secrets outside Git (recommended), replace `k8s/secret.yaml` with ExternalSecret/SealedSecret.
