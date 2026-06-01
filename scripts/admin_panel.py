import os
import subprocess
import socket
import json
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, RedirectResponse
from jinja2 import Template
import uvicorn
import aiohttp

app = FastAPI()

# Path to the workspace configuration files on host
WORKSPACE_PATH = "/workspace"

def check_auth(request: Request) -> bool:
    auth_token = request.cookies.get("auth_token")
    return auth_token == "demo-token"

def run_cmd(cmd):
    try:
        res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        return res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return "", str(e)

def get_process_name(pid: int) -> str:
    try:
        with open(f"/proc/{pid}/comm", "r") as f:
            return f.read().strip()
    except Exception:
        # Fallback to ps command
        try:
            res = subprocess.run(f"ps -p {pid} -o comm=", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2)
            return res.stdout.strip()
        except Exception:
            return ""

def make_human_readable_name(proc_name: str) -> str:
    proc_name_lower = proc_name.lower()
    if "rustdesk" in proc_name_lower:
        return "RustDesk Remote Desktop"
    if "xorg" in proc_name_lower:
        return "Xorg Graphics Server"
    if "vllm::enginecore" in proc_name_lower or "vllm" in proc_name_lower:
        return "vLLM Inference Server"
    if ".venv-api" in proc_name_lower or "pipeline" in proc_name_lower:
        return "PaddleOCR Pipeline API"
    if "paddlex" in proc_name_lower:
        return "PaddleX Service"
    if "python" in proc_name_lower:
        return "Python Backend Engine"
    
    # Fallback to file basename
    try:
        base = os.path.basename(proc_name)
        if base:
            return base
    except Exception:
        pass
    return proc_name

# Async helper to talk to Docker socket
async def restart_docker_container(container_name: str):
    connector = aiohttp.UnixConnector(path="/var/run/docker.sock")
    async with aiohttp.ClientSession(connector=connector) as session:
        url = f"http://localhost/containers/{container_name}/restart"
        async with session.post(url) as resp:
            return resp.status

async def stop_docker_container(container_name: str):
    connector = aiohttp.UnixConnector(path="/var/run/docker.sock")
    async with aiohttp.ClientSession(connector=connector) as session:
        url = f"http://localhost/containers/{container_name}/stop"
        async with session.post(url) as resp:
            return resp.status

async def get_matching_containers(prefix: str):
    try:
        connector = aiohttp.UnixConnector(path="/var/run/docker.sock")
        async with aiohttp.ClientSession(connector=connector) as session:
            url = "http://localhost/containers/json?all=true"
            async with session.get(url) as resp:
                if resp.status == 200:
                    containers = await resp.json()
                    matching = []
                    for c in containers:
                        for name in c.get("Names", []):
                            clean_name = name.lstrip("/")
                            if clean_name.startswith(prefix):
                                matching.append(clean_name)
                    return matching
    except Exception:
        pass
    return []

def get_gpu_info():
    # Query GPUs info
    stdout, _ = run_cmd("nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,uuid --format=csv,noheader,nounits")
    gpus = []
    if stdout:
        for line in stdout.split("\n"):
            if not line:
                continue
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 8:
                gpus.append({
                    "index": parts[0],
                    "name": parts[1],
                    "gpu_util": parts[2],
                    "mem_util": parts[3],
                    "mem_total": parts[4],
                    "mem_used": parts[5],
                    "mem_free": parts[6],
                    "uuid": parts[7],
                    "processes": []
                })
                
    # Query compute apps (processes) using GPUs
    stdout_apps, _ = run_cmd("nvidia-smi --query-compute-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits")
    if stdout_apps:
        for line in stdout_apps.split("\n"):
            if not line:
                continue
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 4:
                gpu_uuid, pid, proc_name, used_mem = parts[0], parts[1], parts[2], parts[3]
                # Find matching GPU
                for gpu in gpus:
                    if gpu["uuid"] == gpu_uuid:
                        gpu["processes"].append({
                            "pid": pid,
                            "name": proc_name,
                            "readable_name": make_human_readable_name(proc_name),
                            "used_mem": used_mem
                        })
    return gpus

