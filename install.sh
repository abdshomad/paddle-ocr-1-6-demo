#!/bin/bash
[ -f pyproject.toml ] || uv init && uv add -r PaddleOCR-VL-1.6_Online_Demo/requirements.txt requests pillow && uv sync
