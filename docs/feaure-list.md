# Project Feature List

This document lists all current features and capabilities of the containerized PaddleOCR VL 1.6 Online Demo repository.

## 1. Interactive Web Interface (Gradio Frontend)
- **Document Parsing View**: Process complex multi-page documents to retrieve structured layouts.
- **Targeted Recognition Modes**: Select specific parsing options:
  - **Text Recognition (OCR)**: Extract plain text.
  - **Formula Recognition**: Extract mathematical equations in LaTeX format.
  - **Table Recognition**: Parse and structure table grids.
  - **Chart Recognition**: Extrapolate tabular structured information from charts and plots.
  - **Spotting & Seal Recognition**: Identify and locate seals, stamps, and key signature regions.
- **Dynamic Examples Galleries**: Pre-loaded examples for targeted, complex, and spotting recognition modes.
- **Markdown & LaTeX Previewer**: Built-in rendering of markdown text along with formatted mathematical expressions (using KaTeX/MathJax delimiters).

## 2. Ingress & Asset Serving (Nginx)
- **Unified Port Access**: Single-port reverse proxy utilizing the host configuration defined in [.env](../.env).
- **Static File Serving**: Bypasses Python execution entirely to serve example images directly via Nginx using Docker volume mounts.
- **Websocket Upgrade**: Pre-configured header upgrades to support Gradio's real-time events and queues.

## 3. Layout Analysis & Document Preprocessing (PaddleX)
- **Layout Detection**: Utilizes PP-DocLayoutV3 to partition pages into headings, paragraphs, tables, images, and formulas.
- **Orientation Correction**: Automatically detects and adjusts text orientation using PP-LCNet.
- **Unwarping (UVDoc)**: Automatically corrects perspective warp, page fold curvatures, and camera distortions on captured pages.
- **Base64 Image Data URL Converter**: Fast proxy translation layer that intercepts API responses and formats raw base64 output layout images into web-renderable Data URLs.

## 4. High-Performance Model Engine (vLLM)
- **Model Server**: Runs PaddleOCR-VL-1.6-0.9B Vision-Language Model on CUDA devices.
- **Inference Optimization**: Leverages the vLLM engine for optimized memory utilization, dynamic batching, and key-value (KV) caching.

## 5. Dependency Management (uv)
- **Fast Environment Configuration**: Bootstraps the local and container Python environments using the high-performance package manager `uv`.
- **Environment Separation**: Uses separate configuration files for local frontend execution ([pyproject.toml](../pyproject.toml)) and the model server ([pyproject.vllm.toml](../pyproject.vllm.toml)) to prevent package dependency conflicts.

## 6. Local & Docker Workflows
- **One-Command Setup**: Minimal execution scripts:
  - [install.sh](../install.sh): Installs dependencies.
  - [run.sh](../run.sh): Starts the frontend local server.
- **Model Cache Persistence**: Persistent named volumes (`paddleocr_hf_cache`, `paddleocr_paddle_cache`, etc.) are configured to prevent redownloading checkpoints across compose restarts.