def get_current_settings():
    env_file = os.path.join(WORKSPACE_PATH, ".env")
    yaml_file = os.path.join(WORKSPACE_PATH, "config/vllm_config.yaml")
    
    settings = {
        "cuda_devices": "all",
        "gpu_utilization": "0.95"
    }
    
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("CUDA_VISIBLE_DEVICES="):
                    settings["cuda_devices"] = line.split("=")[1].strip()
                    
    if os.path.exists(yaml_file):
        with open(yaml_file, "r") as f:
            for line in f:
                if "gpu_memory_utilization:" in line:
                    settings["gpu_utilization"] = line.split(":")[1].strip()
                    
    return settings

def update_nginx_config(active_gpu_indices):
    nginx_file = os.path.join(WORKSPACE_PATH, "nginx.conf")
    servers = "\n".join([f"    server pipeline-api-gpu{i}:8090;" for i in active_gpu_indices])
    
    config_content = f"""upstream pipeline_api_pool {{
{servers}
}}

server {{
    listen 80;
    server_name localhost;
    absolute_redirect off;
    client_max_body_size 100M;

    # Intercept requests for example images (legacy/fallback None/ path)
    location /gradio_api/file=/app/PaddleOCR-VL-1.6_Online_Demo/None/ {{
        alias /usr/share/nginx/html/examples/;
        add_header Access-Control-Allow-Origin *;
    }}

    # Intercept requests for example images (correct examples/ path)
    location /gradio_api/file=/app/PaddleOCR-VL-1.6_Online_Demo/examples/ {{
        alias /usr/share/nginx/html/examples/;
        add_header Access-Control-Allow-Origin *;
    }}

    # Redirect legacy /admin requests to the new /gpu dashboard
    location ~ ^/admin/?$ {{
        return 301 /gpu;
    }}

    # Proxy GPU dashboard, login, and logout requests to the admin-panel service
    location ~ ^/(gpu|login|logout) {{
        proxy_pass http://admin-panel:8000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    # Proxy pipeline layout parsing to the load-balanced pool
    location /layout-parsing {{
        proxy_pass http://pipeline_api_pool/layout-parsing;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    # Proxy all other requests to the Gradio backend
    location / {{
        proxy_pass http://paddle-ocr-demo:7860;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $http_host;

        # Websockets support (required for Gradio 5+)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }}
}}
"""
    with open(nginx_file, "w") as f:
        f.write(config_content)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPU Management Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.75);
            --border-color: rgba(99, 102, 241, 0.2);
            --primary: #6366f1;
            --success: #10b981;
            --danger: #ef4444;
            --text-color: #f8fafc;
            --text-muted: #94a3b8;
        }

        body {
            background: radial-gradient(circle at top left, #1e1b4b, #0f172a);
            color: var(--text-color);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .container {
            width: 100%;
            max-width: 1000px;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1);
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
            margin-bottom: 25px;
        }

        h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #a5b4fc, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        h2 {
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
            color: #a5b4fc;
        }

        .gpu-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .gpu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .gpu-name {
            font-size: 18px;
            font-weight: 600;
        }

        .gpu-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .metric-box {
            background: rgba(30, 41, 59, 0.5);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }

        .metric-label {
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .metric-value {
            font-size: 18px;
            font-weight: 700;
        }

        .progress-bar-container {
            width: 100%;
            height: 8px;
            background: #334155;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--success), #34d399);
            border-radius: 4px;
        }

        .progress-bar.high {
            background: linear-gradient(90deg, #fbbf24, #f59e0b);
        }

        .progress-bar.critical {
            background: linear-gradient(90deg, var(--danger), #ef4444);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        th {
            color: var(--text-muted);
            font-size: 13px;
            text-transform: uppercase;
        }

        td {
            font-size: 14px;
        }

        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .btn-danger {
            background: var(--danger);
        }

        .btn-success {
            background: var(--success);
        }

        .form-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
            color: var(--text-muted);
        }

        input[type="text"] {
            width: 100%;
            max-width: 300px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--border-color);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
        }

        .alert {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid var(--success);
            color: #34d399;
        }

        .alert-danger {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid var(--danger);
            color: #f87171;
        }
    </style>
    <script>
        function toggleCudaCheckboxes(allCheckbox) {
            const gpuCheckboxes = document.querySelectorAll('.cuda-gpu-chk');
            gpuCheckboxes.forEach(chk => {
                chk.checked = allCheckbox.checked;
            });
        }

        function onGpuCheckboxChange(gpuCheckbox) {
            const allCheckbox = document.getElementById('chk_all');
            const gpuCheckboxes = document.querySelectorAll('.cuda-gpu-chk');
            if (!gpuCheckbox.checked) {
                allCheckbox.checked = false;
            } else {
                const allChecked = Array.from(gpuCheckboxes).every(chk => chk.checked);
                if (allChecked) {
                    allCheckbox.checked = true;
                }
            }
        }
    </script>
</head>
<body>
    <div class="container">
        <header>
            <h1>GPU Management Dashboard</h1>
            <div style="display: flex; gap: 10px;">
                <a href="/gpu" class="btn">Refresh</a>
                <a href="/logout" class="btn btn-danger">Logout</a>
            </div>
        </header>

        {% if msg %}
            <div class="alert alert-success">{{ msg }}</div>
        {% endif %}
        {% if err %}
            <div class="alert alert-danger">{{ err }}</div>
        {% endif %}

        <div class="gpu-card" style="margin-bottom: 35px; border-color: rgba(99, 102, 241, 0.4);">
            <h2>Optimization Settings (Load to Max VRAM)</h2>
            <form action="/gpu/save-settings" method="post">
                <div class="form-group">
                    <label>CUDA Visible Devices</label>
                    <div class="checkbox-group" style="display: flex; gap: 15px; margin-top: 5px; margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; color: var(--text-color);">
                            <input type="checkbox" id="chk_all" name="cuda_devices_list" value="all" {% if is_all_checked %}checked{% endif %} onchange="toggleCudaCheckboxes(this)"> All
                        </label>
                        {% for gpu in gpus %}
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; color: var(--text-color);">
                                <input type="checkbox" class="cuda-gpu-chk" name="cuda_devices_list" value="{{ gpu.index }}" {% if gpu.index in checked_gpus %}checked{% endif %} onchange="onGpuCheckboxChange(this)"> GPU {{ gpu.index }}
                            </label>
                        {% endfor %}
                    </div>
                </div>
                <div class="form-group">
                    <label for="gpu_utilization">vLLM GPU Memory Utilization (Suggest max value: 0.95 for maximum performance and allocation)</label>
                    <input type="text" id="gpu_utilization" name="gpu_utilization" value="{{ settings.gpu_utilization }}" placeholder="e.g. 0.95">
                </div>
                <button type="submit" class="btn btn-success">Apply Settings & Restart Services</button>
            </form>
        </div>

        <h2>GPU Status and Usage</h2>
        {% if not gpus %}
            <p style="color: var(--text-muted);">No GPUs detected or nvidia-smi is unavailable.</p>
        {% else %}
            {% for gpu in gpus %}
                <div class="gpu-card">
                    <div class="gpu-header">
                        <div class="gpu-name">[{{ gpu.index }}] {{ gpu.name }}</div>
                        <div style="font-size: 12px; color: var(--text-muted)">UUID: {{ gpu.uuid }}</div>
                    </div>
                    
                    <div class="gpu-metrics">
                        <div class="metric-box">
                            <div class="metric-label">GPU Utilization</div>
                            <div class="metric-value">{{ gpu.gpu_util }}%</div>
                            <div class="progress-bar-container">
                                <div class="progress-bar {% if gpu.gpu_util|int > 85 %}critical{% elif gpu.gpu_util|int > 60 %}high{% endif %}" style="width: {{ gpu.gpu_util }}%"></div>
                            </div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-label">VRAM Usage</div>
                            <div class="metric-value">{{ gpu.mem_used }} / {{ gpu.mem_total }} MiB</div>
                            <div class="progress-bar-container">
                                {% set usage_pct = (gpu.mem_used|float / gpu.mem_total|float * 100)|int %}
                                <div class="progress-bar {% if usage_pct > 85 %}critical{% elif usage_pct > 60 %}high{% endif %}" style="width: {{ usage_pct }}%"></div>
                            </div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-label">Free VRAM</div>
                            <div class="metric-value" style="color: var(--success)">{{ gpu.mem_free }} MiB</div>
                        </div>
                    </div>

                    <h3>Active GPU Processes</h3>
                    {% if not gpu.processes %}
                        <p style="font-size: 13px; color: var(--text-muted); margin: 0;">No active VRAM processes found on this GPU.</p>
                    {% else %}
                        <table>
                            <thead>
                                <tr>
                                    <th>PID</th>
                                    <th>Process Name</th>
                                    <th>VRAM Used</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for proc in gpu.processes %}
                                    <tr>
                                        <td><code>{{ proc.pid }}</code></td>
                                        <td>
                                            <div style="font-weight: 600; color: #a5b4fc;">{{ proc.readable_name }}</div>
                                            <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">{{ proc.name }}</div>
                                        </td>
                                        <td>{{ proc.used_mem }} MiB</td>
                                        <td>
                                            {% if "rustdesk" in proc.name.lower() or "rustdesk" in proc.readable_name.lower() %}
                                                <span style="color: var(--text-muted); font-size: 12px; font-style: italic;">Protected (Rustdesk)</span>
                                            {% else %}
                                                <a href="/gpu/kill/{{ proc.pid }}" class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;">Kill</a>
                                            {% endif %}
                                        </td>
                                    </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    {% endif %}
                </div>
            {% endfor %}
        {% endif %}
    </div>
