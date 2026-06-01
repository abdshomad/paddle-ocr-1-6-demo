import sys
import os
import asyncio
import aiohttp
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

TARGET_URL = os.environ.get("REAL_PIPELINE_URL", "http://127.0.0.1:8091")

def fix_base64_img(val):
    if isinstance(val, str) and not val.startswith(("http://", "https://", "data:")):
        if val.startswith(("9j/", "/9j/")):
            return f"data:image/jpeg;base64,{val}"
        elif val.startswith("iVBORw"):
            return f"data:image/png;base64,{val}"
        elif len(val) > 100 and " " not in val:
            # Fallback to jpeg for other base64 strings
            return f"data:image/jpeg;base64,{val}"
    return val

def traverse_and_fix(data):
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if k in ("outputImages", "images") and isinstance(v, dict):
                new_dict[k] = {ik: fix_base64_img(iv) for ik, iv in v.items()}
            elif isinstance(v, str):
                new_dict[k] = fix_base64_img(v)
            else:
                new_dict[k] = traverse_and_fix(v)
        return new_dict
    elif isinstance(data, list):
        return [traverse_and_fix(item) for item in data]
    return data

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
async def proxy(request: Request, path: str):
    url = f"{TARGET_URL}/{path}"
    
    # Get request body
    body = await request.body()
    
    # Forward headers (excluding Host)
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    
    # Get query params
    params = request.query_params
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=request.method,
                url=url,
                headers=headers,
                params=params,
                data=body,
                timeout=600
            ) as resp:
                resp_body = await resp.read()
                
                # Check if JSON response
                content_type = resp.headers.get("content-type", "")
                if "application/json" in content_type:
                    try:
                        json_data = await resp.json()
                        print(f"[Proxy Debug] Intercepted JSON response from {path}")
                        
                        # Let's log some details of the original layoutParsingResults
                        results = json_data.get("result", {}).get("layoutParsingResults", [])
                        if results:
                            print(f"[Proxy Debug] page0 keys: {list(results[0].keys())}")
                            if "outputImages" in results[0]:
                                print(f"[Proxy Debug] outputImages keys: {list(results[0]['outputImages'].keys())}")
                                for k, v in results[0]["outputImages"].items():
                                    print(f"[Proxy Debug] outputImages[{k}] starts with: {v[:50]}... (len: {len(v)})")
                            if "markdown" in results[0] and "images" in results[0]["markdown"]:
                                print(f"[Proxy Debug] markdown['images'] keys: {list(results[0]['markdown']['images'].keys())}")
                                for k, v in results[0]["markdown"]["images"].items():
                                    print(f"[Proxy Debug] markdown['images'][{k}] starts with: {v[:50]}... (len: {len(v)})")
                        
                        fixed_data = traverse_and_fix(json_data)
                        
                        # Log fixed details
                        results_fixed = fixed_data.get("result", {}).get("layoutParsingResults", [])
                        if results_fixed and "outputImages" in results_fixed[0]:
                            for k, v in results_fixed[0]["outputImages"].items():
                                print(f"[Proxy Debug] FIXED outputImages[{k}] starts with: {v[:50]}...")
                        
                        return JSONResponse(content=fixed_data, status_code=resp.status)
                    except Exception as e:
                        # Fallback if json parsing fails
                        print(f"[Proxy Debug] JSON parsing/fixing error: {e}")
                        pass
                
                return Response(
                    content=resp_body,
                    status_code=resp.status,
                    headers={k: v for k, v in resp.headers.items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")}
                )
    except Exception as e:
        print(f"[Proxy Debug] Request forward error: {e}")
        return JSONResponse(status_code=500, content={"detail": f"Proxy error: {str(e)}"})

if __name__ == "__main__":
    host = os.environ.get("PIPELINE_HOST", "0.0.0.0")
    port = int(os.environ.get("PIPELINE_PORT", "8090"))
    uvicorn.run(app, host=host, port=port)
