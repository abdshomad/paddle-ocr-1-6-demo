# Issue: vLLM Python Environment Version Leak

## Symptoms
The `vllm-server` container failed to start up due to python dependency mismatches.

## Cause
The docker `COPY . /app` instruction in the Dockerfile copied the host repository files into the container. This copied the host's `.python-version` file (which specified python 3.13) into the container, overwriting the container's pinned python 3.12 environment setup.

## Solution
Modified the Dockerfile to:
1. Explicitly copy specific lockfiles: `pyproject.vllm.toml` and `uv.vllm.lock`.
2. Add a `RUN rm -f .python-version` cleanup layer immediately after copying all files (`COPY . /app`) to ensure the host version file does not leak into the container.
