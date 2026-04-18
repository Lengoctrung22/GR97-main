import { useCallback, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle,
  ChevronRight,
  FileImage,
  Image as ImageIcon,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { api } from "../lib/api";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 640;
const IMAGE_COMPRESSION_QUALITY = 0.55;
const ANALYSIS_TIMEOUT_MS = 25000;
const DEFAULT_DISCLAIMER =
  "Day chi la phan tich so bo tu AI. Hay tham khao y kien bac si chuyen khoa de duoc chan doan chinh xac va dieu tri kip thoi.";
const VALID_URGENCY = new Set(["low", "medium", "high", "critical"]);
const VALID_ACTIONS = new Set(["emergency", "urgent", "consult_doctor", "monitor", "try_later"]);

const IMAGE_TYPES = [
  { value: "xray", label: "X-Quang", description: "Phoi, xuong, nguc" },
  { value: "ct_mri", label: "CT/MRI", description: "Cat lop, than kinh" },
  { value: "skin", label: "Da lieu", description: "Mun, phat ban, ton thuong" },
  { value: "eye", label: "Nhan khoa", description: "Mat, vong mac" },
  { value: "wound", label: "Vet thuong", description: "Bong, cat, chan thuong" },
  { value: "ultrasound", label: "Sieu am", description: "Tim, bung, thai" },
  { value: "general", label: "Tong quat", description: "Hinh anh y khoa khac" },
];

const URGENCY_CONFIG = {
  low: { label: "Thap", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
  medium: { label: "Trung binh", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Info },
  high: { label: "Cao", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: AlertTriangle },
  critical: { label: "Nguy cap", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertTriangle },
};

const ACTION_LABELS = {
  emergency: { text: "Di cap cuu ngay", color: "bg-gradient-to-r from-red-600 to-red-700" },
  urgent: { text: "Di kham trong 24 gio", color: "bg-gradient-to-r from-orange-500 to-orange-600" },
  consult_doctor: { text: "Dat lich hen bac si", color: "bg-gradient-to-r from-blue-500 to-blue-600" },
  monitor: { text: "Theo doi tai nha", color: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
  try_later: { text: "Thu lai sau", color: "bg-gradient-to-r from-slate-500 to-slate-600" },
};

const stringifyValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const toStringArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => stringifyValue(item)).filter(Boolean);
  const singleValue = stringifyValue(value);
  return singleValue ? [singleValue] : [];
};

const normalizeAnalysisResult = (payload, selectedImageType) => ({
  success: payload?.success !== false,
  imageType: IMAGE_TYPES.some((item) => item.value === payload?.imageType) ? payload.imageType : selectedImageType,
  imageTypeLabel: stringifyValue(payload?.imageTypeLabel),
  analysis: stringifyValue(payload?.analysis) || "Chua the trich xuat noi dung phan tich ro rang tu AI.",
  warnings: toStringArray(payload?.warnings),
  recommendedAction: VALID_ACTIONS.has(payload?.recommendedAction) ? payload.recommendedAction : "consult_doctor",
  specialty: stringifyValue(payload?.specialty) || null,
  urgency: VALID_URGENCY.has(payload?.urgency) ? payload.urgency : "medium",
  disclaimer: stringifyValue(payload?.disclaimer) || DEFAULT_DISCLAIMER,
});

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Khong the doc file hinh anh."));
    reader.onload = () => {
      const sourceDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!sourceDataUrl) return reject(new Error("Du lieu hinh anh khong hop le."));
      const img = new window.Image();
      img.onerror = () => {
        const base64 = sourceDataUrl.split(",")[1] || "";
        return base64 ? resolve({ previewUrl: sourceDataUrl, base64 }) : reject(new Error("Khong the mo hinh anh da tai len."));
      };
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas khong kha dung.");
          let { width, height } = img;
          if (width > height && width > MAX_IMAGE_DIMENSION) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else if (height > MAX_IMAGE_DIMENSION) {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", IMAGE_COMPRESSION_QUALITY);
          const base64 = compressedDataUrl.split(",")[1] || "";
          if (!base64) throw new Error("Khong the nen hinh anh.");
          resolve({ previewUrl: compressedDataUrl, base64 });
        } catch {
          const base64 = sourceDataUrl.split(",")[1] || "";
          return base64 ? resolve({ previewUrl: sourceDataUrl, base64 }) : reject(new Error("Khong the xu ly hinh anh."));
        }
      };
      img.src = sourceDataUrl;
    };
    reader.readAsDataURL(file);
  });



