#!/bin/bash
export BOS_URL=examples
export GRADIO_ALLOWED_PATHS="$(pwd)/PaddleOCR-VL-1.6_Online_Demo"
uv run python app.py
