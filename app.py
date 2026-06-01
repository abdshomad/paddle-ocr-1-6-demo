import base64
import io
import json
import os
from typing import Dict, List, Tuple, Any, Optional
import time
import requests
from PIL import Image
import gradio as gr
import re
from urllib.parse import urlparse

# ==========================================
# Config & Paths
# ==========================================
API_URL = os.environ.get("API_URL", "http://localhost:8000/layout-parsing")
TOKEN = os.environ.get("TOKEN")
GOOGLE_FONTS_URL = "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap' rel='stylesheet'>"
LATEX_DELIMS = [
    {"left": "$$", "right": "$$", "display": True},
    {"left": "$",  "right": "$",  "display": False},
    {"left": "\\(", "right": "\\)", "display": False},
    {"left": "\\[", "right": "\\]", "display": True},
]
AUTH_HEADER = {"Authorization": f"bearer {TOKEN}"} if TOKEN else {}
JSON_HEADERS = {**AUTH_HEADER, "Content-Type": "application/json"} if AUTH_HEADER else {"Content-Type": "application/json"}
JSON_HEADERS["Client-Platform"] = "huggingface-demo"

# Resolve assets from submodule directory if running from root
LOGO_IMAGE_PATH = "./assets/logo.jpg"
if not os.path.exists(LOGO_IMAGE_PATH):
    LOGO_IMAGE_PATH = "PaddleOCR-VL-1.6_Online_Demo/assets/logo.jpg"

# Submodule example path mappings
TARGETED_EXAMPLES_DIR = "PaddleOCR-VL-1.6_Online_Demo/examples/targeted"
COMPLEX_EXAMPLES_DIR = "PaddleOCR-VL-1.6_Online_Demo/examples/complex"
SPOTTING_EXAMPLES_DIR = "PaddleOCR-VL-1.6_Online_Demo/examples/spotting"

# ==========================================
# Path Resolution Helper
# ==========================================
def resolve_file_path(path: str) -> str:
    """Resolve file path to submodule structure if running from root directory."""
    if not os.path.exists(path):
        # Check if path starts with examples/ or assets/ and try resolving
        for prefix in ["examples/", "assets/"]:
            if path.startswith(prefix) or f"./{prefix}" in path:
                cleaned = path.replace("./", "")
                alt_path = os.path.join("PaddleOCR-VL-1.6_Online_Demo", cleaned)
                if os.path.exists(alt_path):
                    return alt_path
    return path

# ==========================================
# Base64 & Examples
# ==========================================
def image_to_base64_data_url(filepath: str) -> str:
    try:
        filepath = resolve_file_path(filepath)
        ext = os.path.splitext(filepath)[1].lower()
        mime_types = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp"
        }
        mime_type = mime_types.get(ext, "image/jpeg")
        with open(filepath, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"Error encoding image to Base64: {e}")
        return ""

def _escape_inequalities_in_math(md: str) -> str:
    _MATH_PATTERNS = [
        re.compile(r"\$\$([\s\S]+?)\$\$"),
        re.compile(r"\$([^\$]+?)\$"),
        re.compile(r"\\\[([\s\S]+?)\\\]"),
        re.compile(r"\\\(([\s\S]+?)\\\)"),
    ]

    def fix(s: str) -> str:
        s = s.replace("<=", r" \le ").replace(">=", r" \ge ")
        s = s.replace("≤", r" \le ").replace("≥", r" \ge ")
        s = s.replace("<", r" \lt ").replace(">", r" \gt ")
        return s

    for pat in _MATH_PATTERNS:
        md = pat.sub(lambda m: m.group(0).replace(m.group(1), fix(m.group(1))), md)
    return md

def _get_examples_from_dir(dir_path: str) -> List[List[str]]:
    BASE_URL = os.environ.get("BOS_URL", "examples")
    supported_exts = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
    examples = []
    if not os.path.exists(dir_path):
        print(f"Warning: example dir {dir_path} not found.")
        return []
    for filename in sorted(os.listdir(dir_path)):
        ext = os.path.splitext(filename)[1].lower()
        if ext in supported_exts:
            subdir = os.path.basename(dir_path.rstrip("/"))
            img_url = f"{BASE_URL}/{subdir}/{filename}"
            examples.append([img_url])
    return examples

