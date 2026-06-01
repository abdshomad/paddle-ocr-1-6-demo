---
name: Document Intelligence Multi-Theme System
version: 1.2.0
themes:
  light:
    displayName: Light Mode
    colors:
      background: "#faf9f8"
      foreground: "#323130"
      card-bg: "#ffffff"
      border-color: "#edebe9"
      accent-blue: "#0078d4"
      accent-hover: "#106ebe"
    typography:
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
    borders:
      radius-sm: "2px"
      radius-md: "4px"
      radius-lg: "8px"
  dark:
    displayName: Dark Mode
    colors:
      background: "#11100f"
      foreground: "#f3f2f1"
      card-bg: "#201f1e"
      border-color: "#292827"
      accent-blue: "#2899f5"
      accent-hover: "#4fb0ff"
    typography:
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
    borders:
      radius-sm: "2px"
      radius-md: "4px"
      radius-lg: "8px"
  glass:
    displayName: Glassmorphism
    colors:
      background: "linear-gradient(135deg, #fdfbf7 0%, #fafafa 50%, #f5f7fa 100%)"
      foreground: "#111111"
      card-bg: "rgba(255, 255, 255, 0.45)"
      border-color: "rgba(0, 0, 0, 0.05)"
      accent-blue: "#7c3aed"
      accent-hover: "#6d28d9"
    typography:
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
    borders:
      radius-sm: "6px"
      radius-md: "12px"
      radius-lg: "20px"
  atmospheric-glass:
    displayName: Atmospheric Glass
    colors:
      background: "#0b1326"
      foreground: "#dae2fd"
      card-bg: "rgba(23, 31, 51, 0.45)"
      border-color: "rgba(255, 255, 255, 0.08)"
      accent-blue: "#adc9eb"
      accent-hover: "#ffffff"
    typography:
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
    borders:
      radius-sm: "4px"
      radius-md: "8px"
      radius-lg: "16px"
  totality-festival:
    displayName: Totality Festival
    colors:
      background: "#121318"
      foreground: "#e3e1e9"
      card-bg: "#1e1f25"
      border-color: "#292a2f"
      accent-blue: "#ffd700"
      accent-hover: "#00e3fd"
    typography:
      fontFamily: "'Space Grotesk', sans-serif"
    borders:
      radius-sm: "0px"
      radius-md: "0px"
      radius-lg: "0px"
  paws-and-paths:
    displayName: Paws & Paths
    colors:
      background: "#f9f9ff"
      foreground: "#151c27"
      card-bg: "#ffffff"
      border-color: "#dce2f3"
      accent-blue: "#f59e0b"
      accent-hover: "#d97706"
    typography:
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    borders:
      radius-sm: "0.75rem"
      radius-md: "0.75rem"
      radius-lg: "1.25rem"
---

# Document Intelligence Theme Guide

This design system defines six visual theme choices for the Document Intelligence application, combining standard states with Google Labs spec-defined configurations.

## Themes & Design Philosophies

### 1. Light Mode (`light`)
- **Philosophy:** Highly legible, clean, high-contrast, professional, and standard workspace feel.
- **Accents:** Azure Blue (`#0078d4`) with light borders and shadows.
- **Use Case:** Bright workspace environments.

### 2. Dark Mode (`dark`)
- **Philosophy:** Eye-strain reducing, modern, developer-focused workspace aesthetic with distinct panel separation.
- **Accents:** Soft Neon Blue (`#2899f5`) with deep dark grey panels (`#201f1e`).
- **Use Case:** Dim workspace environments.

### 3. Glassmorphism Theme (`glass`)
- **Philosophy:** Transparent glass panels, deep backdrop-blur filters, vibrant mesh gradient backgrounds, and rounded organic shapes.
- **Accents:** Violet Purple (`#7c3aed`) with high backdrop-filter blur.
- **Use Case:** High-end creative tools and showcase platforms.

### 4. Atmospheric Glass (`atmospheric-glass`)
- **Philosophy:** Google Labs Atmospheric Glass design spec. Deep slate-blue colors, translucent cards, subtle glowing card highlights, and white accents.
- **Accents:** Silver Blue (`#adc9eb`) and Pure White (`#ffffff`).
- **Use Case:** Sci-fi and premium dark-mode dashboard interfaces.

### 5. Totality Festival (`totality-festival`)
- **Philosophy:** Google Labs Totality Festival design spec. Dark charcoal backgrounds with sharp borders and vibrant neon accents (Gold and Cyan).
- **Accents:** Gold (`#ffd700`) and Cyber Cyan (`#00e3fd`).
- **Use Case:** High-contrast retro-cyberpunk styling.

### 6. Paws & Paths (`paws-and-paths`)
- **Philosophy:** Google Labs Paws & Paths design spec. Light, highly organic curved container cards with warm amber accents.
- **Accents:** Warm Amber (`#f59e0b`).
- **Use Case:** Playful, approachable, and human-centric products.
