# Issue: Bad Gateway on port 7872 and vLLM Engine Core OOM

## Symptoms
1. Accessing `http://localhost:7872/` returned a `502 Bad Gateway` error.
2. The `pipeline-api-gpu0` container returned `500 Internal Server Error` during layout-parsing requests, throwing a `RuntimeError: Exception from the 'vlm' worker: Connection error` in its logs.
3. The `vllm-server-gpu0` container was continually crashing and restarting with `RuntimeError: Engine core initialization failed` and a `ValueError` regarding GPU memory.

## Cause
1. **Bad Gateway (Next.js Port Mismatch)**: The `nginx.conf` and template configuration in `scripts/admin_panel.py` routed frontend requests to `http://paddle-ocr-demo:7860` (the old Gradio interface port). However, the container had been migrated to a Next.js UI (`nextjs-ui` target) running on port `3000`.
2. **vLLM Startup Failure (GPU Memory Utilization)**: The vLLM configuration `config/vllm_config.yaml` and default `admin_panel.py` settings specified a GPU memory utilization fraction of `0.95`. On this multi-gpu server, other active OCR demo containers were already using a portion of the GPU memory on GPU 0. Because the free memory on startup was less than the requested 95% of GPU memory, the engine core failed to initialize and threw:
   `ValueError: Free memory on device (38.06/44.39 GiB) on startup is less than desired GPU memory utilization (0.95, 42.17 GiB).`

## Solution
1. **Updated Port Mapping**:
   - Modified [nginx.conf](../nginx.conf) to change the frontend proxy target from `http://paddle-ocr-demo:7860` to `http://paddle-ocr-demo:3000`.
   - Updated the template inside [scripts/admin_panel.py](../scripts/admin_panel.py) so any dynamic updates to the Nginx configuration correctly use port `3000`.
   - Reloaded Nginx using `docker compose exec nginx nginx -s reload`.
2. **Reduced vLLM Memory Utilization**:
   - Updated [config/vllm_config.yaml](../config/vllm_config.yaml) to change `gpu-memory-utilization` from `0.95` to `0.5`. This fits the small 0.9B parameter model comfortably in the available 38 GiB of free memory.
   - Updated the default fallback setting for `gpu_utilization` in [scripts/admin_panel.py](../scripts/admin_panel.py) to `0.5`.
   - Restarted `vllm-server-gpu0` and `pipeline-api-gpu0` containers via `docker compose restart`.
