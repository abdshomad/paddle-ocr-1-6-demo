# Issue: Generic and Dynamic GPU Container Scaling

## Symptoms
1. The project needs to support multi-GPU server deployments dynamically (specifically scaling across 4 to 8 GPUs) without manually editing the static `docker-compose.yml` or `nginx.conf` files.
2. Unchecked or inactive GPUs should not waste system resources or host memory by running idle container instances.
3. The configuration application time needed to be highly optimized; sequential starts/stops of 16 containers caused Nginx `504 Gateway Time-out` errors.

## Cause
1. The previous `docker-compose.yml` had hardcoded definitions for only two GPU services (`gpu0` and `gpu1`), requiring manual modification of both `docker-compose.yml` and the Nginx upstream blocks to utilize 4 or 8 GPUs.
2. Inactive GPU containers were started by default under Docker Compose, staying idle and sleeping instead of being physically stopped to reclaim host resources.
3. Stopping containers via Docker's API socket takes around 10 seconds per container (due to grace shutdown timeouts). Sequential loops over 12+ containers exceeded Nginx's default 60-second connection timeout, resulting in task termination.

## Solution
1. **Generic YAML Anchors**:
   - Recreated [docker-compose.yml](../docker-compose.yml) using YAML anchors (`&vllm-template` and `&pipeline-template`) to abstract the configurations.
   - Defined 8 GPU service instances (`gpu0` through `gpu7`) for both the `vllm-server` and `pipeline-api` components.

2. **Dynamic Nginx Configuration**:
   - Modified [scripts/admin_panel.py](../scripts/admin_panel.py) to dynamically update [nginx.conf](../nginx.conf) when settings are applied.
   - The script builds a dynamic upstream pool `pipeline_api_pool` listing only the active `pipeline-api-gpu{i}` servers.

3. **Active Container Lifecycle Management**:
   - Implemented dynamic start, stop, and restart routines in `admin_panel.py`:
     - Containers corresponding to checked GPU indices are started or restarted to load the new config.
     - Containers corresponding to unchecked GPU indices are physically stopped using `POST /containers/{id}/stop`, freeing host CPU/Memory resources.

4. **Concurrent Execution**:
   - Refactored container startup/shutdown logic to run in parallel using `asyncio.gather`. All 16 container operations are triggered concurrently, reducing execution time to under 10 seconds.