</body>
</html>
"""

LOGIN_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPU Dashboard Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(15, 23, 42, 0.45);
            --border-color: rgba(255, 255, 255, 0.08);
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --primary-glow: rgba(99, 102, 241, 0.25);
            --danger: #f87171;
            --danger-bg: rgba(248, 113, 113, 0.1);
            --danger-border: rgba(248, 113, 113, 0.2);
            --text-color: #f8fafc;
            --text-muted: #94a3b8;
            --accent-glow: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }

        /* Ambient animated blobs */
        .bg-blobs {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 0;
            overflow: hidden;
            pointer-events: none;
        }

        .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.35;
            animation: float 25s infinite alternate ease-in-out;
        }

        .blob-1 {
            top: -10%;
            left: -10%;
            width: 50vw;
            height: 50vw;
            background: radial-gradient(circle, #4f46e5 0%, transparent 70%);
            animation-duration: 28s;
        }

        .blob-2 {
            bottom: -10%;
            right: -10%;
            width: 45vw;
            height: 45vw;
            background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
            animation-duration: 22s;
            animation-delay: -6s;
        }

        .blob-3 {
            top: 35%;
            left: 45%;
            width: 35vw;
            height: 35vw;
            background: radial-gradient(circle, #ec4899 0%, transparent 70%);
            animation-duration: 32s;
            animation-delay: -12s;
        }

        @keyframes float {
            0% {
                transform: translate(0, 0) scale(1) rotate(0deg);
            }
            100% {
                transform: translate(10%, 15%) scale(1.15) rotate(360deg);
            }
        }

        .login-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 420px;
            background: var(--card-bg);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 48px 40px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
            text-align: center;
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
            padding: 6px 14px;
            border-radius: 99px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 24px;
        }

        .pulse-dot {
            width: 6px;
            height: 6px;
            background-color: #818cf8;
            border-radius: 50%;
            box-shadow: 0 0 8px #818cf8;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.7);
            }
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 6px rgba(129, 140, 248, 0);
            }
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(129, 140, 248, 0);
            }
        }

        h2 {
            font-family: 'Outfit', sans-serif;
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #f8fafc, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 14px;
            margin-bottom: 36px;
            line-height: 1.5;
        }

        .form-group {
            margin-bottom: 24px;
            text-align: left;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-icon {
            position: absolute;
            left: 16px;
            color: var(--text-muted);
            pointer-events: none;
            width: 18px;
            height: 18px;
            transition: color 0.3s;
        }

        input {
            width: 100%;
            box-sizing: border-box;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: white;
            padding: 14px 16px 14px 46px;
            border-radius: 12px;
            font-size: 15px;
            font-family: inherit;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        input:focus {
            outline: none;
            border-color: var(--primary);
            background: rgba(15, 23, 42, 0.8);
            box-shadow: 0 0 0 4px var(--primary-glow), 0 4px 20px rgba(99, 102, 241, 0.1);
        }

        input:focus + .input-icon {
            color: #a5b4fc;
        }

        .toggle-password {
            position: absolute;
            right: 16px;
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            transition: color 0.3s;
        }

        .toggle-password:hover {
            color: #f8fafc;
        }

        .btn {
            width: 100%;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
            margin-top: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
            background: linear-gradient(135deg, #818cf8, #4f46e5);
        }

        .btn:active {
            transform: translateY(0);
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
        }

        .alert {
            background: var(--danger-bg);
            border: 1px solid var(--danger-border);
            color: var(--danger);
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            margin-bottom: 24px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .spinner {
            animation: rotate 2s linear infinite;
            width: 20px;
            height: 20px;
            display: none;
        }

        .spinner .path {
            stroke: #ffffff;
            stroke-linecap: round;
            animation: dash 1.5s ease-in-out infinite;
        }

        @keyframes rotate {
            100% {
                transform: rotate(360deg);
            }
        }

        @keyframes dash {
            0% {
                stroke-dasharray: 1, 150;
                stroke-dashoffset: 0;
            }
            50% {
                stroke-dasharray: 90, 150;
                stroke-dashoffset: -35;
            }
            100% {
                stroke-dasharray: 90, 150;
                stroke-dashoffset: -124;
            }
        }
    </style>
</head>
<body>
    <div class="bg-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <div class="login-card">
        <div class="badge">
            <span class="pulse-dot"></span>
            GPU Control Panel
        </div>
        <h2>Welcome Back</h2>
        <p class="subtitle">Secure administrative interface to monitor status & allocate VRAM settings</p>
        
        {% if err %}
            <div class="alert">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px; flex-shrink: 0;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{{ err }}</span>
            </div>
        {% endif %}
        
        <form action="/login" method="post" onsubmit="onSubmitForm(event)">
            <div class="form-group">
                <label for="username">Username</label>
                <div class="input-wrapper">
                    <input type="text" id="username" name="username" required autocomplete="username">
                    <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                </div>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                    <input type="password" id="password" name="password" required autocomplete="current-password">
                    <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <button type="button" id="toggle-password-btn" class="toggle-password" onclick="togglePasswordVisibility()" aria-label="Toggle Password Visibility">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>
            <button type="submit" id="submit-btn" class="btn">
                <svg id="submit-spinner" class="spinner" viewBox="0 0 50 50">
                    <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                </svg>
                <span id="submit-text">Sign In</span>
            </button>
        </form>
    </div>

    <script>
        function togglePasswordVisibility() {
            const passwordInput = document.getElementById('password');
            const toggleBtn = document.getElementById('toggle-password-btn');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>`;
            } else {
                passwordInput.type = 'password';
                toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
            }
        }

        function onSubmitForm(event) {
            const btn = document.getElementById('submit-btn');
            const spinner = document.getElementById('submit-spinner');
            const text = document.getElementById('submit-text');
            
            spinner.style.display = 'block';
            text.textContent = 'Signing in...';
            btn.style.opacity = '0.85';
            btn.style.pointerEvents = 'none';
        }
    </script>
</body>
</html>
"""