# ==========================================
# Load Examples
# ==========================================
targeted_recognition_examples = _get_examples_from_dir(TARGETED_EXAMPLES_DIR)
complex_document_examples = _get_examples_from_dir(COMPLEX_EXAMPLES_DIR)
spotting_recognition_examples = _get_examples_from_dir(SPOTTING_EXAMPLES_DIR)

# ==========================================
# UI Helpers
# ==========================================
def render_uploaded_image_div(path_or_url: str) -> str:
    if not path_or_url:
        return ""
    is_url = isinstance(path_or_url, str) and path_or_url.startswith(("http://", "https://"))
    if is_url:
        src = path_or_url
    else:
        src = image_to_base64_data_url(path_or_url)
    return f"""
    <div class="uploaded-image">
        <img src="{src}" alt="Preview image" style="width:100%;height:100%;object-fit:contain;" loading="lazy"/>
    </div>
    """

def update_preview_visibility(path_or_url: Optional[str]) -> Dict:
    if path_or_url:
        html_content = render_uploaded_image_div(path_or_url)
        return gr.update(value=html_content, visible=True)
    else:
        return gr.update(value="", visible=False)

# ==========================================
# API Logic
# ==========================================
def _file_to_b64_image_only(path_or_url: str) -> Tuple[str, int]:
    if not path_or_url:
        raise ValueError("Please upload an image first.")

    is_url = isinstance(path_or_url, str) and path_or_url.startswith(("http://", "https://"))
    content: bytes
    if is_url:
        r = requests.get(path_or_url, timeout=600)
        r.raise_for_status()
        content = r.content
        ext = os.path.splitext(urlparse(path_or_url).path)[1].lower()
    else:
        path_or_url = resolve_file_path(path_or_url)
        ext = os.path.splitext(path_or_url)[1].lower()
        with open(path_or_url, "rb") as f:
            content = f.read()

    return base64.b64encode(content).decode("utf-8"), 1

def _call_api(api_url: str, path_or_url: str, use_layout_detection: bool,
              prompt_label: Optional[str], use_chart_recognition: bool = False,
              use_doc_unwarping: bool = True, use_doc_orientation_classify: bool = True) -> Dict[str, Any]:
    is_url = isinstance(path_or_url, str) and path_or_url.startswith(("http://", "https://"))
    if is_url:
        payload = {
            "file": path_or_url,
            "matchHistoryJob": False,
            "useLayoutDetection": bool(use_layout_detection),
            "useDocUnwarping": use_doc_unwarping,
            "useDocOrientationClassify": use_doc_orientation_classify
        }
    else:
        b64, file_type = _file_to_b64_image_only(path_or_url)
        payload = {
            "file": b64,
            "matchHistoryJob": False,
            "useLayoutDetection": bool(use_layout_detection),
            "fileType": file_type,
            "useDocUnwarping": use_doc_unwarping,
            "useDocOrientationClassify": use_doc_orientation_classify
        }
    if not use_layout_detection:
        if not prompt_label:
            raise ValueError("Please select a recognition type.")
        payload["promptLabel"] = prompt_label.strip().lower()
    if use_layout_detection and use_chart_recognition:
        payload["useChartRecognition"] = True

    try:
        print(f"Sending API request to {api_url}...")
        print(f"Payload: {json.dumps(payload, ensure_ascii=False, default=str)[:2000]}")
        resp = requests.post(api_url, json=payload, headers=JSON_HEADERS, timeout=600)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(e)
        raise gr.Error(f"API request failed: {e}") 

    if data.get("errorCode", -1) != 0:
        raise gr.Error("API returned an error.")
    return data

