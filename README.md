# PaddleOCR VL 1.6 Online Demo Deployment

This repository containerizes and deploys the [PaddleOCR-VL-1.6](https://huggingface.co/spaces/PaddlePaddle/PaddleOCR-VL-1.6_Online_Demo) online demo using a GPU-accelerated multi-service architecture.

## Architecture Overview

The system is deployed using Docker Compose to orchestrate four services:
1. **Nginx Frontend Reverse Proxy**: Serves as the single ingress point on the custom port configured in `.env`. Intercepts static asset queries and serves them directly from cache/submodule files to optimize speed.
2. **Gradio Frontend (`paddle-ocr-demo`)**: Prepares the user interface for loading images and displaying parser visual outputs.
3. **Layout Pipeline (`pipeline-api`)**: Leverages `PaddleX` and GPU resources to detect layouts (via PP-DocLayoutV3), orientation (via PP-LCNet), and unwrap skewed documents (via UVDoc).
4. **vLLM Inference Server (`vllm-server`)**: Accelerates the VLM (PaddleOCR-VL-1.6-0.9B) using the vLLM engine for high-throughput text parsing and recognition.

Check [docs/architecture.md](docs/architecture.md) and [docs/design.md](docs/design.md) for deeper design notes.

## Directory Structure

*   [AGENTS.md](AGENTS.md) - Agent guidelines and command references.
*   [docker-compose.yml](docker-compose.yml) - Main multi-container orchestrator.
*   [Dockerfile](Dockerfile) - Multi-stage build instruction.
*   [nginx.conf](nginx.conf) - Ingress reverse proxy and static asset router.
*   [install.sh](install.sh) - Local setup script (uses `uv`).
*   [run.sh](run.sh) - Local runtime script (uses `uv`).

## Prerequisites

- **NVIDIA GPU** with CUDA support.
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) (to pass GPUs to Docker containers).
- [Docker](https://docs.docker.com/) and **Docker Compose v2**.
- Python 3.12+ and [uv](https://github.com/astral-sh/uv) (for running locally without Docker).

## Getting Started

### 1. Configure the Environment
Create or edit the `.env` file in the root directory:
```env
PORT=7872
```

### 2. Run via Docker Compose
Build and run the GPU-accelerated services:
```bash
docker compose up -d --build
```
This launches the vLLM model engine, pipeline server, UI server, and Nginx proxy. You can access the interface on the port configured in `.env` (e.g. `http://localhost:7872`).

### 3. Run Locally (Development)
To run the Gradio interface locally without Docker (requires connecting to a running pipeline API):
```bash
# Set up dependencies
./install.sh

# Run the frontend app
./run.sh
```