@app.get("/login", response_class=HTMLResponse)
async def login_get(request: Request, err: str = None):
    template = Template(LOGIN_HTML_TEMPLATE)
    return template.render(err=err)

@app.post("/login")
async def login_post(request: Request):
    form = await request.form()
    username = form.get("username", "")
    password = form.get("password", "")
    
    correct_username = os.environ.get("ADMIN_USER")
    correct_password = os.environ.get("ADMIN_PASS")
    
    if not correct_username or not correct_password:
        return RedirectResponse("/login?err=Configuration Error: ADMIN_USER or ADMIN_PASS not configured", status_code=303)
    
    if username == correct_username and password == correct_password:
        response = RedirectResponse("/gpu", status_code=303)
        response.set_cookie(key="auth_token", value="demo-token", httponly=True, max_age=86400)
        return response
    else:
        return RedirectResponse("/login?err=Invalid username or password", status_code=303)

@app.get("/logout")
async def logout():
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie(key="auth_token")
    return response

@app.get("/gpu", response_class=HTMLResponse)
async def admin_index(request: Request, msg: str = None, err: str = None):
    if not check_auth(request):
        return RedirectResponse("/login", status_code=303)
    gpus = get_gpu_info()
    settings = get_current_settings()
    
    # Dynamically determine checkbox states
    all_gpu_indices = [gpu["index"] for gpu in gpus]
    cuda_devices_setting = settings.get("cuda_devices", "all").strip().lower()
    
    if cuda_devices_setting == "all":
        is_all_checked = True
        checked_gpus = set(all_gpu_indices)
    else:
        checked_gpus = {x.strip() for x in cuda_devices_setting.split(",") if x.strip()}
        # "All" is checked if all available GPUs are checked
        is_all_checked = all(idx in checked_gpus for idx in all_gpu_indices) if all_gpu_indices else False
        
    template = Template(HTML_TEMPLATE)
    return template.render(gpus=gpus, settings=settings, is_all_checked=is_all_checked, checked_gpus=checked_gpus, msg=msg, err=err)

