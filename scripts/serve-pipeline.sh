#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

unset VIRTUAL_ENV

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Filter visible GPUs dynamically based on INSTANCE_GPU pinning
ALLOWED_GPUS="${CUDA_VISIBLE_DEVICES:-}"
if [[ -n "${INSTANCE_GPU:-}" ]]; then
  if [[ ",${ALLOWED_GPUS}," == *",${INSTANCE_GPU},"* || "${ALLOWED_GPUS}" == "all" || -z "${ALLOWED_GPUS}" ]]; then
    export CUDA_VISIBLE_DEVICES="${INSTANCE_GPU}"
    echo "==> Instance GPU ${INSTANCE_GPU} is enabled. Running on GPU ${CUDA_VISIBLE_DEVICES}."
  else
    echo "==> Instance GPU ${INSTANCE_GPU} is not in allowed list (${ALLOWED_GPUS}). Putting instance to sleep."
    while true; do sleep 3600; done
  fi
fi

PIPELINE_CONFIG="${PIPELINE_CONFIG:-config/pipeline_config_vllm.yaml}"
PIPELINE_HOST="${PIPELINE_HOST:-0.0.0.0}"
PIPELINE_PORT="${PIPELINE_PORT:-8090}"
PIPELINE_DEVICE="${PIPELINE_DEVICE:-gpu:0}"
VENV=".venv-api"

# Check if VLLM_SERVER_URL is provided to override the url in the config
if [[ -n "${VLLM_SERVER_URL:-}" ]]; then
  echo "==> Overriding VLLM server URL with ${VLLM_SERVER_URL}"
  TEMP_CONFIG=$(mktemp /tmp/pipeline_config_XXXXXX.yaml)
  cp "${PIPELINE_CONFIG}" "${TEMP_CONFIG}"
  sed -i "s|server_url:.*|server_url: ${VLLM_SERVER_URL}|g" "${TEMP_CONFIG}"
  PIPELINE_CONFIG="${TEMP_CONFIG}"
  trap 'rm -f "${TEMP_CONFIG}"' EXIT
fi

if [[ ! -d "${VENV}" ]]; then
  echo "Missing ${VENV}. Run ./scripts/install-pipeline.sh first." >&2
  exit 1
fi

if [[ ! -f "${PIPELINE_CONFIG}" ]]; then
  echo "Missing pipeline config: ${PIPELINE_CONFIG}" >&2
  exit 1
fi

echo "==> Starting real PaddleX pipeline server on 127.0.0.1:8091"
"${ROOT}/${VENV}/bin/paddlex" --serve \
  --pipeline "${PIPELINE_CONFIG}" \
  --host "127.0.0.1" \
  --port "8091" \
  --device "${PIPELINE_DEVICE}" &
PADDLEX_PID=$!

echo "==> Starting pipeline proxy on ${PIPELINE_HOST}:${PIPELINE_PORT}"
export REAL_PIPELINE_URL="http://127.0.0.1:8091"
"${ROOT}/${VENV}/bin/python" "${ROOT}/scripts/pipeline_proxy.py" &
PROXY_PID=$!

cleanup() {
  echo "Terminating services..."
  kill -TERM "$PADDLEX_PID" "$PROXY_PID" 2>/dev/null || true
  wait "$PADDLEX_PID" "$PROXY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait "$PROXY_PID"

