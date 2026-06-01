"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Layers, 
  Search, 
  Upload, 
  Check, 
  ArrowRight, 
  Image as ImageIcon,
  Sparkles,
  Info,
  Globe,
  Settings,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Play,
  Trash2,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Copy,
  Code,
  Terminal,
  Grid,
  ExternalLink,
  FileCode,
  Palette,
  LogOut,
  Sliders,
  Menu
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

// Inline Github Icon to avoid version mismatch errors in lucide-react
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// Types
interface ExampleData {
  complex: string[];
  targeted: string[];
  spotting: string[];
}

interface StructuredBlock {
  id: number;
  type: string;
  label: string;
  iconColor: string;
  content: string;
  raw: string;
}

const preprocessMarkdown = (text: string): string => {
  if (!text) return "";
  
  let processed = text;
  
  // 1. Wrap raw or inline-wrapped LaTeX math environments in display math ($$)
  const baseEnvs = ["align", "align*", "gather", "gather*", "equation", "equation*", "split", "cases", "matrix", "pmatrix", "bmatrix", "array"];
  const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const envsPattern = baseEnvs.map(escapeRegex).join("|");
  
  // Matches optional leading/trailing dollar delimiters and wraps in $$
  const unifiedRegex = new RegExp("(\\$\\$?|)?\\s*(\\\\begin\\{(" + envsPattern + ")\\}[\\s\\S]*?\\\\end\\{\\3\\})\\s*(\\$\\$?|)?", "g");
  
  processed = processed.replace(unifiedRegex, (match, leftDollars, content, envName, rightDollars) => {
    return `\n$$\n${content}\n$$\n`;
  });

  // 2. Decode HTML entities and fix inequalities inside all display math ($$ ... $$) and inline math ($ ... $) blocks.
  const decodeHTMLEntities = (str: string) => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'");
  };

  const fixInequalities = (str: string) => {
    return str
      .replace(/<=/g, " \\le ")
      .replace(/>=/g, " \\ge ")
      .replace(/≤/g, " \\le ")
      .replace(/≥/g, " \\ge ")
      .replace(/</g, " \\lt ")
      .replace(/>/g, " \\gt ");
  };

  const cleanMath = (mathContent: string) => {
    return fixInequalities(decodeHTMLEntities(mathContent));
  };

  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => `$$${cleanMath(p1)}$$`);
  processed = processed.replace(/\$([^\$]+?)\$/g, (match, p1) => `$${cleanMath(p1)}$`);

  return processed;
};