def _process_api_response_page(result: Dict[str, Any]) -> Tuple[str, str, str]:
    layout_results = (result or {}).get("layoutParsingResults", [])
    if not layout_results:
        return "No content was recognized.", "<p>No visualization available.</p>", ""

    page0 = layout_results[0] or {}
    md_data = page0.get("markdown") or {}
    md_text = md_data.get("text", "") or ""
    md_images_map = md_data.get("images", {})

    if md_images_map:
        for placeholder_path, image_url in md_images_map.items():
            md_text = md_text.replace(f'src="{placeholder_path}"', f'src="{image_url}"') \
                             .replace(f']({placeholder_path})', f']({image_url})')

    output_html = "<p style='text-align:center; color:#888;'>No visualization image available.</p>"
    out_imgs = page0.get("outputImages") or {}
    sorted_urls = [img_url for _, img_url in sorted(out_imgs.items()) if img_url]

    output_image_url: Optional[str] = None
    if len(sorted_urls) >= 2:
        output_image_url = sorted_urls[1]
    elif sorted_urls:
        output_image_url = sorted_urls[0]

    if output_image_url:
        output_html = f'<img src="{output_image_url}" alt="Detection Visualization" loading="lazy">'

    md_text = _escape_inequalities_in_math(md_text)
    return md_text or "(Empty result)", output_html, md_text

def handle_complex_doc(path_or_url: str, use_chart_recognition: bool, use_doc_unwarping: bool, use_doc_orientation_classify: bool) -> Tuple[str, str, str]:
    if not path_or_url:
        raise gr.Error("Please upload an image first.")
    data = _call_api(
        API_URL, path_or_url, use_layout_detection=True,
        prompt_label=None, use_chart_recognition=use_chart_recognition,
        use_doc_unwarping=use_doc_unwarping, use_doc_orientation_classify=use_doc_orientation_classify
    )
    result = data.get("result", {})
    return _process_api_response_page(result)

def handle_targeted_recognition(path_or_url: str, prompt_choice: str) -> Tuple[str, str, str]:
    if not path_or_url:
        raise gr.Error("Please upload an image first.")

    mapping = {
        "Text Recognition": "ocr",
        "Formula Recognition": "formula",
        "Table Recognition": "table",
        "Chart Recognition": "chart",
        "Spotting": "spotting",
        "Seal Recognition": "seal",
    }
    label = mapping.get(prompt_choice, "ocr")

    data = _call_api(
        API_URL, path_or_url,
        use_layout_detection=False,
        prompt_label=label,
        use_doc_unwarping=False,
        use_doc_orientation_classify=False
    )
    result = data.get("result", {})

    md_preview, _, md_raw_md = _process_api_response_page(result)
    vis_html = "<p style='text-align:center; color:#888;'>No visualization available.</p>"

    if label == "spotting":
        page0 = (result.get("layoutParsingResults") or [])[0] or {}
        pruned = page0.get("prunedResult") or {}
        spotting_res = pruned.get("spotting_res") or {}
        md_raw = json.dumps(spotting_res, ensure_ascii=False, indent=2)
        
        out_imgs = page0.get("outputImages") or {}
        url = out_imgs.get("spotting_res_img")
        if url:
            vis_html = f'<img src="{url}" alt="Spotting Visualization" loading="lazy">'
        return md_preview, md_raw, vis_html

    return md_preview, md_raw_md, vis_html

