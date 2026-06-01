# Next.js Migration Plan: Premium Demo UI for PaddleOCR VL 1.6

This plan outlines the architecture, layout, styling, and integrations for migrating the Gradio demo UI to a premium Next.js (App Router, TypeScript) web application.

## 1. Objectives & Tech Stack
- **Framework**: Next.js 16+ (React 19, TypeScript, App Router).
- **Styling**: Tailwind CSS v4 (pre-configured) combined with custom CSS for animations and glassmorphism.
- **Features**: Complete parity with the Gradio demo, divided into three tabs:
  1. **Document Parsing** (Markdown Render, Layout Bounding Box image, Raw MD code, parsing switches).
  2. **Element-level Recognition** (Table, Formula, OCR, Chart, Seal buttons, Markdown render).
  3. **Spotting** (Run spotting, coordinates display, JSON output).
- **Static Assets**: Rely on Nginx serving `/examples/` directly as static assets. Next.js backend API routes will dynamically list filenames by reading `./PaddleOCR-VL-1.6_Online_Demo/examples`.

## 2. Next.js Application Structure
Under the `PaddleOCR-VL-1.6_NextJS_Demo/` folder:
- `src/app/page.tsx` - Main page containing the responsive multi-tab premium layout.
- `src/app/globals.css` - Global theme variables, animations, and custom scrollbars.
- `src/app/api/examples/route.ts` - API endpoint scanning the `./PaddleOCR-VL-1.6_Online_Demo/examples` folders and returning available example paths.
- `src/components/` - Splitting code into clean sub-components if needed (e.g. `TabContainer`, `ImageUploader`, `OutputViewer`).

## 3. Frontend & API Communication Flow
- **Example Listing**: On page mount, the frontend calls `GET /api/examples` to load available images.
- **OCR/Parsing Requests**:
  - Direct upload or selection from gallery.
  - Image is converted to Base64 on the client (or sent as file payload).
  - Client sends a `POST` request to `/layout-parsing` (proxied by Nginx).
  - Payload format matches the original backend schema:
    ```json
    {
      "file": "base64_string_or_url",
      "matchHistoryJob": false,
      "useLayoutDetection": true/false,
      "fileType": 1,
      "useDocUnwarping": true/false,
      "useDocOrientationClassify": true/false,
      "promptLabel": "ocr/formula/table/chart/spotting/seal"
    }
    ```
  - Response processing: Extract `layoutParsingResults` from JSON, replace placeholder images, render markdown (with LaTeX formatting for formula elements), and display visualization image paths.

## 4. Multi-Stage Dockerfile Integration
We will update `Dockerfile` to add a new build target `nextjs-ui` replacing `gradio-ui`:
```dockerfile
# Stage 4: Next.js UI (Frontend)
FROM node:20-alpine AS nextjs-ui
WORKDIR /app
COPY PaddleOCR-VL-1.6_NextJS_Demo/package*.json ./
RUN npm ci
COPY PaddleOCR-VL-1.6_NextJS_Demo ./
# Copy submodule examples so they are accessible during build if needed
COPY PaddleOCR-VL-1.6_Online_Demo ./PaddleOCR-VL-1.6_Online_Demo
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 5. Docker Compose & Nginx Updates
- **`docker-compose.yml`**: Change the build target of `paddle-ocr-demo` to `nextjs-ui`. Map container port `3000` instead of `7860`.
- **`nginx.conf`**: Update the root proxy pass (`location /`) to point to `http://paddle-ocr-demo:3000`.