@app.get("/gpu/kill/{pid}")
async def kill_pid(pid: int, request: Request):
    if not check_auth(request):
        return RedirectResponse("/login", status_code=303)
    # Protect rustdesk from being killed
    proc_name = get_process_name(pid)
    if "rustdesk" in proc_name.lower():
        return RedirectResponse(f"/gpu?err=Operation Denied: Process {pid} ({proc_name}) is a rustdesk process and cannot be killed to prevent disconnecting your remote session.", status_code=303)
    
    # Safely kill host process using pid host
    stdout, stderr = run_cmd(f"kill -9 {pid}")
    if stderr:
        return RedirectResponse(f"/gpu?err=Failed to kill process {pid}: {stderr}", status_code=303)
    return RedirectResponse(f"/gpu?msg=Successfully killed process {pid}", status_code=303)

@app.post("/gpu/save-settings")
async def save_settings(request: Request):
    if not check_auth(request):
        return RedirectResponse("/login", status_code=303)
    form = await request.form()
    devices_list = form.getlist("cuda_devices_list")
    
    # Query all GPU indexes dynamically to resolve "all"
    gpus = get_gpu_info()
    all_indexes = [gpu["index"] for gpu in gpus]
    
    if "all" in devices_list:
        cuda_devices = ",".join(all_indexes)
    else:
        gpu_indices = [x for x in devices_list if x != "all"]
        if gpu_indices:
            cuda_devices = ",".join(gpu_indices)
        else:
            cuda_devices = "0"
            
    gpu_utilization = form.get("gpu_utilization", "").strip()
    
    env_file = os.path.join(WORKSPACE_PATH, ".env")
    yaml_file = os.path.join(WORKSPACE_PATH, "config/vllm_config.yaml")
    
    errs = []
    
    # Save .env file config
    if os.path.exists(env_file):
        try:
            lines = []
            with open(env_file, "r") as f:
                lines = f.readlines()
            
            with open(env_file, "w") as f:
                found_cuda = False
                for line in lines:
                    if line.startswith("CUDA_VISIBLE_DEVICES="):
                        f.write(f"CUDA_VISIBLE_DEVICES={cuda_devices}\n")
                        found_cuda = True
                    else:
                        f.write(line)
                if not found_cuda:
                    f.write(f"CUDA_VISIBLE_DEVICES={cuda_devices}\n")
        except Exception as e:
            errs.append(f"Failed to update .env: {e}")
            
    # Save vllm_config.yaml config
    if os.path.exists(yaml_file):
        try:
            lines = []
            with open(yaml_file, "r") as f:
                lines = f.readlines()
                
            with open(yaml_file, "w") as f:
                for line in lines:
                    if "gpu_memory_utilization:" in line:
                        f.write(f"gpu_memory_utilization: {gpu_utilization}\n")
                    else:
                        f.write(line)
        except Exception as e:
            errs.append(f"Failed to update vllm_config.yaml: {e}")
            
    if errs:
        return RedirectResponse(f"/gpu?err=" + "; ".join(errs), status_code=303)
        
    # Rewrite Nginx config based on selected GPUs
    active_gpu_list = [x.strip() for x in cuda_devices.split(",") if x.strip()]
    try:
        update_nginx_config(active_gpu_list)
    except Exception as e:
        return RedirectResponse(f"/gpu?err=Failed to update nginx.conf: {e}", status_code=303)

    # Trigger docker starts/stops/restarts
    try:
        vllm_containers = await get_matching_containers("paddle-ocr-1-6-demo-vllm-server")
        pipeline_containers = await get_matching_containers("paddle-ocr-1-6-demo-pipeline-api")
        nginx_containers = await get_matching_containers("paddle-ocr-1-6-demo-nginx")
        
        def friendly_status(code: int) -> str:
            return "Success" if code in (200, 204) else f"Failed (Status: {code})"
            
        def get_gpu_index_from_name(container_name: str) -> str:
            # Container names are like paddle-ocr-1-6-demo-vllm-server-gpuX-1
            # Extract 'X' (the GPU index)
            parts = container_name.split("-gpu")
            if len(parts) > 1:
                subparts = parts[1].split("-")
                if subparts:
                    return subparts[0]
            return ""

        restarted_vllm = []
        stopped_vllm = []
        restarted_pipeline = []
        stopped_pipeline = []

        async def handle_vllm(name, gpu_idx):
            if gpu_idx in active_gpu_list:
                status = await restart_docker_container(name)
                restarted_vllm.append(f"{name} ({friendly_status(status)})")
            else:
                status = await stop_docker_container(name)
                stopped_vllm.append(f"{name} (Stopped)")

        async def handle_pipeline(name, gpu_idx):
            if gpu_idx in active_gpu_list:
                status = await restart_docker_container(name)
                restarted_pipeline.append(f"{name} ({friendly_status(status)})")
            else:
                status = await stop_docker_container(name)
                stopped_pipeline.append(f"{name} (Stopped)")

        # Run all vllm and pipeline container actions concurrently!
        tasks = []
        for name in vllm_containers:
            gpu_idx = get_gpu_index_from_name(name)
            tasks.append(handle_vllm(name, gpu_idx))
        for name in pipeline_containers:
            gpu_idx = get_gpu_index_from_name(name)
            tasks.append(handle_pipeline(name, gpu_idx))

        await asyncio.gather(*tasks, return_exceptions=True)

        # After that, restart Nginx sequentially to apply the new upstream pool
        restarted_nginx = []
        for name in nginx_containers:
            status = await restart_docker_container(name)
            restarted_nginx.append(f"{name} ({friendly_status(status)})")
            
        summary = []
        if restarted_vllm:
            summary.append("vLLM: " + ", ".join(restarted_vllm))
        if stopped_vllm:
            summary.append("Stopped vLLM: " + ", ".join(stopped_vllm))
        if restarted_pipeline:
            summary.append("Pipeline: " + ", ".join(restarted_pipeline))
        if stopped_pipeline:
            summary.append("Stopped Pipeline: " + ", ".join(stopped_pipeline))
        if restarted_nginx:
            summary.append("Nginx: " + ", ".join(restarted_nginx))
            
        msg = "Settings saved. Container statuses: " + " | ".join(summary) if summary else "Settings saved, but no active model containers found."
        return RedirectResponse(f"/gpu?msg={msg}", status_code=303)
    except Exception as e:
        return RedirectResponse(f"/gpu?msg=Settings saved, but failed to restart containers automatically: {e}. Please restart compose manually.", status_code=303)

if __name__ == "__main__":
    host = os.environ.get("PIPELINE_HOST", "0.0.0.0")
    port = int(os.environ.get("PIPELINE_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
