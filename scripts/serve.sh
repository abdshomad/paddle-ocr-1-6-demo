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

GENAI_HOST="${GENAI_HOST:-0.0.0.0}"
GENAI_PORT="${GENAI_PORT:-8118}"
GENAI_MODEL="${GENAI_MODEL:-PaddleOCR-VL-1.6-0.9B}"
GENAI_BACKEND="${GENAI_BACKEND:-vllm}"
VLLM_CONFIG="${VLLM_CONFIG:-config/vllm_config.yaml}"

if [[ ! -f "${VLLM_CONFIG}" ]]; then
  echo "Missing vLLM config: ${VLLM_CONFIG}" >&2
  exit 1
fi

echo "==> Starting PaddleOCR-VL vLLM service"
echo "    model:   ${GENAI_MODEL}"
echo "    backend: ${GENAI_BACKEND}"
echo "    url:     http://${GENAI_HOST}:${GENAI_PORT}/v1"
echo "    config:  ${VLLM_CONFIG}"

exec uv run paddleocr genai_server \
  --model_name "${GENAI_MODEL}" \
  --host "${GENAI_HOST}" \
  --port "${GENAI_PORT}" \
  --backend "${GENAI_BACKEND}" \
  --backend_config "${VLLM_CONFIG}"
