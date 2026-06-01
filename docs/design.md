# Design Principles & Decisions

This document documents key design decisions made during the setup of the project.

## 1. Zero-Modification Policy for Submodules
- **Problem**: The PaddleOCR submodule source code contains hardcoded relative paths and relies on `BOS_URL` environment variables, which can lead to broken image asset links when not running in the original cloud space environment (yielding paths containing `/None/`).
- **Decision**: Avoid modifying the submodule code directly. This keeps the repository clean and pullable.
- **Implementation**:
  - Configured `BOS_URL=examples` in the environment to map the asset links to the local `./examples` folder instead of rendering as `None`.
  - Used Nginx to intercept static asset requests under `/gradio_api/file=/app/PaddleOCR-VL-1.6_Online_Demo/examples/` and serve them directly from a mounted volume for maximum performance.

## 2. Dynamic Port Ingress
- **Problem**: The system needs to run on dynamic ports specified by the user's host environment.
- **Decision**: Expose only a single dynamic port specified in `.env` through the Nginx container, keeping the backend container isolated inside the Docker network.
- **Implementation**: The `.env` variable `PORT` is mapped to the Nginx port. Nginx forwards the Host header with the original port (`$http_host`) to the backend to ensure Gradio maintains correct routing info.

## 3. Fast Python Dependency Management via `uv`
- **Decision**: Utilize `uv` as the package manager instead of traditional pip virtualenvs.
- **Rationale**: `uv` provides exceptionally fast dependency resolution, lockfile synchronization, and project isolation. Both the local script [install.sh](../install.sh) and the [Dockerfile](../Dockerfile) leverage `uv` to maintain reproducible environments.

## 4. Gradio Security & Allowed Paths
- **Problem**: By default, Gradio restricts file accesses outside its system cache directory, raising errors like: `"File ... is not in the cache folder and cannot be accessed."`
- **Decision**: Provide explicit security authorization to Gradio for the application directory.
- **Implementation**: Set `GRADIO_ALLOWED_PATHS=/app/PaddleOCR-VL-1.6_Online_Demo` inside the container and export it in local start scripts so Gradio can safely read and cache the example assets.

## 5. Response-Level Base64 Image Interception
- **Problem**: The PaddleX serving engine returns raw base64 image bytes (without the `data:image/jpeg;base64,` schema prefix) in `outputImages` and `images`. Because of this, the browser fails to render them, treating them as relative HTTP URL paths.
- **Decision**: Avoid patching core submodule libraries or custom frontend logic. Instead, deploy a fast FastAPI proxy directly inside the `pipeline-api` container to rewrite JSON response values dynamically.
- **Implementation**: Set up [pipeline_proxy.py](../scripts/pipeline_proxy.py) on the ingress port `8090` to forward requests to the core engine on port `8091`, modify target base64 image fields, and return correct browser-renderable Data URLs.
