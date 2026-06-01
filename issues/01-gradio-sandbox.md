# Issue: Gradio Security Sandbox Restrictions

## Symptoms
Gradio UI throws an error: `"File ... is not in the cache folder and cannot be accessed."` when trying to load local example images or files.

## Cause
By default, Gradio restricts the files it can serve to only the temporary folder or files located within the app directory. Because the examples directory resided in a submodule folder, the Gradio app blocked access to them.

## Solution
Exported the environment variables:
* `BOS_URL=examples` (to point to the correct static asset URL structure)
* `GRADIO_ALLOWED_PATHS=/app/PaddleOCR-VL-1.6_Online_Demo` (to authorize Gradio access to the submodule folder path)