export default function MedicalImageAnalysis() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageType, setImageType] = useState("xray");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef(null);
  const selectedType = IMAGE_TYPES.find((type) => type.value === imageType) || IMAGE_TYPES[0];

  const processFile = async (file) => {
    if (!file.type.startsWith("image/")) return setError("Vui long chon file hinh anh.");
    if (file.size > MAX_IMAGE_SIZE_BYTES) return setError("Hinh anh khong duoc vuot qua 10MB.");
    setError(null);
    setResult(null);
    setAnalysisProgress(0);
    setIsPreparingImage(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const processedImage = await compressImage(file);
      setImagePreview(processedImage.previewUrl);
      setImage(processedImage.base64);
    } catch (processingError) {
      console.error("Image processing error:", processingError);
      setImage(null);
      setImagePreview(null);
      setError("Khong the doc hoac toi uu hinh anh nay. Vui long thu anh khac.");
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") setDragActive(true);
    if (event.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleAnalyze = async () => {
    if (!image) return setError("Vui long chon hinh anh.");
    setIsLoading(true);
    setError(null);
    setResult(null);
    setAnalysisProgress(0);
    const controller = new AbortController();
    const progressInterval = window.setInterval(() => {
      setAnalysisProgress((previous) => (previous >= 90 ? previous : Math.min(previous + Math.random() * 15, 90)));
    }, 500);
    const timeoutId = window.setTimeout(() => controller.abort("analysis-timeout"), ANALYSIS_TIMEOUT_MS);
    try {
      const response = await api.post("/chat/analyze-image", { image, imageType, additionalContext }, { signal: controller.signal, timeout: ANALYSIS_TIMEOUT_MS + 5000 });
      setAnalysisProgress(100);
      setResult(normalizeAnalysisResult(response.data, imageType));
    } catch (requestError) {
      if (requestError.code === "ERR_CANCELED") setError("AI dang xu ly qua lau. Vui long thu lai voi anh nho hon hoac thu lai sau it phut.");
      else if (requestError.code === "ECONNABORTED") setError("Yeu cau bi timeout. Vui long thu lai hoac su dung anh nho hon.");
      else if (requestError.response?.status === 429) setError("Server dang ban. Vui long cho vai giay va thu lai.");
      else setError(requestError.response?.data?.message || "Loi khi phan tich hinh anh. Vui long thu lai.");
    } finally {
      window.clearTimeout(timeoutId);
      window.clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setImageType("xray");
    setAdditionalContext("");
    setResult(null);
    setError(null);
    setAnalysisProgress(0);
    setIsPreparingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="medical-analysis-container">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="medical-analysis-hero">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                <Brain className="h-4 w-4" />
                Medical imaging workspace
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">Phan tich hinh anh y khoa ro rang, gon va chuyen nghiep hon</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">Luot lam viec moi uu tien toc do xu ly, trang thai de theo doi va bao cao de ban doc nhanh truoc khi can chuyen cho bac si.</p>
            </div>
            <div className="medical-analysis-feature-grid">
              {[
                ["AI optimized", "Anh tu dong nen", "Giam tre va giu UI on dinh."],
                ["Structured output", "Bao cao de doc", "Tap trung vao muc do, canh bao, huong xu tri."],
                ["Clinical handoff", "San sang cho bac si", "De tiep tuc tu van khi can."],
              ].map(([eyebrow, title, desc]) => (
                <div key={title} className="medical-analysis-feature">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="medical-analysis-layout">
          <div className="medical-analysis-main">
            <section className="medical-analysis-section">
              <div className="medical-analysis-header">
                <div className="medical-analysis-icon teal">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="medical-analysis-header-text">
                  <p>Step 1</p>
                  <h3>Chon nhom hinh anh</h3>
                  <p>Chon dung loai hinh de AI su dung boi canh phu hop khi phan tich.</p>
                </div>
              </div>
              <div className="medical-analysis-type-grid">
                {IMAGE_TYPES.map((type) => {
                  const active = imageType === type.value;
                  return (
                    <button key={type.value} type="button" onClick={() => setImageType(type.value)} className={`medical-analysis-type-card ${active ? "active" : ""}`}>
                      <div className="medical-analysis-type-info">
                        <h4>{type.label}</h4>
                        <p>{type.description}</p>
                      </div>
                      <div className={`medical-analysis-radio ${active ? "active" : ""}`} />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="medical-analysis-section">
              <div className="medical-analysis-header">
                <div className="medical-analysis-icon teal">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="medical-analysis-header-text">
                  <p>Step 2</p>
                  <h3>Tai hinh anh dau vao</h3>
                  <p>Ho tro keo tha, chon tu thu vien anh hoac chup nhanh tu dien thoai.</p>
                </div>
              </div>
              <div className={`medical-analysis-upload-area ${dragActive ? "drag-active" : imagePreview ? "has-image" : ""}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                {imagePreview ? (
                  <div className="medical-analysis-image-preview">
                    <div className="medical-analysis-image-card">
                      <img src={imagePreview} alt="Preview" />
                      <div className="medical-analysis-image-overlay">
                        <div className="medical-analysis-image-status">
                          {isPreparingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          <span>{isPreparingImage ? "Dang toi uu anh" : "Anh san sang de phan tich"}</span>
                        </div>
                        <span className="medical-analysis-image-badge">{selectedType.label}</span>
                      </div>
                    </div>
                    <div className="medical-analysis-image-sidebar">
                      {[
                        ["Loai phan tich", selectedType.label],
                        ["Trang thai", isPreparingImage ? "Dang chuan hoa du lieu anh" : "Da tai len thanh cong"],
                        ["Khuyen nghi", "Them boi canh lam sang de AI danh gia tot hon."],
                      ].map(([label, value]) => (
                        <div key={label} className="medical-analysis-info-card">
                          <div className="medical-analysis-info-item">
                            <p className="medical-analysis-info-label">{label}</p>
                            <p className="medical-analysis-info-value">{value}</p>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={handleReset} className="medical-analysis-remove-btn">
                        <X size={16} />
                        Xoa va tai anh khac
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="medical-analysis-upload-icon">
                      <Upload className="h-9 w-9" />
                    </div>
                    <h4 className="medical-analysis-upload-title">Keo tha anh vao day hoac chon tu thiet bi</h4>
                    <p className="medical-analysis-upload-desc">Ho tro JPG, PNG, WebP toi da 10MB. He thong tu dong nen anh de giam thoi gian cho va tranh treo trang.</p>
                    <div className="medical-analysis-upload-buttons">
                      <label className="cursor-pointer">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        <span className="btn-dark">
                          <Upload size={18} />
                          Chon tu thu vien anh
                        </span>
                      </label>
                      <label className="cursor-pointer">
                        <input type="file" onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />
                        <span className="btn-secondary">
                          <Camera size={18} />
                          Chup anh nhanh
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="medical-analysis-section">
              <div className="medical-analysis-header">
                <div className="medical-analysis-icon amber">
                  <Info className="h-5 w-5" />
                </div>
                <div className="medical-analysis-header-text">
                  <p>Step 3</p>
                  <h3>Bo sung boi canh lam sang</h3>
                  <p>Thong tin trieu chung va moc thoi gian se giup ket qua de doc va dung huong hon.</p>
                </div>
              </div>
              <textarea value={additionalContext} onChange={(event) => setAdditionalContext(event.target.value)} placeholder="Vi du: Ho keo dai 5 ngay, sot nhe, dau nguc ben phai, da dung thuoc khang sinh 2 ngay..." className="medical-analysis-context" rows={5} />
            </section>

            {error ? (
              <div className="medical-analysis-alert error">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Khong the hoan tat phan tich</p>
                  <p className="mt-1 text-sm leading-6">{error}</p>
                </div>
              </div>
            ) : null}

            <section className="medical-analysis-analyze-section">
              <div className="medical-analysis-analyze-header">
                <div>
                  <p className="medical-analysis-analyze-title">Ready for review</p>
                  <h3 className="medical-analysis-analyze-subtitle">Khoi dong phien danh gia AI</h3>
                  <p className="medical-analysis-analyze-desc">He thong uu tien toc do xu ly, tra ve ket qua co cau truc va giu giao dien on dinh.</p>
                </div>
              </div>
              <div className="medical-analysis-analyze-actions">
                <button type="button" onClick={handleReset} className="medical-analysis-reset-btn">
                  <RotateCcw size={18} />
                  Dat lai
                </button>
                <button type="button" onClick={handleAnalyze} disabled={!image || isLoading || isPreparingImage} className="medical-analysis-analyze-btn">
                  {isPreparingImage ? <><Loader2 className="h-4 w-4 animate-spin" />Dang chuan bi anh</> : isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Dang phan tich</> : <><Sparkles size={18} />Phan tich voi AI<ChevronRight size={16} /></>}
                </button>
              </div>
            </section>
          </div>

          <div className="medical-analysis-sidebar">
            <section className="medical-analysis-sidebar-card dark">
              <p className="medical-analysis-sidebar-title">Session brief</p>
              <div className="medical-analysis-sidebar-items">
                {[
                  ["Loai anh", selectedType.label],
                  ["Tinh trang", imagePreview ? (isPreparingImage ? "Dang toi uu" : "San sang gui AI") : "Chua co anh"],
                  ["Boi canh lam sang", additionalContext.trim() ? "Da bo sung thong tin" : "Chua co ghi chu"],
                ].map(([label, value]) => (
                  <div key={label} className="medical-analysis-sidebar-item">
                    <p className="medical-analysis-sidebar-item-label">{label}</p>
                    <p className="medical-analysis-sidebar-item-value">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="medical-analysis-result-card">
              <div className="medical-analysis-header">
                <div className="medical-analysis-icon blue">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="medical-analysis-header-text">
                  <p>AI report</p>
                  <h3>Bao cao phan tich</h3>
                  <p>Ket qua duoc trinh bay theo muc do uu tien, canh bao va huong xu tri.</p>
                </div>
              </div>
              <div>
                {isPreparingImage ? (
                  <div className="medical-analysis-status-card">
                    <div className="medical-analysis-status-icon processing">
                      <Loader2 className="h-10 w-10" />
                    </div>
                    <h3 className="medical-analysis-status-title">Dang toi uu hinh anh</h3>
                    <p className="medical-analysis-status-desc">He thong dang nen va chuan hoa file truoc khi gui sang AI de giam tre va tranh treo trang.</p>
                  </div>
                ) : isLoading ? (
                  <div className="medical-analysis-status-card">
                    <div className="medical-analysis-status-icon processing">
                      <Loader2 className="h-10 w-10" />
                    </div>
                    <h3 className="medical-analysis-status-title">Dang phan tich hinh anh y khoa</h3>
                    <p className="medical-analysis-status-desc">AI dang doc du lieu, tong hop canh bao va de xuat huong xu tri tiep theo.</p>
                    {typeof analysisProgress === "number" && (
                      <div className="medical-analysis-progress">
                        <div className="medical-analysis-progress-header">
                          <span>Tien trinh</span>
                          <span>{Math.round(analysisProgress)}%</span>
                        </div>
                        <div className="medical-analysis-progress-bar">
                          <div className="medical-analysis-progress-fill" style={{ width: `${analysisProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : result ? (
                  <div className="space-y-5">
                    <div className="medical-analysis-result-header">
                      <div className="medical-analysis-result-info">
                        <div className="medical-analysis-result-icon ai">
                          <Brain className="h-6 w-6" />
                        </div>
                        <div>
                          <p>Completed</p>
                          <h3>Bao cao da san sang</h3>
                          <p>{result.imageTypeLabel || selectedType.label}</p>
                        </div>
                      </div>
                      {result.urgency && (
                        <div className={`medical-analysis-urgency ${result.urgency}`}>
                          {(() => {
                            const urgency = URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.medium;
                            const Icon = urgency.icon;
                            return (
                              <>
                                <Icon className="h-5 w-5" />
                                <div>
                                  <p>Muc do uu tien</p>
                                  <p>{urgency.label}</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    {result.recommendedAction && (
                      <div className={`medical-analysis-action ${result.recommendedAction}`}>
                        <p>Action</p>
                        <h4>{ACTION_LABELS[result.recommendedAction]?.text || result.recommendedAction}</h4>
                      </div>
                    )}
                    <div className="medical-analysis-details">
                      <h4>
                        <Activity className="medical-analysis-details-icon h-5 w-5" />
                        Phan tich chi tiet
                      </h4>
                      <div className="medical-analysis-analysis-text">{result.analysis}</div>
                    </div>
                    {result.specialty && (
                      <div className="medical-analysis-specialty">
                        <h4>
                          <Stethoscope className="medical-analysis-specialty-icon h-5 w-5" />
                          Chuyen khoa nen uu tien
                        </h4>
                        <p className="medical-analysis-specialty-value">{result.specialty}</p>
                      </div>
                    )}
                    {result.warnings.length > 0 && (
                      <div className="medical-analysis-warnings">
                        <h4>
                          <AlertTriangle className="h-5 w-5" />
                          Cac diem can luu y
                        </h4>
                        <ul className="medical-analysis-warnings-list">
                          {result.warnings.map((warning, index) => (
                            <li key={`${warning}-${index}`} className="medical-analysis-warning-item">
                              <div className="medical-analysis-warning-dot" />
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="medical-analysis-disclaimer">
                      <h4>
                        <Info className="medical-analysis-disclaimer-icon h-5 w-5" />
                        Luu y su dung
                      </h4>
                      <p className="medical-analysis-disclaimer-text">{result.disclaimer || DEFAULT_DISCLAIMER}</p>
                    </div>
                  </div>
                ) : (
                  <div className="medical-analysis-empty">
                    <div className="medical-analysis-empty-icon">
                      <FileImage className="h-11 w-11" />
                    </div>
                    <h4 className="medical-analysis-empty-title">Cho du lieu dau vao</h4>
                    <p className="medical-analysis-empty-desc">Sau khi tai anh len va nhan phan tich, bao cao AI se xuat hien tai day voi cau truc ro rang de ban doc nhanh hon.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="medical-analysis-warning">
              <div className="medical-analysis-warning-content">
                <Info className="medical-analysis-warning-icon h-5 w-5" />
                <div className="medical-analysis-warning-text">
                  <p className="font-semibold">Luu y chuyen mon</p>
                  <p className="mt-1 text-sm leading-7">{DEFAULT_DISCLAIMER}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