export default function Home() {
  // Theme state: "light" | "dark" | "glass" | "atmospheric-glass" | "totality-festival" | "paws-and-paths"
  const [theme, setTheme] = useState<"light" | "dark" | "glass" | "atmospheric-glass" | "totality-festival" | "paws-and-paths">("light");
  const [origin, setOrigin] = useState("http://localhost:7872");

  // Sidebar Display mode: "icon-text" | "icon" | "text"
  const [menuDisplay, setMenuDisplay] = useState<"icon-text" | "icon" | "text">("icon-text");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin || `${window.location.protocol}//${window.location.host}`);
    }
    // Check initial theme from localStorage
    const savedTheme = localStorage.getItem("theme") as typeof theme | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    
    // Check initial menuDisplay from localStorage
    const savedMenuDisplay = localStorage.getItem("menuDisplay") as typeof menuDisplay | null;
    if (savedMenuDisplay === "icon" || savedMenuDisplay === "text" || savedMenuDisplay === "icon-text") {
      setMenuDisplay(savedMenuDisplay);
    }
    
    // Clear existing classes
    document.documentElement.classList.remove(
      "dark", 
      "theme-glass", 
      "theme-fluent", 
      "theme-material",
      "theme-atmospheric-glass",
      "theme-totality-festival",
      "theme-paws-and-paths"
    );
    
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (initialTheme === "glass") {
      document.documentElement.classList.add("theme-glass");
    } else if (initialTheme === "atmospheric-glass") {
      document.documentElement.classList.add("theme-atmospheric-glass");
    } else if (initialTheme === "totality-festival") {
      document.documentElement.classList.add("theme-totality-festival");
    } else if (initialTheme === "paws-and-paths") {
      document.documentElement.classList.add("theme-paws-and-paths");
    }
  }, []);

  const handleThemeChange = (nextTheme: typeof theme) => {
    // Clear existing classes
    document.documentElement.classList.remove(
      "dark", 
      "theme-glass", 
      "theme-fluent", 
      "theme-material",
      "theme-atmospheric-glass",
      "theme-totality-festival",
      "theme-paws-and-paths"
    );
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (nextTheme === "glass") {
      document.documentElement.classList.add("theme-glass");
    } else if (nextTheme === "atmospheric-glass") {
      document.documentElement.classList.add("theme-atmospheric-glass");
    } else if (nextTheme === "totality-festival") {
      document.documentElement.classList.add("theme-totality-festival");
    } else if (nextTheme === "paws-and-paths") {
      document.documentElement.classList.add("theme-paws-and-paths");
    }
    
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Studio Navigation Tabs (Layout Studio is active)
  const [activeTab, setActiveTab] = useState<"doc-parsing" | "element-rec" | "spotting" | "settings">("doc-parsing");
  
  // Example files loaded from backend API
  const [examples, setExamples] = useState<ExampleData>({ complex: [], targeted: [], spotting: [] });
  
  // Active Image Selections
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string>("");
  const [selectedExample, setSelectedExample] = useState<string>("");
  const [previewSrc, setPreviewSrc] = useState<string>("");
  
  // Layout features toggled in settings panel
  const [chartParsing, setChartParsing] = useState(true);
  const [docUnwarping, setDocUnwarping] = useState(false);
  const [orientationClassify, setOrientationClassify] = useState(false);
  
  // Element recognition sub-type selection (when element-rec is active)
  const [elementRecType, setElementRecType] = useState<"Text Recognition" | "Formula Recognition" | "Table Recognition" | "Chart Recognition" | "Seal Recognition">("Text Recognition");
  
  // Active output viewer tab (Microsoft tabs: Content, JSON, Integration Code)
  const [outputTab, setOutputTab] = useState<"content" | "visualization" | "markdown-source" | "json" | "code">("content");

  // Language localization state ("id", "en", "ja", "zh")
  const [lang, setLang] = useState<"id" | "en" | "ja" | "zh">("en");

  const translations = {
    id: {
      studioTitle: "Document Intelligence",
      services: "Layanan AI",
      docIntel: "Kecerdasan Dokumen",
      docParsing: "Parsing Dokumen",
      elementOcr: "OCR Elemen",
      spottingCoords: "Pencarian Koordinat",
      generalLayoutTitle: "General Layout & Parsing",
      elementOcrTitle: "Targeted Element-Level OCR",
      spottingTitle: "Visual Spotting & Detection",
      analyzeOptions: "Opsi Analisis",
      selectModel: "Pilih Model",
      generalModel: "General Layout Model",
      layoutFeatures: "Fitur Tata Letak",
      chartParsing: "Parsing Bagan",
      docUnwarping: "Perataan Dokumen",
      orientation: "Orientasi Otomatis",
      elementTargetType: "Tipe Target Elemen",
      pages: "Halaman",
      allPages: "Semua Halaman (1 dari 1)",
      reprocessLayout: "Proses Ulang Analisis",
      reprocessElement: "Proses Ulang OCR Elemen",
      reprocessSpotting: "Proses Ulang Spotting",
      expandOptions: "Buka Opsi Analisis",
      collapsePanel: "Tutup panel",
      overlays: "Overlay",
      resetScale: "Reset Skala",
      selectDropDoc: "Pilih atau letakkan dokumen",
      uploadDesc: "Unggah gambar (JPEG/PNG) untuk menganalisis tata letak, atau pilih salah satu thumbnail portrait dari galeri sebelah kiri.",
      markdownPreview: "Pratinjau Markdown",
      textOutput: "Hasil Teks",
      visualization: "Visualisasi",
      markdownSource: "Sumber Markdown",
      jsonResult: "Hasil JSON",
      sampleCode: "Kode Contoh",
      copyJson: "Salin JSON",
      copySource: "Salin Sumber",
      copyCode: "Salin Kode",
      rawJson: "Respon JSON Mentah",
      renderedPreview: "Pratinjau Hasil",
      structuredBlocks: "Blok Terstruktur",
      noResults: "Belum ada hasil analisis. Pilih sampel dari galeri kiri atau unggah dokumen untuk memulai.",
      noLogs: "Log respon belum tersedia. Pilih sampel di sebelah kiri dan jalankan analisis untuk memanggil log API.",
      zoomIn: "Perbesar",
      zoomOut: "Perkecil",
      documentCanvas: "Kanvas Dokumen",
      errorAnalysis: "Gagal menjalankan analisis",
      copyBlock: "Salin blok mentah",
      parsingFeatures: "Fitur Parsing",
      chartRecognition: "Pengenalan Bagan",
      chartRecognitionDesc: "Menganalisis komponen logis dari bagan garis, lingkaran, dan batang.",
      docUnwarpingDesc: "Memperbaiki distorsi perspektif dan meratakan halaman yang melengkung.",
      orientationCorrect: "Koreksi Orientasi",
      orientationCorrectDesc: "Mendeteksi sudut rotasi dan menyelaraskan dokumen secara otomatis.",
      spottingFeatures: "Fitur Spotting",
      spottingEngine: "Mesin Koordinat Spotting",
      spottingEngineDesc: "Mengekstrak item tata letak dengan kotak pembatas (x_min, y_min, x_max, y_max) langsung dari piksel gambar.",
      textExtraction: "Ekstraksi Teks",
      formulaParsing: "Parsing Rumus",
      tableRecognition: "Pengenalan Tabel",
      chartAnalysis: "Analisis Bagan",
      sealDetection: "Deteksi Stempel",
      outputRenderMd: "Tampilan Hasil: Markdown",
      noVisualization: "Visualisasi gambar belum tersedia. Pilih sampel di sebelah kiri dan jalankan analisis untuk memuat visualisasi.",
      noMarkdownSource: "Sumber markdown belum tersedia. Pilih sampel di sebelah kiri dan jalankan analisis untuk menarik sumber.",
      deploymentNotice: "Pemberitahuan Penyebaran",
      deploymentNoticeDesc: "Pastikan aplikasi berjalan dan dapat diakses pada port 7872 (baik secara lokal atau melalui pemetaan Nginx) sebelum menjalankan integrasi kode.",
      serverStatus: "Status server: Idle / Siap",
      engineName: "Mesin: API Layanan Dokumen AI",
      reset: "Reset",
      layoutLabel: "Layout",
      elementLabel: "Element",
      spottingLabel: "Spotting",
      themeLight: "Terang (Light)",
      themeDark: "Gelap (Dark)",
      themeGlass: "Kaca (Glass)",
      themeAtmosphericGlass: "Kaca Atmosfer (Atmospheric Glass)",
      themeTotalityFestival: "Festival Totalitas (Totality Festival)",
      themePawsAndPaths: "Cakar & Jalan (Paws & Paths)",
      selectLanguage: "Pilih Bahasa",
      selectTheme: "Pilih Tema Desain"
    },
    en: {
      studioTitle: "Document Intelligence",
      services: "AI Services",
      docIntel: "Document Intelligence",
      docParsing: "Document Parsing",
      elementOcr: "Element OCR",
      spottingCoords: "Spotting Coordinates",
      generalLayoutTitle: "General Layout & Parsing",
      elementOcrTitle: "Targeted Element-Level OCR",
      spottingTitle: "Visual Spotting & Detection",
      analyzeOptions: "Analyze options",
      selectModel: "Select Model",
      generalModel: "General Layout Model",
      layoutFeatures: "Layout Features",
      chartParsing: "Chart parsing",
      docUnwarping: "Doc unwarping",
      orientation: "Orientation",
      elementTargetType: "Element Target Type",
      pages: "Pages",
      allPages: "All Pages (1 of 1)",
      reprocessLayout: "Reprocess Analysis",
      reprocessElement: "Reprocess Element OCR",
      reprocessSpotting: "Reprocess Spotting",
      expandOptions: "Expand Analyze Options",
      collapsePanel: "Collapse panel",
      overlays: "Overlays",
      resetScale: "Reset scale",
      selectDropDoc: "Select or drop document",
      uploadDesc: "Upload image (JPEG/PNG) to analyze layout, or select one of the portrait thumbnails from the left filmstrip rail.",
      markdownPreview: "Markdown Preview",
      textOutput: "Text Output",
      visualization: "Visualization",
      markdownSource: "Markdown Source",
      jsonResult: "JSON Result",
      sampleCode: "Sample Code",
      copyJson: "Copy JSON",
      copySource: "Copy Source",
      copyCode: "Copy Code",
      rawJson: "Raw JSON Response",
      renderedPreview: "Rendered Preview",
      structuredBlocks: "Structured Blocks",
      noResults: "No analysis results compiled yet. Select a sample from the left sidebar or upload a document to get started.",
      noLogs: "No response logs available yet. Select a sample on the left sidebar and run layout analysis to pull API logs.",
      zoomIn: "Zoom In",
      zoomOut: "Zoom Out",
      documentCanvas: "Document Canvas",
      errorAnalysis: "Error running analysis",
      copyBlock: "Copy raw block",
      parsingFeatures: "Parsing Features",
      chartRecognition: "Chart Recognition",
      chartRecognitionDesc: "Parse logical components of line, pie, and bar charts.",
      docUnwarpingDesc: "Correct perspective distortion and unwarp curved pages.",
      orientationCorrect: "Orientation Correct",
      orientationCorrectDesc: "Detect rotation angles and align documents automatically.",
      spottingFeatures: "Spotting Features",
      spottingEngine: "Spotting Coordinate Engine",
      spottingEngineDesc: "Extracts layout items with bounding boxes (x_min, y_min, x_max, y_max) directly from image pixels.",
      textExtraction: "Text Extraction",
      formulaParsing: "Formula Parsing",
      tableRecognition: "Table Recognition",
      chartAnalysis: "Chart Analysis",
      sealDetection: "Seal Detection",
      outputRenderMd: "Output Render: Markdown",
      noVisualization: "No visualization image available yet. Select a sample on the left sidebar and run layout analysis to load the visualization.",
      noMarkdownSource: "No markdown source available yet. Select a sample on the left sidebar and run layout analysis to pull source.",
      deploymentNotice: "Deployment Notice",
      deploymentNoticeDesc: "Ensure the application is running and accessible on port 7872 (either locally or through Nginx mapping) before running code integration.",
      serverStatus: "Server status: Idle / Ready",
      engineName: "Engine: Document AI Serving API",
      reset: "Reset",
      layoutLabel: "Layout",
      elementLabel: "Element",
      spottingLabel: "Spotting",
      themeLight: "Light",
      themeDark: "Dark",
      themeGlass: "Glassmorphism",
      themeAtmosphericGlass: "Atmospheric Glass",
      themeTotalityFestival: "Totality Festival",
      themePawsAndPaths: "Paws & Paths",
      selectLanguage: "Select Language",
      selectTheme: "Select Design Theme"
    },
    ja: {
      studioTitle: "Document Intelligence",
      services: "AI サービス",
      docIntel: "ドキュメント インテリジェンス",
      docParsing: "ドキュメント解析",
      elementOcr: "要素 OCR",
      spottingCoords: "座標検出",
      generalLayoutTitle: "一般レイアウトおよび解析スタジオ",
      elementOcrTitle: "対象要素レベル OCR",
      spottingTitle: "視覚的スポット＆検出",
      analyzeOptions: "解析オプション",
      selectModel: "モデル選択",
      generalModel: "一般レイアウトモデル",
      layoutFeatures: "レイアウト機能",
      chartParsing: "チャート解析",
      docUnwarping: "ドキュメント平坦化",
      orientation: "自動方向補正",
      elementTargetType: "対象要素タイプ",
      pages: "ページ数",
      allPages: "すべてのページ (1/1)",
      reprocessLayout: "解析の再処理",
      reprocessElement: "要素OCRの再処理",
      reprocessSpotting: "スポット検出の再処理",
      expandOptions: "解析オプションを開く",
      collapsePanel: "パネルを閉じる",
      overlays: "オーバーレイ",
      resetScale: "スケールリセット",
      selectDropDoc: "ドキュメントを選択またはドロップ",
      uploadDesc: "画像をアップロードしてレイアウトを解析するか、左のギャラリーからポートレートサムネイルを選択してください。",
      markdownPreview: "マークダウンプレビュー",
      textOutput: "テキスト出力",
      visualization: "可視化結果",
      markdownSource: "マークダウンソース",
      jsonResult: "JSON結果",
      sampleCode: "サンプルコード",
      copyJson: "JSONをコピー",
      copySource: "ソースをコピー",
      copyCode: "コードをコピー",
      rawJson: "生のJSONレスポンス",
      renderedPreview: "レンダリングプレビュー",
      structuredBlocks: "構造化ブロック",
      noResults: "解析結果はまだありません。左のギャラリーからサンプルを選択するか、ドキュメントをアップロードして開始してください。",
      noLogs: "応答ログはまだありません。左のギャラリーからサンプルを選択し、解析を実行してAPIログを取得してください。",
      zoomIn: "拡大",
      zoomOut: "縮小",
      documentCanvas: "ドキュメントキャンバス",
      errorAnalysis: "解析実行エラー",
      copyBlock: "元のブロックをコピー",
      parsingFeatures: "解析機能",
      chartRecognition: "グラフ認識",
      chartRecognitionDesc: "折れ線、円、棒グラフの論理コンポーネントを解析します。",
      docUnwarpingDesc: "パース歪みを補正し、曲がったページを平坦化します。",
      orientationCorrect: "方向補正",
      orientationCorrectDesc: "回転角度を検出し、ドキュメントを自動的に整列します。",
      spottingFeatures: "スポット機能",
      spottingEngine: "座標検出エンジン",
      spottingEngineDesc: "画像ピクセルから境界ボックス（x_min, y_min, x_max, y_max）を持つレイアウト項目を直接抽出します。",
      textExtraction: "テキスト抽出",
      formulaParsing: "数式解析",
      tableRecognition: "表認識",
      chartAnalysis: "グラフ分析",
      sealDetection: "印影検出",
      outputRenderMd: "出力レンダリング: マークダウン",
      noVisualization: "可視化画像はまだありません。左のギャラリーからサンプルを選択し、解析を実行して可視化をロードしてください。",
      noMarkdownSource: "マークダウンソースはまだありません。左のギャラリーからサンプルを選択し、解析を実行してソースを取得してください。",
      deploymentNotice: "デプロイに関する注意",
      deploymentNoticeDesc: "コード統合を実行する前に、アプリケーションが起動しており、ポート 7872（ローカルまたはNginxマッピング経由）でアクセス可能であることを確認してください。",
      serverStatus: "サーバーのステータス: アイドル / 準備完了",
      engineName: "エンジン: ドキュメント AI サービング API",
      reset: "リセット",
      layoutLabel: "レイアウト",
      elementLabel: "要素",
      spottingLabel: "スポット",
      themeLight: "ライト (Light)",
      themeDark: "ダーク (Dark)",
      themeGlass: "グラスモーフィズム",
      themeAtmosphericGlass: "アトモスフェリック・グラス",
      themeTotalityFestival: "トータリティ・フェスティバル",
      themePawsAndPaths: "ポーズ＆パス",
      selectLanguage: "言語の選択",
      selectTheme: "デザインテーマの選択"
    },
    zh: {
      studioTitle: "Document Intelligence",
      services: "AI 服务",
      docIntel: "文档智能",
      docParsing: "文档解析",
      elementOcr: "元素 OCR",
      spottingCoords: "坐标检测",
      generalLayoutTitle: "通用布局与解析工作台",
      elementOcrTitle: "定位元素级 OCR",
      spottingTitle: "视觉标注与检测",
      analyzeOptions: "分析选项",
      selectModel: "选择模型",
      generalModel: "通用布局模型",
      layoutFeatures: "布局特征",
      chartParsing: "图表解析",
      docUnwarping: "文档平整",
      orientation: "自动方向矫正",
      elementTargetType: "目标元素类型",
      pages: "页数",
      allPages: "所有页面 (1/1)",
      reprocessLayout: "重新解析",
      reprocessElement: "重新元素识别",
      reprocessSpotting: "重新坐标检测",
      expandOptions: "展开分析选项",
      collapsePanel: "折叠面板",
      overlays: "图层叠加",
      resetScale: "重置比例",
      selectDropDoc: "选择或拖入文档",
      uploadDesc: "上传 JPEG/PNG 图片以分析布局，或选择左侧的缩略图。",
      markdownPreview: "Markdown 预览",
      textOutput: "文本输出",
      visualization: "可视化",
      markdownSource: "Markdown 源码",
      jsonResult: "JSON 结果",
      sampleCode: "示例代码",
      copyJson: "复制 JSON",
      copySource: "复制源码",
      copyCode: "复制代码",
      rawJson: "原始 JSON 响应",
      renderedPreview: "渲染预览",
      structuredBlocks: "结构化区块",
      noResults: "尚无分析结果。请选择左侧样本或上传文档以开始。",
      noLogs: "尚无日志记录。选择左侧样本并运行解析以获取日志。",
      zoomIn: "放大",
      zoomOut: "缩小",
      documentCanvas: "文档画布",
      errorAnalysis: "分析运行出错",
      copyBlock: "复制原始块",
      parsingFeatures: "解析特征",
      chartRecognition: "图表识别",
      chartRecognitionDesc: "解析折线图、饼图和柱状图的逻辑组件。",
      docUnwarpingDesc: "矫正透视畸变并展平弯曲页面。",
      orientationCorrect: "方向矫正",
      orientationCorrectDesc: "自动检测旋转角度并对齐文档。",
      spottingFeatures: "标注特征",
      spottingEngine: "定位坐标引擎",
      spottingEngineDesc: "直接从图像像素中提取带有边界框（x_min, y_min, x_max, y_max）的布局项。",
      textExtraction: "文本提取",
      formulaParsing: "公式解析",
      tableRecognition: "表格识别",
      chartAnalysis: "图表分析",
      sealDetection: "印章检测",
      outputRenderMd: "输出渲染: Markdown",
      noVisualization: "尚无可视化图像。在左侧选择样本并运行分析。",
      noMarkdownSource: "尚无 Markdown 源码。在左侧选择样本并运行分析。",
      deploymentNotice: "部署注意事项",
      deploymentNoticeDesc: "在运行代码前，请确保服务已启动并可通过端口 7872 访问（本地或通过 Nginx 映射）。",
      serverStatus: "服务器状态: 空闲 / 就绪",
      engineName: "引擎: 文档 AI 服务 API",
      reset: "重置",
      layoutLabel: "布局",
      elementLabel: "元素",
      spottingLabel: "检测",
      themeLight: "浅色 (Light)",
      themeDark: "深色 (Dark)",
      themeGlass: "毛玻璃 (Glass)",
      themeAtmosphericGlass: "气象玻璃 (Atmospheric Glass)",
      themeTotalityFestival: "全食庆典 (Totality Festival)",
      themePawsAndPaths: "爪与小径 (Paws & Paths)",
      selectLanguage: "选择语言",
      selectTheme: "选择设计主题"
    }
  };

  const t = (key: keyof typeof translations.id) => {
    return translations[lang][key] || translations.id[key] || key;
  };

  // Content View Mode: formatted preview vs structured block listing
  const [contentViewMode, setContentViewMode] = useState<"rendered" | "structured">("rendered");

  // Code integration language sub-tab
  const [codeLang, setCodeLang] = useState<"python" | "node" | "curl">("python");
  const [codeCopied, setCodeCopied] = useState(false);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  
  // Overlay display toggle on image canvas (Show bounding boxes)
  const [showOverlays, setShowOverlays] = useState(true);
  const [visualizationUrl, setVisualizationUrl] = useState("");
  
  // Loading & State flags
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Results
  const [parsedText, setParsedText] = useState("");
  const [rawMarkdown, setRawMarkdown] = useState("");
  const [rawApiResponse, setRawApiResponse] = useState<string>("");
  
  // Spotting Results
  const [spottingJson, setSpottingJson] = useState("");
  const [spottingImageUrl, setSpottingImageUrl] = useState("");

  // Processing Time State (in ms)
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Zoom control state for left document panel
  const [zoomScale, setZoomScale] = useState<number>(100);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch examples on mount
  useEffect(() => {
    async function loadExamples() {
      try {
        const res = await fetch("/api/examples");
        if (res.ok) {
          const data = await res.json();
          setExamples(data);
        }
      } catch (err) {
        console.error("Error loading examples:", err);
      }
    }
    loadExamples();
  }, []);

  // Sync preview image when files or selections change
  useEffect(() => {
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewSrc(result);
        setUploadedBase64(result.split(",")[1]);
      };
      reader.readAsDataURL(uploadedFile);
      setSelectedExample("");
    } else if (selectedExample) {
      setPreviewSrc(selectedExample);
      setUploadedBase64("");
    } else {
      setPreviewSrc("");
      setUploadedBase64("");
    }
    // Clear outputs when image source changes
    clearOutputs();
  }, [uploadedFile, selectedExample]);

  // If active tab changes, sync default parameters and clear output
  useEffect(() => {
    clearOutputs();
  }, [activeTab]);

  const clearOutputs = () => {
    setParsedText("");
    setRawMarkdown("");
    setRawApiResponse("");
    setVisualizationUrl("");
    setSpottingJson("");
    setSpottingImageUrl("");
    setErrorMsg("");
    setProcessingTime(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const selectExample = (path: string) => {
    setUploadedFile(null);
    setSelectedExample(path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Auto-analysis runner when clicking gallery image directly
  const handleSelectAndAnalyze = async (imgPath: string, category: "doc-parsing" | "element-rec" | "spotting") => {
    // 1. Set selection states
    selectExample(imgPath);
    
    // 2. Align active model tab
    if (category !== activeTab) {
      setActiveTab(category);
    }
    
    // 3. Trigger API immediately
    setIsLoading(true);
    setErrorMsg("");
    clearOutputs();
    setOutputTab("content");

    const startTime = performance.now();
    try {
      const payload: any = {
        file: null,
        examplePath: imgPath,
        useDocUnwarping: docUnwarping,
        useDocOrientationClassify: orientationClassify,
      };

      if (category === "doc-parsing") {
        payload.useLayoutDetection = true;
        payload.useChartRecognition = chartParsing;
      } else if (category === "element-rec") {
        payload.useLayoutDetection = false;
        payload.promptLabel = elementRecType;
      } else if (category === "spotting") {
        payload.useLayoutDetection = false;
        payload.promptLabel = "spotting";
      }

      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();
      setRawApiResponse(JSON.stringify(data, null, 2));

      if (data.errorCode !== 0) {
        throw new Error(data.errorMsg || "API error occurred.");
      }

      if (category === "spotting") {
        const result = data.result || {};
        const layoutResults = result.layoutParsingResults || [];
        if (layoutResults.length === 0) {
          throw new Error("No spotting elements recognized.");
        }
        const page0 = layoutResults[0] || {};
        const pruned = page0.prunedResult || {};
        const spottingRes = pruned.spotting_res || {};
        setSpottingJson(JSON.stringify(spottingRes, null, 2));
        setParsedText(JSON.stringify(spottingRes, null, 2));
        const outImgs = page0.outputImages || {};
        setSpottingImageUrl(outImgs.spotting_res_img || "");
      } else {
        processApiResponse(data.result);
      }
      setProcessingTime(performance.now() - startTime);
      setShowOverlays(true);
    } catch (err: any) {
      setProcessingTime(null);
      setErrorMsg(err.message || "Failed to run analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  // API Call handlers (Manual Reprocess button actions)
  const handleParseDocument = async () => {
    if (!previewSrc) {
      setErrorMsg("Please upload an image or select a sample image first.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    clearOutputs();
    setOutputTab("content");

    const startTime = performance.now();
    try {
      const payload = {
        file: uploadedBase64 || null,
        examplePath: selectedExample || null,
        useLayoutDetection: true,
        useChartRecognition: chartParsing,
        useDocUnwarping: docUnwarping,
        useDocOrientationClassify: orientationClassify,
      };

      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();
      setRawApiResponse(JSON.stringify(data, null, 2));

      if (data.errorCode !== 0) {
        throw new Error(data.errorMsg || "API error occurred.");
      }

      processApiResponse(data.result);
      setProcessingTime(performance.now() - startTime);
      setShowOverlays(true);
    } catch (err: any) {
      setProcessingTime(null);
      setErrorMsg(err.message || "Failed to connect to parsing engine.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleElementRecognition = async (overrideType?: "Text Recognition" | "Formula Recognition" | "Table Recognition" | "Chart Recognition" | "Seal Recognition") => {
    if (!previewSrc) {
      setErrorMsg("Please upload an image or select a sample image first.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    clearOutputs();
    setOutputTab("content");

    const startTime = performance.now();
    try {
      const payload = {
        file: uploadedBase64 || null,
        examplePath: selectedExample || null,
        useLayoutDetection: false,
        promptLabel: overrideType || elementRecType,
        useDocUnwarping: false,
        useDocOrientationClassify: false,
      };

      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();
      setRawApiResponse(JSON.stringify(data, null, 2));

      if (data.errorCode !== 0) {
        throw new Error(data.errorMsg || "API error occurred.");
      }

      processApiResponse(data.result);
      setProcessingTime(performance.now() - startTime);
      setShowOverlays(true);
    } catch (err: any) {
      setProcessingTime(null);
      setErrorMsg(err.message || "Failed to run element recognition.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotting = async () => {
    if (!previewSrc) {
      setErrorMsg("Please upload an image or select a sample image first.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    clearOutputs();
    setOutputTab("content");

    const startTime = performance.now();
    try {
      const payload = {
        file: uploadedBase64 || null,
        examplePath: selectedExample || null,
        useLayoutDetection: false,
        promptLabel: "spotting",
        useDocUnwarping: false,
        useDocOrientationClassify: false,
      };

      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();
      setRawApiResponse(JSON.stringify(data, null, 2));

      if (data.errorCode !== 0) {
        throw new Error(data.errorMsg || "API error occurred.");
      }

      const result = data.result || {};
      const layoutResults = result.layoutParsingResults || [];
      if (layoutResults.length === 0) {
        throw new Error("No spotting elements recognized.");
      }

      const page0 = layoutResults[0] || {};
      const pruned = page0.prunedResult || {};
      const spottingRes = pruned.spotting_res || {};
      
      setSpottingJson(JSON.stringify(spottingRes, null, 2));
      setParsedText(JSON.stringify(spottingRes, null, 2));

      const outImgs = page0.outputImages || {};
      const spottingImg = outImgs.spotting_res_img || "";
      setSpottingImageUrl(spottingImg);
      setProcessingTime(performance.now() - startTime);
      setShowOverlays(true);
    } catch (err: any) {
      setProcessingTime(null);
      setErrorMsg(err.message || "Failed to run spotting analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const processApiResponse = (result: any) => {
    const layoutResults = (result || {}).layoutParsingResults || [];
    if (layoutResults.length === 0) {
      setParsedText("No content was recognized.");
      setRawMarkdown("");
      setVisualizationUrl("");
      return;
    }

    const page0 = layoutResults[0] || {};
    const mdData = page0.markdown || {};
    let mdText = mdData.text || "";
    const mdImagesMap = mdData.images || {};

    // Replace placeholder images in markdown
    if (mdImagesMap) {
      Object.entries(mdImagesMap).forEach(([placeholder, url]) => {
        mdText = mdText
          .replace(new RegExp(`src="${placeholder}"`, "g"), `src="${url as string}"`)
          .replace(new RegExp(`\\]\\(${placeholder}\\)`, "g"), `](${url as string})`);
      });
    }

    setRawMarkdown(mdText);
    setParsedText(mdText);

    // Bounding Box Layout Image
    const outImgs = page0.outputImages || {};
    const sortedUrls = Object.entries(outImgs)
      .sort()
      .map(([_, url]) => url as string)
      .filter(Boolean);

    let outputImageUrl = "";
    if (sortedUrls.length >= 2) {
      outputImageUrl = sortedUrls[1];
    } else if (sortedUrls.length > 0) {
      outputImageUrl = sortedUrls[0];
    }

    setVisualizationUrl(outputImageUrl);
  };

  const getStructuredBlocks = (text: string) => {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const blocks: {
      id: string;
      type: string;
      label: string;
      iconColor: string;
      content: string;
      raw: string;
    }[] = [];
    
    let currentBlockType: "paragraph" | "heading" | "table" | "formula" | null = null;
    let currentBlockLines: string[] = [];
    
    const finishBlock = (index: number) => {
      if (currentBlockLines.length === 0) return;
      const raw = currentBlockLines.join("\n");
      const trimmedRaw = raw.trim();
      if (!trimmedRaw) {
        currentBlockLines = [];
        currentBlockType = null;
        return;
      }
      
      let type = "Paragraph";
      let label = "Paragraph";
      let iconColor = "bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400";
      let content = trimmedRaw;
      
      if (currentBlockType === "heading") {
        const match = trimmedRaw.match(/^(#{1,6})\s+(.*)$/);
        const level = match ? match[1].length : 1;
        type = `Heading ${level}`;
        label = `Heading ${level}`;
        iconColor = "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
        content = match ? match[2] : trimmedRaw;
      } else if (currentBlockType === "table") {
        type = "Table";
        label = "Table";
        iconColor = "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
        content = trimmedRaw;
      } else if (currentBlockType === "formula") {
        type = "Formula";
        label = "Formula";
        iconColor = "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
        content = trimmedRaw.replace(/^\$\$/g, "").replace(/\$\$$/g, "").trim();
      }
      
      blocks.push({
        id: `block-${index}-${blocks.length}`,
        type,
        label,
        iconColor,
        content,
        raw
      });
      
      currentBlockLines = [];
      currentBlockType = null;
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (trimmedLine === "") {
        finishBlock(i);
        continue;
      }
      
      if (trimmedLine.startsWith("#")) {
        finishBlock(i);
        currentBlockType = "heading";
        currentBlockLines.push(line);
        finishBlock(i);
        continue;
      }
      
      if (trimmedLine.startsWith("|")) {
        if (currentBlockType !== "table") {
          finishBlock(i);
          currentBlockType = "table";
        }
        currentBlockLines.push(line);
        continue;
      }
      
      if (trimmedLine.startsWith("$$")) {
        if (currentBlockType === "formula") {
          currentBlockLines.push(line);
          finishBlock(i);
        } else {
          finishBlock(i);
          currentBlockType = "formula";
          currentBlockLines.push(line);
        }
        continue;
      }
      
      if (currentBlockType === null) {
        currentBlockType = "paragraph";
      } else if (currentBlockType !== "paragraph") {
        finishBlock(i);
        currentBlockType = "paragraph";
      }
      currentBlockLines.push(line);
    }
    
    finishBlock(lines.length);
    return blocks;
  };

  const renderRichContent = (text: string) => {
    if (!text) return <p className="text-slate-455 dark:text-zinc-500 italic text-xs text-center py-12">No analysis results compiled yet. Select a sample from the left sidebar or upload a document to get started.</p>;

    if (activeTab === "spotting") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Spotting Coordinates Map</span>
          </div>
          <div className="font-mono text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre bg-slate-50 dark:bg-zinc-900/60 p-4 border border-slate-200 dark:border-zinc-800 rounded">
            {text}
          </div>
        </div>
      );
    }

    return (
      <div className="markdown-body text-slate-800 dark:text-slate-300 text-xs leading-relaxed space-y-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          urlTransform={(url) => url}
          components={{
            img: ({ node, ...props }) => {
              const src = (node?.properties?.src as string) || props.src;
              return (
                <img
                  {...props}
                  src={src}
                  className="mx-auto rounded border border-slate-200 dark:border-zinc-855 max-h-[280px] object-contain shadow-xs bg-white dark:bg-zinc-900 p-1 my-3"
                />
              );
            },
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4 border border-slate-200 dark:border-zinc-800/80 rounded bg-white dark:bg-[#1a1919] shadow-xs">
                <table {...props} className="w-full text-left border-collapse" />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead {...props} className="bg-slate-50 dark:bg-zinc-850/50 border-b border-slate-200 dark:border-zinc-800" />
            ),
            tr: ({ node, ...props }) => (
              <tr {...props} className="border-b border-slate-100 dark:border-zinc-855/30 hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors" />
            ),
            th: ({ node, ...props }) => (
              <th {...props} className="px-3 py-2 text-xs font-semibold text-slate-705 dark:text-zinc-200" />
            ),
            td: ({ node, ...props }) => (
              <td {...props} className="px-3 py-2 text-xs text-slate-650 dark:text-zinc-350 font-normal" />
            ),
            h1: ({ node, ...props }) => (
              <h1 {...props} className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-[#edebe9] dark:border-zinc-850" />
            ),
            h2: ({ node, ...props }) => (
              <h2 {...props} className="text-base font-bold text-slate-855 dark:text-slate-200 mt-4 mb-2" />
            ),
            h3: ({ node, ...props }) => (
              <h3 {...props} className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1.5" />
            ),
            h4: ({ node, ...props }) => (
              <h4 {...props} className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2 mb-1" />
            ),
            p: ({ node, ...props }) => (
              <p {...props} className="text-slate-750 dark:text-zinc-300 text-xs my-2.5" />
            ),
            ul: ({ node, ...props }) => (
              <ul {...props} className="list-disc list-inside text-xs text-slate-750 dark:text-zinc-300 my-2.5 pl-4" />
            ),
            ol: ({ node, ...props }) => (
              <ol {...props} className="list-decimal list-inside text-xs text-slate-750 dark:text-zinc-300 my-2.5 pl-4" />
            ),
            a: ({ node, ...props }) => (
              <a {...props} className="text-[#0078d4] dark:text-[#2899f5] hover:underline" target="_blank" rel="noopener noreferrer" />
            ),
            code: ({ node, ...props }) => {
              const match = /language-(\w+)/.exec(props.className || '');
              return !match ? (
                <code {...props} className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 text-[#0078d4] dark:text-[#2899f5] font-mono text-xs rounded border border-slate-250/50 dark:border-zinc-700 select-all" />
              ) : (
                <pre className="bg-slate-50 dark:bg-zinc-900/60 p-4 border border-slate-200 dark:border-zinc-800 rounded font-mono text-xs text-slate-700 dark:text-zinc-300 overflow-x-auto my-3">
                  <code {...props} className={props.className} />
                </pre>
              );
            }
          }}
        >
          {preprocessMarkdown(text)}
        </ReactMarkdown>
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", {
        method: "DELETE",
      });
      window.location.href = "/signin";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Check the active visualization source based on state and selections
  const getActiveVisualizationUrl = () => {
    if (activeTab === "spotting") {
      return spottingImageUrl || "";
    }
    return visualizationUrl || "";
  };

  const activeVisualizationUrl = getActiveVisualizationUrl();

  // Copy code blocks helper
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyMarkdown = (text: string) => {
    navigator.clipboard.writeText(text);
    setMarkdownCopied(true);
    setTimeout(() => setMarkdownCopied(false), 2000);
  };

  const pythonCode = `import base64
import requests

# Set endpoint URL matching the local workspace
url = "${origin}/api/parse"
image_path = "document.jpg"

with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

# API payload structure for ${activeTab === "doc-parsing" ? "Document Parsing" : activeTab === "spotting" ? "Spotting" : "Element-level OCR"}
payload = {
    "file": encoded_string,
    "useLayoutDetection": ${activeTab === "doc-parsing" ? "True" : "False"},
    "useChartRecognition": ${chartParsing ? "True" : "False"},
    "useDocUnwarping": ${docUnwarping ? "True" : "False"},
    "useDocOrientationClassify": ${orientationClassify ? "True" : "False"}${activeTab === "element-rec" ? `,\n    "promptLabel": "${elementRecType.toLowerCase()}"` : ""}${activeTab === "spotting" ? `,\n    "promptLabel": "spotting"` : ""}
}

response = requests.post(url, json=payload)
result = response.json()
print("Success:", result["errorCode"] == 0)
`;

  const nodeCode = `const fs = require('fs');

const url = "${origin}/api/parse";
const imagePath = "document.jpg";

const fileBuffer = fs.readFileSync(imagePath);
const base64Image = fileBuffer.toString('base64');

// Payload matching current parameters
const payload = {
  file: base64Image,
  useLayoutDetection: ${activeTab === "doc-parsing" ? "true" : "false"},
  useChartRecognition: ${chartParsing ? "true" : "false"},
  useDocUnwarping: ${docUnwarping ? "true" : "false"},
  useDocOrientationClassify: ${orientationClassify ? "true" : "false"}${activeTab === "element-rec" ? `,\n  promptLabel: "${elementRecType.toLowerCase()}"` : ""}${activeTab === "spotting" ? `,\n  promptLabel: "spotting"` : ""}
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
  console.log("Success:", data.errorCode === 0);
  console.log(data.result);
})
.catch(err => console.error("Error:", err));
`;

  const curlCode = `curl -X POST ${origin}/api/parse \\
  -H "Content-Type: application/json" \\
  -d '{
    "file": "BASE64_IMAGE_DATA_HERE",
    "useLayoutDetection": ${activeTab === "doc-parsing" ? "true" : "false"}${activeTab === "element-rec" ? `,\n    "promptLabel": "${elementRecType.toLowerCase()}"` : ""}${activeTab === "spotting" ? `,\n    "promptLabel": "spotting"` : ""}
  }'
`;

  return (
    <div className="h-screen overflow-hidden bg-[#faf9f8] dark:bg-[#11100f] text-[#323130] dark:text-[#f3f2f1] flex flex-col antialiased select-none font-sans transition-colors duration-200">
      
      {/* 1. Portal Banner Header (Azure Portal Dark Style) */}
      <header className="h-12 bg-[#1f1f1f] border-b border-[#292827] px-4 flex items-center justify-between text-white shrink-0 z-40">
        <div className="flex items-center gap-3">
          {/* Grid Launcher */}
          <div className="h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer">
            <Grid className="h-4.5 w-4.5 text-[#0078d4]" />
          </div>
          <div className="h-4.5 w-[1px] bg-zinc-700" />
          <div className="h-5 w-5 rounded bg-[#0078d4] flex items-center justify-center shadow-xs">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-xs sm:text-sm tracking-wide text-slate-100 flex items-center gap-2">
            {t("studioTitle")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings shortcut button */}
          <button 
            onClick={() => setActiveTab("settings")}
            className={`h-8 w-8 hover:bg-zinc-800 rounded flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === "settings" ? "text-[#0078d4]" : "text-slate-400 hover:text-white"
            }`}
            title="Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>

          <a 
            href="https://github.com/abdshomad/paddle-ocr-1-6-demo" 
            target="_blank"
            className="h-8 w-8 hover:bg-zinc-800 text-slate-400 hover:text-white rounded flex items-center justify-center transition-colors"
            title="GitHub Repository"
          >
            <GithubIcon className="h-4.5 w-4.5" />
          </a>
        </div>
      </header>

      {/* 2. Primary layout body with leftmost navigation rail */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Rail (Azure Vertical rail) */}
        <aside className={`${
          menuDisplay === "icon" ? "w-14 items-center" : "w-52 items-stretch px-3"
        } bg-white dark:bg-[#1b1a19] border-r border-[#edebe9] dark:border-zinc-800 flex flex-col justify-between py-4 shrink-0 hidden sm:flex transition-all duration-200`}>
          <div className="flex flex-col gap-2 w-full">
            {[
              { id: "doc-parsing" as const, label: t("docParsing"), icon: FileText, title: "Document Layout Analysis" },
              { id: "element-rec" as const, label: t("elementOcr"), icon: Layers, title: "Element-level OCR" },
              { id: "spotting" as const, label: t("spottingCoords"), icon: Search, title: "Coordinate Spotting" },
            ].map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); }}
                  className={`rounded-lg transition-all cursor-pointer flex items-center text-left ${
                    menuDisplay === "icon" 
                      ? "h-9 w-9 justify-center relative group" 
                      : "px-3.5 py-2.5 w-full gap-3 text-xs font-semibold"
                  } ${
                    isActive 
                      ? "bg-[#0078d4]/10 dark:bg-zinc-800 text-[#0078d4] dark:text-white font-bold" 
                      : "text-slate-550 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-800 dark:hover:text-white"
                  }`}
                  title={menuDisplay === "icon" ? item.title : undefined}
                >
                  {menuDisplay !== "text" && <Icon className="h-5 w-5 shrink-0" />}
                  {menuDisplay !== "icon" && <span>{item.label}</span>}
                  {menuDisplay === "icon" && (
                    <div className="absolute left-16 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => { setActiveTab("settings"); }}
              className={`rounded-lg transition-all cursor-pointer flex items-center text-left ${
                menuDisplay === "icon" 
                  ? "h-9 w-9 justify-center relative group" 
                  : "px-3.5 py-2.5 w-full gap-3 text-xs font-semibold"
              } ${
                activeTab === "settings" 
                  ? "bg-[#0078d4]/10 dark:bg-zinc-800 text-[#0078d4] dark:text-white font-bold" 
                  : "text-slate-550 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850 hover:text-slate-800 dark:hover:text-white"
              }`}
              title={menuDisplay === "icon" ? "Settings" : undefined}
            >
              {menuDisplay !== "text" && <Settings className="h-5 w-5 shrink-0" />}
              {menuDisplay !== "icon" && <span>Settings</span>}
              {menuDisplay === "icon" && (
                <div className="absolute left-16 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Settings
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* 3. Main Workspace Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Breadcrumb Header */}
          <div className="bg-white dark:bg-[#201f1e] border-b border-[#edebe9] dark:border-zinc-800 px-6 py-2 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#605e5c] dark:text-zinc-400 tracking-wide uppercase">
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  {activeTab === "doc-parsing" ? t("docParsing") : activeTab === "element-rec" ? t("elementOcr") : activeTab === "spotting" ? t("spottingCoords") : "Settings"}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                {activeTab === "doc-parsing" ? t("generalLayoutTitle") : activeTab === "element-rec" ? t("elementOcrTitle") : activeTab === "spotting" ? t("spottingTitle") : "Settings & Preferences"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector on Mobile */}
              <div className="sm:hidden flex bg-[#f3f2f1] dark:bg-zinc-800 p-0.5 rounded border border-[#edebe9] dark:border-zinc-700 gap-0.5">
                <button 
                  onClick={() => setActiveTab("doc-parsing")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${activeTab === "doc-parsing" ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" : "text-slate-550"}`}
                >
                  {t("layoutLabel")}
                </button>
                <button 
                  onClick={() => setActiveTab("element-rec")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${activeTab === "element-rec" ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" : "text-slate-550"}`}
                >
                  {t("elementLabel")}
                </button>
                <button 
                  onClick={() => setActiveTab("spotting")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${activeTab === "spotting" ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" : "text-slate-555"}`}
                >
                  {t("spottingLabel")}
                </button>
              </div>

              {/* Settings Toggle on Mobile */}
              <button 
                onClick={() => setActiveTab(activeTab === "settings" ? "doc-parsing" : "settings")}
                className={`h-8 w-8 rounded sm:hidden flex items-center justify-center transition-colors border cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-[#0078d4]/10 border-[#0078d4] text-[#0078d4]"
                    : "hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-202 dark:border-zinc-800 text-slate-500"
                }`}
                title="Settings"
              >
                <Settings className="h-4.5 w-4.5" />
              </button>

              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Indeterminate Loading Progress Bar (Microsoft Style) */}
          <div className="h-[2px] bg-slate-100 dark:bg-zinc-850 relative overflow-hidden shrink-0">
            {isLoading && (
              <div className="absolute top-0 bottom-0 left-0 bg-[#0078d4] dark:bg-[#2899f5] rounded-full animate-fluent-progress" />
            )}
          </div>

          {/* 4. Split Pane Workspace */}
          <div className="flex-1 flex overflow-hidden bg-[#f3f2f1] dark:bg-[#11100f] relative">
            
            {activeTab === "settings" ? (
              <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-zinc-955/20 p-6 md:p-10 flex justify-center">
                <div className="max-w-3xl w-full space-y-8 animate-fade-in">
                  
                  {/* Settings Title */}
                  <div className="border-b border-[#edebe9] dark:border-zinc-800 pb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Settings className="h-5.5 w-5.5 text-[#0078d4]" />
                      Settings & Preferences
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Configure your document intelligence studio preferences, model default parameters, and interface display modes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* CARD 1: User Interface Settings */}
                    <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-850 rounded-xl p-5 shadow-sm space-y-5">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
                        <Sliders className="h-4 w-4 text-[#0078d4]" />
                        Interface Customization
                      </h3>

                      {/* Display Menu Option */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block">
                          Sidebar Navigation Style
                        </label>
                        <div className="grid grid-cols-3 gap-2 bg-[#f3f2f1] dark:bg-zinc-900 p-1 rounded-lg border border-slate-202 dark:border-zinc-800">
                          {(["icon-text", "icon", "text"] as const).map((mode) => {
                            const isSel = menuDisplay === mode;
                            const labels = {
                              "icon-text": "Icon + Text",
                              "icon": "Icon Only",
                              "text": "Text Only"
                            };
                            return (
                              <button
                                key={mode}
                                onClick={() => {
                                  setMenuDisplay(mode);
                                  localStorage.setItem("menuDisplay", mode);
                                }}
                                className={`py-1.5 px-2 rounded text-[11px] font-semibold transition-all cursor-pointer text-center ${
                                  isSel
                                    ? "bg-white dark:bg-zinc-800 text-[#0078d4] dark:text-white shadow-xs"
                                    : "text-slate-550 hover:text-slate-800 dark:hover:text-zinc-300"
                                }`}
                              >
                                {labels[mode]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Theme selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block">
                          Design Theme
                        </label>
                        <select
                          value={theme}
                          onChange={(e) => handleThemeChange(e.target.value as any)}
                          className="w-full text-xs p-2.5 border border-slate-200 dark:border-zinc-800 rounded bg-[#f3f2f1] dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 outline-none focus:border-[#0078d4] cursor-pointer"
                        >
                          <option value="light">{t("themeLight")}</option>
                          <option value="dark">{t("themeDark")}</option>
                          <option value="glass">{t("themeGlass")}</option>
                          <option value="atmospheric-glass">{t("themeAtmosphericGlass")}</option>
                          <option value="totality-festival">{t("themeTotalityFestival")}</option>
                          <option value="paws-and-paths">{t("themePawsAndPaths")}</option>
                        </select>
                      </div>

                      {/* Language Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block">
                          Language / Bahasa
                        </label>
                        <select
                          value={lang}
                          onChange={(e) => setLang(e.target.value as any)}
                          className="w-full text-xs p-2.5 border border-slate-200 dark:border-zinc-800 rounded bg-[#f3f2f1] dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 outline-none focus:border-[#0078d4] cursor-pointer"
                        >
                          <option value="en">English</option>
                          <option value="id">Bahasa Indonesia</option>
                          <option value="ja">日本語</option>
                          <option value="zh">简体中文</option>
                        </select>
                      </div>
                    </div>

                    {/* CARD 2: Document Parsing Parameters */}
                    <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-855 rounded-xl p-5 shadow-sm space-y-5">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5">
                        <Sparkles className="h-4 w-4 text-[#0078d4]" />
                        Document Parsing Defaults
                      </h3>

                      <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white select-none">
                          <input 
                            type="checkbox" 
                            checked={chartParsing}
                            onChange={(e) => setChartParsing(e.target.checked)}
                            className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 accent-[#0078d4] text-[#0078d4] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                          />
                          <div>
                            <span className="block font-semibold">{t("chartRecognition")}</span>
                            <span className="block text-[11px] text-slate-455 dark:text-zinc-500 font-normal mt-0.5">{t("chartRecognitionDesc")}</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white select-none">
                          <input 
                            type="checkbox" 
                            checked={docUnwarping}
                            onChange={(e) => setDocUnwarping(e.target.checked)}
                            className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 accent-[#0078d4] text-[#0078d4] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                          />
                          <div>
                            <span className="block font-semibold">{t("docUnwarping")}</span>
                            <span className="block text-[11px] text-slate-455 dark:text-zinc-500 font-normal mt-0.5">{t("docUnwarpingDesc")}</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white select-none">
                          <input 
                            type="checkbox" 
                            checked={orientationClassify}
                            onChange={(e) => setOrientationClassify(e.target.checked)}
                            className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 accent-[#0078d4] text-[#0078d4] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                          />
                          <div>
                            <span className="block font-semibold">{t("orientationCorrect")}</span>
                            <span className="block text-[11px] text-slate-455 dark:text-zinc-500 font-normal mt-0.5">{t("orientationCorrectDesc")}</span>
                          </div>
                        </label>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 dark:bg-zinc-950">
              
              {/* LEFT HALF: Document Viewer canvas & filmstrip gallery sidebar */}
              <div className="w-full md:w-1/2 flex flex-col border-r border-[#edebe9] dark:border-zinc-855 overflow-hidden relative bg-white dark:bg-[#151413]">
                
                {/* Doc View Toolbar */}
                <div className="h-10 bg-white dark:bg-[#1e1e1e] border-b border-[#edebe9] dark:border-zinc-800 px-4 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#0078d4]" />
                    {t("documentCanvas")}
                  </span>
                  
                  {/* Bounding box toggles & Zoom items */}
                  <div className="flex items-center gap-3">
                    
                    {previewSrc && (
                      <button
                        onClick={() => {
                          if (activeTab === "doc-parsing") {
                            handleParseDocument();
                          } else if (activeTab === "element-rec") {
                            handleElementRecognition();
                          } else if (activeTab === "spotting") {
                            handleSpotting();
                          }
                        }}
                        disabled={isLoading}
                        className="h-7 px-3 rounded text-[10px] font-bold bg-[#0078d4] hover:bg-[#106ebe] text-white disabled:bg-slate-200 disabled:dark:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-500 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer border-none outline-none"
                        title="Run analysis on current document"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>
                          {isLoading
                            ? (lang === "id" ? "Memproses..." : lang === "ja" ? "実行中..." : lang === "zh" ? "运行中..." : "Running...")
                            : (lang === "id" ? "Jalankan Analisis" : lang === "ja" ? "解析実行" : lang === "zh" ? "运行分析" : "Run Analysis")}
                        </span>
                      </button>
                    )}

                    {previewSrc && <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />}

                    {/* Bounding Box toggler overlay (Eye) */}
                    {activeVisualizationUrl && (
                      <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className={`h-7 px-2.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                          showOverlays 
                            ? "bg-emerald-555 border-emerald-550 text-white dark:bg-emerald-600/20 dark:border-emerald-500/30 dark:text-emerald-400" 
                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-805 text-slate-500 dark:text-zinc-400 hover:bg-slate-55"
                        }`}
                        title={t("overlays")}
                      >
                        {showOverlays ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {t("overlays")}
                      </button>
                    )}

                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />

                    <div className="flex items-center gap-0.5">
                      <button 
                        onClick={() => setZoomScale(Math.max(50, zoomScale - 10))}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title={t("zoomOut")}
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-bold px-1 text-slate-500 select-none">{zoomScale}%</span>
                      <button 
                        onClick={() => setZoomScale(Math.min(200, zoomScale + 10))}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title={t("zoomIn")}
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => setZoomScale(100)}
                        className="px-2 py-0.5 border border-slate-200 dark:border-zinc-800 rounded text-[9px] font-bold text-slate-500 hover:bg-slate-55 dark:hover:bg-zinc-800"
                        title={t("resetScale")}
                      >
                        {t("reset")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-workspace: Vertical Filmstrip gallery on left + Canvas on right */}
                <div className="flex-1 flex overflow-hidden">
                  
                  {/* Left Filmstrip Gallery Sidebar (width 72px, portrait images only, no text) */}
                  <div className="w-[72px] bg-[#faf9f8] dark:bg-[#1b1a19] border-r border-[#edebe9] dark:border-zinc-850 flex flex-col items-center py-3.5 gap-3 shrink-0 overflow-y-auto select-none scrollbar-thin">
                    
                    {(() => {
                      const activeGallery = 
                        activeTab === "doc-parsing" ? examples.complex :
                        activeTab === "element-rec" ? examples.targeted :
                        examples.spotting;

                      if (activeGallery.length === 0) {
                        return (
                          <div className="h-5 w-5 border-2 border-t-transparent border-[#0078d4] rounded-full animate-spin mt-4" />
                        );
                      }

                      return activeGallery.map((imgPath, index) => {
                        const isSelected = selectedExample === imgPath;
                        const filename = imgPath.split("/").pop() || `Sample ${index + 1}`;
                        
                        return (
                          <div
                            key={index}
                            onClick={() => {
                              handleSelectAndAnalyze(imgPath, activeTab);
                            }}
                              className={`h-20 w-14 rounded border cursor-pointer relative group transition-all shrink-0 overflow-hidden ${
                                isSelected
                                  ? "border-[#0078d4] ring-2 ring-[#0078d4]/20 scale-95"
                                  : "border-slate-205 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-650 hover:scale-95"
                              }`}
                              title={filename}
                            >
                              <img 
                                src={imgPath} 
                                alt={filename} 
                                className="w-full h-full object-cover aspect-[3/4]" 
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-[#0078d4]/10 flex items-center justify-center">
                                  <div className="h-4.5 w-4.5 bg-[#0078d4] rounded-full flex items-center justify-center shadow-xs">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </div>
                                </div>
                              )}
                              {/* Hover filename label tooltip */}
                              <div className="absolute left-16 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                {filename}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                  {/* Document Canvas (occupies rest of workspace) */}
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex-1 overflow-auto p-0 flex items-center justify-center bg-slate-50/60 dark:bg-zinc-955/20"
                  >
                    {previewSrc ? (
                      <div 
                        className="relative transition-transform duration-200 w-full h-full flex items-center justify-center"
                        style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: "center center" }}
                      >
                        {/* Bounding box visual overlay */}
                        <img 
                          src={showOverlays && activeVisualizationUrl ? activeVisualizationUrl : previewSrc} 
                          alt="Active document viewport" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={triggerUploadClick}
                        className="border-2 border-dashed border-slate-355 dark:border-zinc-800 rounded-xl p-8 bg-white dark:bg-zinc-900/30 text-center max-w-sm cursor-pointer shadow-xs hover:border-[#0078d4] dark:hover:border-zinc-600 transition-colors flex flex-col items-center gap-3 group"
                      >
                        <div className="h-11 w-11 rounded-full bg-[#0078d4]/10 flex items-center justify-center text-[#0078d4] group-hover:scale-105 transition-transform">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{t("selectDropDoc")}</h3>
                          <p className="text-xs text-slate-455 dark:text-zinc-505 mt-1">
                            {t("uploadDesc")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT HALF: Extracted Results panel */}
              <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-[#1e1e1e] overflow-hidden relative">
                
                {/* Results Header with Microsoft Tab styles */}
                <div className="h-10 bg-white dark:bg-[#1e1e1e] border-b border-[#edebe9] dark:border-zinc-800 px-4 flex items-center justify-between shrink-0">
                  <div className="flex gap-4.5 md:gap-5 overflow-x-auto scrollbar-none shrink-0 pr-2">
                    <button 
                      onClick={() => setOutputTab("content")}
                      className={`text-xs font-semibold h-10 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        outputTab === "content" 
                          ? "border-[#0078d4] text-[#0078d4] dark:text-white" 
                          : "border-transparent text-slate-550 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {activeTab === "spotting" ? t("textOutput") : t("markdownPreview")}
                    </button>
                    <button 
                      onClick={() => setOutputTab("visualization")}
                      className={`text-xs font-semibold h-10 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        outputTab === "visualization" 
                          ? "border-[#0078d4] text-[#0078d4] dark:text-white" 
                          : "border-transparent text-slate-550 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("visualization")}
                    </button>
                    {activeTab !== "spotting" && (
                      <button 
                        onClick={() => setOutputTab("markdown-source")}
                        className={`text-xs font-semibold h-10 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          outputTab === "markdown-source" 
                            ? "border-[#0078d4] text-[#0078d4] dark:text-white" 
                            : "border-transparent text-slate-550 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        {t("markdownSource")}
                      </button>
                    )}
                    <button 
                      onClick={() => setOutputTab("json")}
                      className={`text-xs font-semibold h-10 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        outputTab === "json" 
                          ? "border-[#0078d4] text-[#0078d4] dark:text-white" 
                          : "border-transparent text-slate-550 hover:text-slate-805 dark:hover:text-white"
                      }`}
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      {t("jsonResult")}
                    </button>
                    <button 
                      onClick={() => setOutputTab("code")}
                      className={`text-xs font-semibold h-10 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        outputTab === "code" 
                          ? "border-[#0078d4] text-[#0078d4] dark:text-white" 
                          : "border-transparent text-slate-550 hover:text-slate-855 dark:hover:text-white"
                      }`}
                    >
                      <Code className="h-3.5 w-3.5" />
                      {t("sampleCode")}
                    </button>
                  </div>

                  {/* Actions inside header */}
                  {parsedText && outputTab === "content" && (
                    <button
                      onClick={() => handleCopyCode(parsedText)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors text-slate-555 hover:text-slate-805 dark:hover:text-white cursor-pointer"
                      title={t("copySource")}
                    >
                      {codeCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {/* Inner Results panel Content */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-55/60 dark:bg-zinc-950/20">
                  
                  {activeTab === "element-rec" && (
                    <div className="mb-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 shadow-xs">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 block mb-2 uppercase tracking-wider">
                        {lang === "id" ? "Tipe Elemen Target" : lang === "ja" ? "ターゲット要素タイプ" : lang === "zh" ? "目标元素类型" : "Target Element Type"}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(["Text Recognition", "Formula Recognition", "Table Recognition", "Chart Recognition", "Seal Recognition"] as const).map((type) => {
                          const isSel = elementRecType === type;
                          const labels = {
                            "Text Recognition": lang === "id" ? "Teks" : lang === "ja" ? "テキスト" : lang === "zh" ? "文本" : "Text",
                            "Formula Recognition": lang === "id" ? "Formula" : lang === "ja" ? "数式" : lang === "zh" ? "公式" : "Formula",
                            "Table Recognition": lang === "id" ? "Tabel" : lang === "ja" ? "表" : lang === "zh" ? "表格" : "Table",
                            "Chart Recognition": lang === "id" ? "Bagan" : lang === "ja" ? "図表" : lang === "zh" ? "图表" : "Chart",
                            "Seal Recognition": lang === "id" ? "Segel" : lang === "ja" ? "印影" : lang === "zh" ? "印章" : "Seal"
                          };
                          return (
                            <button
                              key={type}
                              onClick={() => {
                                setElementRecType(type);
                                if (previewSrc) {
                                  handleElementRecognition(type);
                                }
                              }}
                              className={`py-1.5 px-3 rounded text-xs font-semibold cursor-pointer transition-all border ${
                                isSel
                                  ? "bg-[#0078d4] border-[#0078d4] text-white shadow-xs"
                                  : "bg-slate-55 border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700"
                              }`}
                            >
                              {labels[type]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 rounded-md flex items-start gap-2.5 text-red-700 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold">Error running analysis: {errorMsg}</span>
                    </div>
                  )}

                  {/* A. CONTENT TAB */}
                  {outputTab === "content" && (
                    <div className="space-y-4">
                      
                      {/* Secondary toolbar: rendered preview vs structured timeline */}
                      {parsedText && (
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800/80 pb-2">
                          <div className="flex bg-[#f3f2f1] dark:bg-zinc-900 p-0.5 rounded border border-[#edebe9] dark:border-zinc-800 gap-0.5 text-[10px]">
                            <button
                              onClick={() => setContentViewMode("rendered")}
                              className={`px-3 py-1 rounded-sm font-semibold transition-all cursor-pointer ${
                                contentViewMode === "rendered" 
                                  ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" 
                                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                              }`}
                            >
                              Rendered Preview
                            </button>
                            <button
                              onClick={() => setContentViewMode("structured")}
                              className={`px-3 py-1 rounded-sm font-semibold transition-all cursor-pointer ${
                                contentViewMode === "structured" 
                                  ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" 
                                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                              }`}
                            >
                              {t("structuredBlocks")}
                            </button>
                          </div>
                          
                          {contentViewMode === "rendered" && (
                            <button
                              onClick={() => handleCopyMarkdown(parsedText)}
                              className="text-[10px] font-bold text-[#0078d4] dark:text-indigo-400 hover:text-[#106ebe] transition-colors flex items-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-850 px-2.5 py-1 border border-slate-200 dark:border-zinc-800 rounded shadow-xs"
                            >
                              {markdownCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy Markdown</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {parsedText && contentViewMode === "rendered" && (
                        <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-850 rounded-lg p-5 shadow-xs relative overflow-x-auto min-h-[200px]">
                          {renderRichContent(parsedText)}
                        </div>
                      )}

                      {parsedText && contentViewMode === "structured" && (
                        <div className="space-y-3">
                          {getStructuredBlocks(parsedText).map((block) => (
                            <div key={block.id} className="group flex gap-4 p-3.5 bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-lg transition-colors shadow-xs">
                              <div className={`h-8 w-8 shrink-0 rounded flex items-center justify-center ${block.iconColor}`}>
                                {block.type.startsWith("Heading") ? (
                                  <span className="font-bold text-xs uppercase">H</span>
                                ) : block.type === "Table" ? (
                                  <Layers className="h-4 w-4" />
                                ) : block.type === "Formula" ? (
                                  <span className="font-bold text-xs">∑</span>
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold text-[#0078d4] dark:text-indigo-400 tracking-wider uppercase">
                                    {block.label}
                                  </span>
                                  <button
                                    onClick={() => handleCopyCode(block.raw)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-55/60 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-slate-850 dark:hover:text-slate-205"
                                    title={t("copyBlock")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="text-xs text-slate-700 dark:text-zinc-300 font-medium mt-1 leading-normal whitespace-pre-wrap">
                                  {block.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!parsedText && (
                        <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-850 rounded-lg p-5 shadow-xs text-center py-12">
                          <p className="text-slate-450 dark:text-zinc-500 italic text-xs">
                            {t("noResults")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* B. VISUALIZATION TAB */}
                  {outputTab === "visualization" && (
                    <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-850 rounded-lg p-5 shadow-xs flex flex-col items-center justify-center w-full h-full min-h-[400px]">
                      {activeVisualizationUrl ? (
                        <div className="border border-slate-200 dark:border-zinc-800 p-2.5 shadow-md rounded relative bg-slate-50/20 dark:bg-zinc-950/20 w-full h-full flex items-center justify-center max-w-full">
                          <img 
                            src={activeVisualizationUrl} 
                            alt="Detection Visualization" 
                            className="w-full h-auto max-h-[75vh] object-contain rounded"
                          />
                        </div>
                      ) : (
                        <p className="text-slate-450 dark:text-zinc-500 italic text-xs py-12 text-center">
                          {t("noVisualization")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* C. MARKDOWN SOURCE TAB */}
                  {outputTab === "markdown-source" && (
                    <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-855 rounded-lg p-4 shadow-xs relative">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-zinc-800/80">
                        <span className="text-[10px] font-bold text-slate-455 dark:text-zinc-500 uppercase tracking-wide">
                          {t("markdownSource")}
                        </span>
                        {rawMarkdown && (
                          <button
                            onClick={() => handleCopyCode(rawMarkdown)}
                            className="text-[10px] font-bold text-[#0078d4] hover:text-[#106ebe] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            {t("copySource")}
                          </button>
                        )}
                      </div>
                      <pre className="font-mono text-[10px] text-slate-650 dark:text-[#a5b4fc] leading-normal whitespace-pre-wrap select-all max-h-[500px] overflow-auto">
                        {rawMarkdown || <span className="text-slate-400 dark:text-zinc-500 italic font-sans">{t("noMarkdownSource")}</span>}
                      </pre>
                    </div>
                  )}

                  {/* D. JSON TAB */}
                  {outputTab === "json" && (
                    <div className="bg-white dark:bg-[#1a1919] border border-[#edebe9] dark:border-zinc-855 rounded-lg p-4 shadow-xs relative">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-zinc-800/80">
                        <span className="text-[10px] font-bold text-slate-455 dark:text-zinc-505 uppercase tracking-wide">
                          {t("rawJson")}
                        </span>
                        {rawApiResponse && (
                          <button
                            onClick={() => handleCopyCode(rawApiResponse)}
                            className="text-[10px] font-bold text-[#0078d4] hover:text-[#106ebe] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            {t("copyJson")}
                          </button>
                        )}
                      </div>
                      <pre className="font-mono text-[10px] text-slate-650 dark:text-[#a5b4fc] leading-normal whitespace-pre-wrap select-all max-h-[500px] overflow-auto">
                        {rawApiResponse || <span className="text-slate-400 dark:text-zinc-500 italic font-sans">{t("noLogs")}</span>}
                      </pre>
                    </div>
                  )}

                  {/* C. CODE TAB */}
                  {outputTab === "code" && (
                    <div className="space-y-4">
                      
                      {/* Language Selection bar */}
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
                        <div className="flex bg-[#f3f2f1] dark:bg-zinc-900 p-0.5 rounded border border-[#edebe9] dark:border-zinc-800 gap-0.5 text-[10px]">
                          <button
                            onClick={() => setCodeLang("python")}
                            className={`px-3 py-1 rounded-sm font-semibold transition-all cursor-pointer ${
                              codeLang === "python" 
                                ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" 
                                : "text-slate-555 hover:text-slate-850"
                            }`}
                          >
                            Python
                          </button>
                          <button
                            onClick={() => setCodeLang("node")}
                            className={`px-3 py-1 rounded-sm font-semibold transition-all cursor-pointer ${
                              codeLang === "node" 
                                ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" 
                                : "text-slate-555 hover:text-slate-850"
                            }`}
                          >
                            Node.js
                          </button>
                          <button
                            onClick={() => setCodeLang("curl")}
                            className={`px-3 py-1 rounded-sm font-semibold transition-all cursor-pointer ${
                              codeLang === "curl" 
                                ? "bg-white dark:bg-zinc-700 text-[#0078d4] dark:text-white shadow-xs" 
                                : "text-slate-555 hover:text-slate-850"
                            }`}
                          >
                            cURL
                          </button>
                        </div>

                        <button
                          onClick={() => handleCopyCode(codeLang === "python" ? pythonCode : codeLang === "node" ? nodeCode : curlCode)}
                          className="text-[10px] font-bold text-[#0078d4] hover:text-[#106ebe] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {t("copyCode")}
                        </button>
                      </div>

                      {/* Display Code Editor Layout */}
                      <div className="bg-zinc-950 text-zinc-100 rounded-lg border border-zinc-800 p-4 font-mono text-[10.5px] leading-relaxed overflow-x-auto shadow-md">
                        <pre className="select-all">
                          {codeLang === "python" ? pythonCode : codeLang === "node" ? nodeCode : curlCode}
                        </pre>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs leading-relaxed text-slate-500 flex gap-2">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                        <div>
                          <span className="font-semibold text-slate-755 dark:text-zinc-300 block mb-0.5">{t("deploymentNotice")}</span>
                          {t("deploymentNoticeDesc")}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Extracted results Footer bar */}
                <div className="h-8 bg-[#f3f2f1] dark:bg-[#1b1a19] border-t border-[#edebe9] dark:border-zinc-800 px-4 flex items-center justify-between text-[10px] text-slate-550 shrink-0 select-none font-semibold">
                  <span>
                    {t("serverStatus")}
                    {processingTime !== null && ` | ${(processingTime / 1000).toFixed(3)}s`}
                  </span>
                  <span>{t("engineName")}</span>
                </div>

              </div>

            </div>
          )}
        </div>

        </main>

      </div>

    </div>
  );
}