# ==========================================
# Premium Design CSS Theme
# ==========================================
custom_css = """
body, .gradio-container {
    background-color: #0b0f19 !important;
    color: #e2e8f0 !important;
    font-family: "Outfit", "Inter", "Microsoft YaHei", "PingFang SC", sans-serif !important;
}
.gradio-container {
    padding: 2rem 1.5rem !important;
    max-width: 1300px !important;
    margin: 0 auto !important;
    background: radial-gradient(circle at top left, #111827, #0b0f19) !important;
}

/* Brand Header and notice */
.app-header {
    text-align: center;
    max-width: 900px;
    margin: 0 auto 12px !important;
}
.app-header img {
    max-height: 80px;
    width: auto;
    margin: 10px auto;
    display: block;
    filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.45));
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.app-header img:hover {
    transform: scale(1.05);
}

.notice {
    margin: 12px auto 20px;
    max-width: 900px;
    padding: 12px 16px;
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.04);
    font-size: 14px;
    line-height: 1.6;
    color: #f59e0b;
    backdrop-filter: blur(10px);
}
.notice strong {
    font-weight: 700;
}
.notice a {
    color: #fbbf24;
    text-decoration: underline;
    transition: color 0.2s ease;
}
.notice a:hover {
    color: #f59e0b;
}

.quick-links {
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 0.75rem;
    background: rgba(17, 24, 39, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    max-width: 700px;
    margin: 0 auto 2.5rem !important;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.quick-links a {
    color: #818cf8;
    font-weight: 600;
    text-decoration: none;
    font-size: 14px;
    letter-spacing: 0.3px;
    transition: all 0.2s ease;
}
.quick-links a:hover {
    color: #a5b4fc;
    text-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
}

/* Glassmorphism containers and grids */
.gr-box, .gr-panel, .gr-form {
    background: rgba(17, 24, 39, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    border-radius: 16px !important;
    backdrop-filter: blur(12px) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25) !important;
}

/* Tabs Header */
.tabs {
    border: none !important;
    background: transparent !important;
}
.tab-nav {
    border-bottom: 2px solid rgba(255, 255, 255, 0.05) !important;
    margin-bottom: 1.5rem !important;
    display: flex !important;
    gap: 0.75rem !important;
}
.tab-nav button {
    font-size: 15px !important;
    font-weight: 600 !important;
    padding: 10px 22px !important;
    color: #64748b !important;
    border-bottom: 2px solid transparent !important;
    transition: all 0.25s ease !important;
}
.tab-nav button:hover {
    color: #94a3b8 !important;
}
.tab-nav button.selected {
    color: #6366f1 !important;
    border-bottom-color: #6366f1 !important;
    text-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
}

/* Buttons */
.prompt-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}
.prompt-grid button, .gr-button {
    font-weight: 600 !important;
    border-radius: 12px !important;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.gr-button-secondary {
    background: rgba(30, 41, 59, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: #cbd5e1 !important;
}
.gr-button-secondary:hover {
    background: rgba(99, 102, 241, 0.12) !important;
    border-color: rgba(99, 102, 241, 0.3) !important;
    color: #e2e8f0 !important;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
}
.gr-button-primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
    border: none !important;
    color: #ffffff !important;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25) !important;
}
.gr-button-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45) !important;
}

/* Preview Box and Images */
#image_preview_vl, #image_preview_doc, #image_preview_spot {
    height: 420px !important;
    border-radius: 14px;
    overflow: auto;
    background: #070a12;
    border: 1px solid rgba(255, 255, 255, 0.06);
}
#image_preview_vl img, #image_preview_doc img, #image_preview_spot img, #vis_image_doc img {
    width: 100% !important;
    height: auto !important;
    object-fit: contain !important;
    display: block;
}

.uploaded-image {
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #090d16;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    margin-bottom: 1rem;
    transition: border-color 0.3s ease;
}
.uploaded-image:hover {
    border-color: rgba(99, 102, 241, 0.4);
}

#md_preview_vl, #md_preview_doc {
    max-height: 560px;
    min-height: 220px;
    overflow: auto;
    padding: 1.25rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(9, 13, 22, 0.4);
}
#md_preview_vl .prose, #md_preview_doc .prose {
    line-height: 1.75 !important;
}
#md_preview_vl .prose img, #md_preview_doc .prose img {
    display: block;
    margin: 0 auto;
    max-width: 100%;
    height: auto;
}

.checkbox-row .gradio-checkbox {
    flex-grow: 1;
    text-align: center;
}

footer {
    display: none !important;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.3);
}
"""

