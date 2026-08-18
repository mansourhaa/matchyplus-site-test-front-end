#!/usr/bin/env bash
# Matchy+ console access. Keep the terminal open, Ctrl+C to disconnect.

set -uo pipefail

USER_NAME="${MATCHY_SSH_USER:-khalil}"
HOST="${MATCHY_SSH_HOST:-151.80.235.192}"

KEY="${MATCHY_SSH_KEY:-}"
if [ -z "$KEY" ]; then
  for f in ~/.ssh/matchy-pipline-main ~/.ssh/matchy_console ~/.ssh/id_ed25519 ~/.ssh/id_rsa ~/.ssh/id_ecdsa; do
    [ -r "$f" ] && { KEY="$f"; break; }
  done
fi

if [ -z "$KEY" ] || [ ! -r "$KEY" ]; then
  echo "No SSH key found in ~/.ssh" >&2
  echo "Run with: MATCHY_SSH_KEY=/path/to/key bash $0" >&2
  exit 1
fi

for p in 8090 9090 8443 9091 9095; do
  if command -v ss >/dev/null 2>&1 && ss -tlnH "sport = :$p" 2>/dev/null | grep -q .; then
    echo "Port $p is already in use. Close it and try again." >&2
    exit 1
  fi
done

echo "Connecting to $HOST as $USER_NAME using key $KEY"
echo
echo " Jenkins       http://localhost:8090"
echo " SonarQube    http://localhost:9090"
echo " ArgoCD       https://localhost:8443"
echo " Prometheus   http://localhost:9091"
echo " Alertmanager http://localhost:9095"
echo
echo "Leave this window open. Ctrl+C to disconnect."
echo

exec ssh -N \
  -i "$KEY" \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -L 8090:127.0.0.1:8080 \
  -L 9090:127.0.0.1:9000 \
  -L 8443:127.0.0.1:18443 \
  -L 9091:127.0.0.1:19090 \
  -L 9095:127.0.0.1:19093 \
  "${USER_NAME}@${HOST}"