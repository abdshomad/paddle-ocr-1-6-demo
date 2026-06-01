# ==========================================
# Stage 1: GPU Base image
# ==========================================
FROM nvidia/cuda:12.6.0-devel-ubuntu22.04 AS base-gpu

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/.local/bin:$PATH"

# Install system dependencies (libgl and libglib are required for OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh


# ==========================================
# Stage 2: vLLM Server
# ==========================================
FROM base-gpu AS vllm-server
WORKDIR /app

# Install project dependencies using vllm configs
COPY pyproject.vllm.toml ./pyproject.toml
COPY uv.vllm.lock ./uv.lock
RUN uv python pin 3.12 && uv sync --frozen --no-dev

# Install prebuilt flash-attention wheel
ARG FLASH_ATTN_WHEEL=https://github.com/mjun0812/flash-attention-prebuild-wheels/releases/download/v0.3.14/flash_attn-2.8.2+cu128torch2.8-cp312-cp312-linux_x86_64.whl
RUN uv pip install --python .venv "${FLASH_ATTN_WHEEL}"

COPY . /app
COPY pyproject.vllm.toml ./pyproject.toml
COPY uv.vllm.lock ./uv.lock
RUN rm -f .python-version
RUN chmod +x /app/scripts/serve.sh

EXPOSE 8118
CMD ["./scripts/serve.sh"]


# ==========================================
# Stage 3: Pipeline API
# ==========================================
FROM base-gpu AS pipeline-api
WORKDIR /app

# Build paddlepaddle and paddlex virtual env
RUN uv venv .venv-api --python 3.12
RUN uv pip install --python .venv-api paddlepaddle-gpu -i https://www.paddlepaddle.org.cn/packages/stable/cu126/
RUN uv pip install --python .venv-api "paddleocr[doc-parser]>=3.3.0"
RUN uv pip install --python .venv-api "aiohttp>=3.9" "filetype>=1.2" "fastapi>=0.110" "starlette>=0.36" "uvicorn>=0.16" "python-multipart"

COPY . /app
RUN chmod +x /app/scripts/serve-pipeline.sh

EXPOSE 8090
CMD ["./scripts/serve-pipeline.sh"]


# ==========================================
# Stage 4: Next.js UI (Frontend)
# ==========================================
FROM node:20-alpine AS nextjs-ui
WORKDIR /app

# Copy package lockfiles first for caching
COPY PaddleOCR-VL-1.6_NextJS_Demo/package*.json ./
RUN npm ci

# Copy nextjs application source files
COPY PaddleOCR-VL-1.6_NextJS_Demo ./

# Copy PaddleOCR-VL-1.6_Online_Demo examples directory for filesystem API path scanning
COPY PaddleOCR-VL-1.6_Online_Demo/examples ./PaddleOCR-VL-1.6_Online_Demo/examples

# Build production app
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
