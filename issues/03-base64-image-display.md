# Issue: Base64 Image Display Failure

## Symptoms
The layout detection result images could not be displayed in the browser. The browser tried to request relative URLs like `http://localhost:7872/9j/4AAQSkZJRg...` resulting in broken image resources.

## Cause
The backend pipeline API (`paddlex --serve`) returned base64-encoded image data in `outputImages` and `images` fields, but it was raw base64 data without any prefix. Since the values started with raw base64 headers like `9j/4AAQ...`, the browser treated them as relative URL paths instead of Data URLs.

## Solution
Implemented a FastAPI-based proxy script [scripts/pipeline_proxy.py](../scripts/pipeline_proxy.py) that:
1. Intercepts `/layout-parsing` and all other API routes.
2. Forwards requests to the core `paddlex` server (re-routed to port 8091).
3. Recursively parses JSON responses and prepends the correct `data:image/jpeg;base64,` or `data:image/png;base64,` schema prefix to any raw base64 image strings.
4. Returns the modified JSON.

## Update (JSONResponse content_type fix)
* **Sub-Issue**: The proxy script originally returned `JSONResponse(content_type="application/json", ...)` which crashed with: `JSONResponse.__init__() got an unexpected keyword argument 'content_type'`, causing the proxy to fall back to returning unmodified responses.
* **Fix**: Removed the `content_type` argument from `JSONResponse` (as it defaults to `application/json` automatically). The modified response is now successfully intercepted and correctly displays base64 images in the browser UI.