with gr.Blocks(head=GOOGLE_FONTS_URL, css=custom_css, theme=gr.themes.Soft()) as demo:
    logo_data_url = image_to_base64_data_url(LOGO_IMAGE_PATH) if os.path.exists(LOGO_IMAGE_PATH) else ""
    gr.HTML(f"""<div class="app-header"><img src="{logo_data_url}" alt="App Logo"></div>""")
    
    gr.HTML("""
    <div class="notice">
    <strong>Heads up:</strong> The online demo can be slow at times depending on server load.
    For a better experience and free API access, please try our
    <a href="https://www.paddleocr.com" target="_blank" rel="noopener noreferrer">
        Official Website
    </a>.
    </div>
    """)

    gr.HTML("""<div class="quick-links"><a href="https://github.com/PaddlePaddle/PaddleOCR" target="_blank">GitHub</a> | <a href="https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6" target="_blank">Model</a> | <a href="https://aistudio.baidu.com/paddleocr" target="_blank">Official Website</a></div>""")

    with gr.Tabs():
        # ===================== Tab 1: Document Parsing =====================
        with gr.Tab("Document Parsing"):
            with gr.Row():
                with gr.Column(scale=5):
                    file_doc = gr.File(label="Upload Image", file_count="single", type="filepath", file_types=["image"])
                    preview_doc_html = gr.HTML(value="", elem_id="image_preview_doc", visible=False)
                    gr.Markdown("_(Use this mode for recognizing full-page documents.)_")
                    
                    example_url_doc = gr.State(value=None)
                    with gr.Row(variant="panel"):
                        with gr.Column(scale=2):
                            btn_parse = gr.Button("Parse Document", variant="primary")
                        with gr.Column(scale=3):
                            with gr.Row(elem_classes=["checkbox-row"]):
                                chart_switch = gr.Checkbox(label="Chart parsing", value=False)
                                unwarp_switch = gr.Checkbox(label="Doc unwarping", value=False)
                                orient_switch = gr.Checkbox(label="Orientation", value=False)

                    if complex_document_examples:
                        complex_paths = [e[0] for e in complex_document_examples]
                        complex_state = gr.State(complex_paths)
                        gallery_complex = gr.Gallery(value=complex_paths, columns=4, height=400, preview=False, label=None, allow_preview=False)
                        
                        def on_gallery_doc(paths, evt: gr.SelectData):
                            url = paths[int(evt.index)] if isinstance(evt.index, int) else paths[evt.index[0]]
                            return url, update_preview_visibility(url)
                        
                        gallery_complex.select(on_gallery_doc, complex_state, [example_url_doc, preview_doc_html])

                with gr.Column(scale=7):
                    with gr.Tabs():
                        with gr.Tab("Markdown Preview"):
                            md_preview_doc = gr.Markdown(latex_delimiters=LATEX_DELIMS, elem_id="md_preview_doc")
                        with gr.Tab("Visualization"):
                            vis_image_doc = gr.HTML()
                        with gr.Tab("Markdown Source"):
                            md_raw_doc = gr.Code(language="markdown")

            file_doc.change(lambda fp: (None, update_preview_visibility(fp)), file_doc, [example_url_doc, preview_doc_html])
            
            def parse_doc(fp, ex, ch, uw, do):
                src = fp if fp else ex
                return handle_complex_doc(src, ch, uw, do) if src else (None, None, None)

            btn_parse.click(parse_doc, [file_doc, example_url_doc, chart_switch, unwarp_switch, orient_switch], [md_preview_doc, vis_image_doc, md_raw_doc])

        # ===================== Tab 2: Element-level Recognition =====================
        with gr.Tab("Element-level Recognition"):
            with gr.Row():
                with gr.Column(scale=5):
                    file_vl = gr.File(label="Upload Image", file_count="single", type="filepath", file_types=["image"])
                    preview_vl_html = gr.HTML(value="", elem_id="image_preview_vl", visible=False)
                    gr.Markdown("_(Best for single elements like tables or formulas.)_")
                    
                    with gr.Row(elem_classes=["prompt-grid"]):
                        btn_ocr = gr.Button("Text Recognition", variant="secondary")
                        btn_formula = gr.Button("Formula Recognition", variant="secondary")
                    with gr.Row(elem_classes=["prompt-grid"]):
                        btn_table = gr.Button("Table Recognition", variant="secondary")
                        btn_chart = gr.Button("Chart Recognition", variant="secondary")
                    with gr.Row(elem_classes=["prompt-grid"]):
                        btn_seal = gr.Button("Seal Recognition", variant="secondary")

                    example_url_vl = gr.State(value=None)
                    if targeted_recognition_examples:
                        targeted_paths = [e[0] for e in targeted_recognition_examples]
                        targeted_state = gr.State(targeted_paths)
                        gallery_targeted = gr.Gallery(value=targeted_paths, columns=4, height=400, preview=False, label=None, allow_preview=False)
                        
                        def on_gallery_vl(paths, evt: gr.SelectData):
                            url = paths[int(evt.index)] if isinstance(evt.index, int) else paths[evt.index[0]]
                            return url, update_preview_visibility(url)
                        
                        gallery_targeted.select(on_gallery_vl, targeted_state, [example_url_vl, preview_vl_html])

                with gr.Column(scale=7):
                    with gr.Tabs() as vl_tabs:
                        with gr.Tab("Recognition Result"):
                            md_preview_vl = gr.Markdown(latex_delimiters=LATEX_DELIMS, elem_id="md_preview_vl")
                        with gr.Tab("Raw Output"):
                            md_raw_vl = gr.Code(language="markdown")

            file_vl.change(lambda fp: (None, update_preview_visibility(fp)), file_vl, [example_url_vl, preview_vl_html])

            def run_vl(fp, ex, prompt):
                src = fp if fp else ex
                if not src: raise gr.Error("Please upload an image.")
                return handle_targeted_recognition(src, prompt)

            for btn, prompt in [(btn_ocr, "Text Recognition"), (btn_formula, "Formula Recognition"), 
                                (btn_table, "Table Recognition"), (btn_chart, "Chart Recognition"), 
                                (btn_seal, "Seal Recognition")]:
                btn.click(run_vl, [file_vl, example_url_vl, gr.State(prompt)], [md_preview_vl, md_raw_vl, gr.HTML(visible=False)])

        # ===================== Tab 3: Spotting =====================
        with gr.Tab("Spotting"):
            with gr.Row():
                with gr.Column(scale=5):
                    file_spot = gr.File(label="Upload Image", file_count="single", type="filepath", file_types=["image"])
                    preview_spot_html = gr.HTML(value="", elem_id="image_preview_spot", visible=False)
                    gr.Markdown("_(Detects and locates specific elements in the image.)_")
                    
                    btn_run_spot = gr.Button("Run Spotting", variant="primary")
                    example_url_spot = gr.State(value=None)
                    
                    if spotting_recognition_examples:
                        spotting_paths = [e[0] for e in spotting_recognition_examples]
                        spot_state = gr.State(spotting_paths)
                        gallery_spot = gr.Gallery(value=spotting_paths, columns=4, height=400, preview=False, label=None, allow_preview=False)
                        
                        def on_gallery_spot(paths, evt: gr.SelectData):
                            url = paths[int(evt.index)] if isinstance(evt.index, int) else paths[evt.index[0]]
                            return url, update_preview_visibility(url)
                        
                        gallery_spot.select(on_gallery_spot, spot_state, [example_url_spot, preview_spot_html])

                with gr.Column(scale=7):
                    with gr.Tabs():
                        with gr.Tab("Visualization"):
                            vis_image_spot = gr.HTML("<p style='text-align:center; color:#888;'>No visualization yet.</p>")
                        with gr.Tab("JSON Result"):
                            json_spot = gr.Code(label="Detection Results", language="json")

            file_spot.change(lambda fp: (None, update_preview_visibility(fp)), file_spot, [example_url_spot, preview_spot_html])

            def run_spotting_wrapper(fp, ex):
                src = fp if fp else ex
                if not src: raise gr.Error("Please upload an image.")
                _, json_res, vis_res = handle_targeted_recognition(src, "Spotting")
                return vis_res, json_res

            btn_run_spot.click(
                fn=run_spotting_wrapper,
                inputs=[file_spot, example_url_spot],
                outputs=[vis_image_spot, json_spot]
            )

if __name__ == "__main__":
    demo.queue(max_size=64).launch()
