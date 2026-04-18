import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Download, Plus, Search, X, Sparkles, Calendar, FileText, Filter, Clock, CheckSquare, Square } from "lucide-react";
import { api } from "../lib/api";

const emptyForm = {
  visitDate: dayjs().format("YYYY-MM-DD"),
  hospital: "",
  doctorName: "",
  specialty: "",
  diagnosis: "",
  summary: "",
  symptomsText: "",
  recommendationsText: "",
  prescriptionsText: "",
};

const defaultExportForm = {
  format: "pdf",
  scope: "current",
  specialty: "",
  fromDate: "",
  toDate: "",
  includeSymptoms: true,
  includeRecommendations: true,
  includePrescriptions: true,
};

const normalizeLines = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parsePrescriptions = (text) =>
  normalizeLines(text).map((line) => {
    const parts = line.split("|").map((item) => item.trim());
    return {
      medicine: parts[0] || "",
      dosage: parts[1] || "",
      usage: parts[2] || "",
    };
  });

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const MedicalRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [exportForm, setExportForm] = useState(defaultExportForm);

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [medicationSuggestions, setMedicationSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/records/me");
      const list = data.records || [];
      setRecords(list);
      setActiveId(list[0]?._id || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const specialties = useMemo(
    () => [...new Set(records.map((item) => item.specialty).filter(Boolean))],
    [records]
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const now = dayjs();

    return records.filter((item) => {
      const matchText =
        !text ||
        item.hospital?.toLowerCase().includes(text) ||
        item.specialty?.toLowerCase().includes(text) ||
        item.diagnosis?.toLowerCase().includes(text) ||
        item.doctorName?.toLowerCase().includes(text);

      const matchSpecialty = !specialtyFilter || item.specialty === specialtyFilter;

      let matchTime = true;
      const visit = dayjs(item.visitDate);
      if (timeFilter === "30d") matchTime = visit.isAfter(now.subtract(30, "day"));
      if (timeFilter === "6m") matchTime = visit.isAfter(now.subtract(6, "month"));
      if (timeFilter === "1y") matchTime = visit.isAfter(now.subtract(1, "year"));

      return matchText && matchSpecialty && matchTime;
    });
  }, [records, query, specialtyFilter, timeFilter]);

  const activeRecord = filtered.find((item) => item._id === activeId) || filtered[0] || null;

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        visitDate: dayjs(form.visitDate).hour(9).minute(0).second(0).millisecond(0).toISOString(),
        hospital: form.hospital.trim(),
        doctorName: form.doctorName.trim(),
        specialty: form.specialty.trim(),
        diagnosis: form.diagnosis.trim(),
        summary: form.summary.trim(),
        symptoms: normalizeLines(form.symptomsText),
        recommendations: normalizeLines(form.recommendationsText),
        prescriptions: parsePrescriptions(form.prescriptionsText).filter(
          (item) => item.medicine && item.dosage && item.usage
        ),
        files: [],
      };

      const { data } = await api.post("/records", payload);
      const record = data.record;
      setRecords((prev) => [record, ...prev]);
      setActiveId(record._id);
      setShowCreateModal(false);
      setForm(emptyForm);
      setMedicationSuggestions([]);
      setNotice("Đã thêm hồ sơ bệnh án mới.");
    } catch (err) {
      setError(err?.response?.data?.message || "Không thêm được hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuggestMedications = async () => {
    if (!form.symptomsText && !form.diagnosis) {
      setError("Vui lòng nhập triệu chứng hoặc chẩn đoán để được gợi ý thuốc.");
      return;
    }
    setSuggesting(true);
    setError("");
    setMedicationSuggestions([]);
    try {
      // Ưu tiên gọi API mới theo bệnh cụ thể nếu có chẩn đoán
      if (form.diagnosis) {
        const params = new URLSearchParams();
        params.append("disease", form.diagnosis);
        
        try {
          const { data } = await api.get(`/records/drugs-by-disease?${params.toString()}`);
          
          if (data.type === "disease-specific") {
            // Gợi ý theo bệnh cụ thể - hiển thị chi tiết
            const detailedSuggestions = data.medicines.map(med => ({
              medicine: med.name,
              dosage: med.dose,
              usage: `${med.frequency}. ${med.note}`
            }));
            setMedicationSuggestions(detailedSuggestions);
            setNotice(data.advice || `Gợi ý thuốc cho bệnh ${data.disease}`);
            setSuggesting(false);
            return;
          } else if (data.type === "symptom-based" && data.results) {
            // Gợi ý theo triệu chứng
            const allMeds = [];
            data.results.forEach(result => {
              result.medicines.forEach(med => {
                allMeds.push({
                  medicine: med.name,
                  dosage: med.dose,
                  usage: `${med.frequency}. ${med.note}`
                });
              });
            });
            setMedicationSuggestions(allMeds);
            setNotice(data.results[0]?.advice || "Gợi ý thuốc theo triệu chứng");
            setSuggesting(false);
            return;
          }
        } catch (diseaseErr) {
          // Nếu không tìm thấy theo bệnh, thử theo triệu chứng
          console.log("Không tìm thấy theo bệnh, thử theo triệu chứng");
        }
      }
      
      // Fallback: Gọi API cũ theo triệu chứng
      const params = new URLSearchParams();
      if (form.symptomsText) params.append("symptoms", form.symptomsText);
      if (form.diagnosis) params.append("diagnosis", form.diagnosis);
      
      const { data } = await api.get(`/records/medication-suggestions?${params.toString()}`);
      setMedicationSuggestions(data.suggestions || []);
      if (data.suggestions?.length > 0) {
        setNotice(data.message);
      } else {
        // Thử gọi API theo triệu chứng mới
        if (form.symptomsText) {
          const symptomParams = new URLSearchParams();
          symptomParams.append("symptoms", form.symptomsText);
          try {
            const symptomData = await api.get(`/records/drugs-by-symptoms?${symptomParams.toString()}`);
            if (symptomData.data?.results) {
              const allMeds = [];
              symptomData.data.results.forEach(result => {
                result.medicines.forEach(med => {
                  allMeds.push({
                    medicine: med.name,
                    dosage: med.dose,
                    usage: `${med.frequency}. ${med.note}`
                  });
                });
              });
              setMedicationSuggestions(allMeds);
              setNotice(symptomData.data.results[0]?.advice || "Gợi ý thuốc theo triệu chứng");
            }
          } catch (symptomErr) {
            setNotice(data.message || "Chưa có gợi ý thuốc phù hợp.");
          }
        } else {
          setNotice(data.message || "Chưa có gợi ý thuốc phù hợp.");
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Không lấy được gợi ý thuốc.");
    } finally {
      setSuggesting(false);
    }
  };

  const openExportModal = () => {
    setExportForm({
      ...defaultExportForm,
      scope: "current",
      specialty: specialtyFilter,
    });
    setShowExportModal(true);
  };

  const buildExportParams = () => {
    const params = {
      format: exportForm.format,
      includeSymptoms: exportForm.includeSymptoms ? "1" : "0",
      includeRecommendations: exportForm.includeRecommendations ? "1" : "0",
      includePrescriptions: exportForm.includePrescriptions ? "1" : "0",
    };

    if (exportForm.scope === "current") {
      if (timeFilter !== "all") params.timeFilter = timeFilter;
      if (specialtyFilter) params.specialty = specialtyFilter;
    }

    if (exportForm.scope === "custom") {
      if (exportForm.specialty) params.specialty = exportForm.specialty;
      if (exportForm.fromDate) {
        params.fromDate = dayjs(exportForm.fromDate).startOf("day").toISOString();
      }
      if (exportForm.toDate) {
        params.toDate = dayjs(exportForm.toDate).endOf("day").toISOString();
      }
    }

    return params;
  };

  const handleExportSubmit = async (e) => {
    e.preventDefault();
    setExporting(true);
    setError("");
    setNotice("");

    try {
      const params = buildExportParams();
      const response = await api.get("/records/export", {
        params,
        responseType: "blob",
      });
      
       // Determine file extension based on format
       let ext = "json";
       if (params.format === "csv") ext = "csv";
       else if (params.format === "pdf") ext = "pdf";
       else if (params.format === "docx") ext = "docx";
       
       downloadBlob(response.data, `ho-so-benh-an-${dayjs().format("YYYYMMDD-HHmmss")}.${ext}`);
      setShowExportModal(false);
      setNotice("Đã xuất dữ liệu hồ sơ.");
    } catch (err) {
      setError(err?.response?.data?.message || "Không xuất được dữ liệu.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="records-layout">
      <div className="section-title-row">
        <div>
          <h1>Hồ sơ bệnh án điện tử.</h1>
          <p className="muted">Quản lý và theo dõi lịch sử khám bệnh chi tiết</p>
        </div>
        <div className="row gap-sm">
          <button type="button" className="btn-secondary" onClick={openExportModal}>
            <Download size={16} /> Xuất dữ liệu
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Thêm hồ sơ mới
          </button>
        </div>
      </div>

      {notice ? <p className="success-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="record-filter-row">
        <div className="search-input">
          <Search size={16} />
          <input
            placeholder="Ví dụ: Vinmec, Nội khoa..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="all">Tất cả thời gian</option>
          <option value="30d">30 ngày gần nhất</option>
          <option value="6m">6 tháng gần nhất</option>
          <option value="1y">1 năm gần nhất</option>
        </select>
        <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
          <option value="">Tat ca chuyen khoa</option>
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
      </div>

      <div className="records-content">
        <aside className="record-history">
          <h3>Lịch sử khám gần nhất</h3>
          {loading ? <p className="muted">Đang tải hồ sơ...</p> : null}
          <div className="stack-sm">
            {filtered.map((record) => (
              <button
                type="button"
                key={record._id}
                className={`record-item${activeRecord?._id === record._id ? " active" : ""}`}
                onClick={() => setActiveId(record._id)}
              >
                <small>{dayjs(record.visitDate).format("DD/MM/YYYY")}</small>
                <h4>{record.hospital}</h4>
                <p>{record.doctorName}</p>
                <strong>{record.diagnosis}</strong>
              </button>
            ))}
            {!loading && filtered.length === 0 ? (
              <p className="muted">Không tìm thấy hồ sơ theo bộ lọc hiện tại.</p>
            ) : null}
          </div>
        </aside>

        <article className="record-detail">
          {!activeRecord ? (
            <p className="muted">Không có dữ liệu hồ sơ.</p>
          ) : (
            <>
              <h3>Chi tiết đợt khám: {dayjs(activeRecord.visitDate).format("DD/MM/YYYY")}</h3>
              <div className="record-columns">
                <div>
                  <h4>Triệu chứng lâm sàng</h4>
                  <ul>
                    {(activeRecord.symptoms || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Chẩn đoán & lời dặn</h4>
                  <p>
                    <strong>{activeRecord.summary || activeRecord.diagnosis}</strong>
                  </p>
                  <ul>
                    {(activeRecord.recommendations || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <h4>Kết quả xét nghiệm</h4>
              <div className="record-files">
                {(activeRecord.files || []).length === 0 ? <p className="muted">Chưa có tệp đính kèm.</p> : null}
                {(activeRecord.files || []).map((file) => (
                  <div key={file.name} className="file-card">
                    <p>{file.name}</p>
                    <small>
                      {file.size} - Tải lên: {file.uploadedAtLabel || "--"}
                    </small>
                  </div>
                ))}
              </div>

              <h4>Đơn thuốc</h4>
              <table className="prescription-table">
                <thead>
                  <tr>
                    <th>Tên thuốc</th>
                    <th>Liều dùng</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeRecord.prescriptions || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Không có đơn thuốc.
                      </td>
                    </tr>
                  ) : null}
                  {(activeRecord.prescriptions || []).map((med, index) => (
                    <tr key={`${med.medicine}_${index}`}>
                      <td>{med.medicine}</td>
                      <td>{med.dosage}</td>
                      <td>{med.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </article>
      </div>

      {showExportModal ? (
        <div className="modal-backdrop">
          <form className="export-modal" onSubmit={handleExportSubmit} style={{ maxWidth: "520px" }}>
            <div className="section-title-row" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "48px", 
                  height: "48px", 
                  borderRadius: "12px", 
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Download size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>Xuất dữ liệu hồ sơ bệnh án</h3>
                  <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "14px" }}>Tùy chọn xuất và tải dữ liệu y tế</p>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowExportModal(false)}>
                <X size={20} />
              </button>
            </div>

             {/* Format Selection */}
             <div style={{ marginBottom: "24px" }}>
               <label style={{ 
                 display: "flex", 
                 alignItems: "center", 
                 gap: "8px", 
                 fontWeight: "600", 
                 marginBottom: "12px",
                 color: "#374151"
               }}>
                 <FileText size={18} />
                 Định dạng tệp
               </label>
               <div style={{ display: "flex", gap: "12px" }}>
                 <label style={{ 
                   flex: 1,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: "8px",
                   padding: "14px 16px",
                   border: exportForm.format === "docx" ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                   borderRadius: "10px",
                   cursor: "pointer",
                   background: exportForm.format === "docx" ? "#eff6ff" : "white",
                   transition: "all 0.2s"
                 }}>
                   <input
                     type="radio"
                     name="format"
                     value="docx"
                     checked={exportForm.format === "docx"}
                     onChange={(e) => setExportForm((prev) => ({ ...prev, format: e.target.value }))}
                     style={{ display: "none" }}
                   />
                   <span style={{ fontWeight: "600", color: exportForm.format === "docx" ? "#1d4ed8" : "#6b7280" }}>DOCX</span>
                   <span style={{ fontSize: "12px", color: "#9ca3af" }}>Word</span>
                 </label>
                 <label style={{ 
                   flex: 1,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: "8px",
                   padding: "14px 16px",
                   border: exportForm.format === "pdf" ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                   borderRadius: "10px",
                   cursor: "pointer",
                   background: exportForm.format === "pdf" ? "#eff6ff" : "white",
                   transition: "all 0.2s"
                 }}>
                   <input
                     type="radio"
                     name="format"
                     value="pdf"
                     checked={exportForm.format === "pdf"}
                     onChange={(e) => setExportForm((prev) => ({ ...prev, format: e.target.value }))}
                     style={{ display: "none" }}
                   />
                   <span style={{ fontWeight: "600", color: exportForm.format === "pdf" ? "#1d4ed8" : "#6b7280" }}>PDF</span>
                   <span style={{ fontSize: "12px", color: "#9ca3af" }}>Tài liệu</span>
                 </label>
                 <label style={{ 
                   flex: 1,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: "8px",
                   padding: "14px 16px",
                   border: exportForm.format === "csv" ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                   borderRadius: "10px",
                   cursor: "pointer",
                   background: exportForm.format === "csv" ? "#eff6ff" : "white",
                   transition: "all 0.2s"
                 }}>
                   <input
                     type="radio"
                     name="format"
                     value="csv"
                     checked={exportForm.format === "csv"}
                     onChange={(e) => setExportForm((prev) => ({ ...prev, format: e.target.value }))}
                     style={{ display: "none" }}
                   />
                   <span style={{ fontWeight: "600", color: exportForm.format === "csv" ? "#1d4ed8" : "#6b7280" }}>CSV</span>
                   <span style={{ fontSize: "12px", color: "#9ca3af" }}>Excel</span>
                 </label>
                 <label style={{ 
                   flex: 1,
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: "8px",
                   padding: "14px 16px",
                   border: exportForm.format === "json" ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                   borderRadius: "10px",
                   cursor: "pointer",
                   background: exportForm.format === "json" ? "#eff6ff" : "white",
                   transition: "all 0.2s"
                 }}>
                   <input
                     type="radio"
                     name="format"
                     value="json"
                     checked={exportForm.format === "json"}
                     onChange={(e) => setExportForm((prev) => ({ ...prev, format: e.target.value }))}
                     style={{ display: "none" }}
                   />
                   <span style={{ fontWeight: "600", color: exportForm.format === "json" ? "#1d4ed8" : "#6b7280" }}>JSON</span>
                   <span style={{ fontSize: "12px", color: "#9ca3af" }}>Dữ liệu thô</span>
                 </label>
               </div>
             </div>

            {/* Date Range */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                fontWeight: "600", 
                marginBottom: "12px",
                color: "#374151"
              }}>
                <Calendar size={18} />
                Phạm vi ngày khám
              </label>
              <div className="export-form-grid">
                <select
                  value={exportForm.scope}
                  onChange={(e) => setExportForm((prev) => ({ ...prev, scope: e.target.value }))}
                  style={{ 
                    padding: "12px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    width: "100%"
                  }}
                >
                  <option value="current">Theo bộ lọc hiện tại</option>
                  <option value="custom">Tùy chọn thủ công</option>
                </select>

                {exportForm.scope === "custom" ? (
                  <div style={{ display: "flex", gap: "12px", gridColumn: "1 / -1" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Từ ngày</label>
                      <input
                        type="date"
                        value={exportForm.fromDate}
                        onChange={(e) => setExportForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                        style={{ 
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "14px",
                          width: "100%"
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Đến ngày</label>
                      <input
                        type="date"
                        value={exportForm.toDate}
                        onChange={(e) => setExportForm((prev) => ({ ...prev, toDate: e.target.value }))}
                        style={{ 
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "14px",
                          width: "100%"
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {exportForm.scope === "custom" ? (
                  <>
                    <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Chuyên khoa</label>
                    <select
                      value={exportForm.specialty}
                      onChange={(e) => setExportForm((prev) => ({ ...prev, specialty: e.target.value }))}
                      style={{ 
                        padding: "10px 12px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                        width: "100%"
                      }}
                    >
                      <option value="">Tất cả chuyên khoa</option>
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty}>
                          {specialty}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
            </div>

            {/* Content Options */}
            <div style={{ marginBottom: "28px" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                fontWeight: "600", 
                marginBottom: "14px",
                color: "#374151"
              }}>
                <Filter size={18} />
                Nội dung xuất
              </label>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)", 
                gap: "12px" 
              }}>
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  padding: "12px 14px",
                  border: exportForm.includeSymptoms ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: exportForm.includeSymptoms ? "#eff6ff" : "white",
                  transition: "all 0.2s"
                }}>
                  <input
                    type="checkbox"
                    checked={exportForm.includeSymptoms}
                    onChange={(e) =>
                      setExportForm((prev) => ({ ...prev, includeSymptoms: e.target.checked }))
                    }
                    style={{ display: "none" }}
                  />
                  <div style={{ 
                    width: "20px", 
                    height: "20px", 
                    borderRadius: "4px", 
                    border: exportForm.includeSymptoms ? "none" : "2px solid #d1d5db",
                    background: exportForm.includeSymptoms ? "#3b82f6" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {exportForm.includeSymptoms && <CheckSquare size={14} color="white" />}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: exportForm.includeSymptoms ? "#1d4ed8" : "#4b5563" }}>Triệu chứng</span>
                </label>
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  padding: "12px 14px",
                  border: exportForm.includeRecommendations ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: exportForm.includeRecommendations ? "#eff6ff" : "white",
                  transition: "all 0.2s"
                }}>
                  <input
                    type="checkbox"
                    checked={exportForm.includeRecommendations}
                    onChange={(e) =>
                      setExportForm((prev) => ({ ...prev, includeRecommendations: e.target.checked }))
                    }
                    style={{ display: "none" }}
                  />
                  <div style={{ 
                    width: "20px", 
                    height: "20px", 
                    borderRadius: "4px", 
                    border: exportForm.includeRecommendations ? "none" : "2px solid #d1d5db",
                    background: exportForm.includeRecommendations ? "#3b82f6" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {exportForm.includeRecommendations && <CheckSquare size={14} color="white" />}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: exportForm.includeRecommendations ? "#1d4ed8" : "#4b5563" }}>Khuyến nghị</span>
                </label>
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  padding: "12px 14px",
                  border: exportForm.includePrescriptions ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: exportForm.includePrescriptions ? "#eff6ff" : "white",
                  transition: "all 0.2s"
                }}>
                  <input
                    type="checkbox"
                    checked={exportForm.includePrescriptions}
                    onChange={(e) =>
                      setExportForm((prev) => ({ ...prev, includePrescriptions: e.target.checked }))
                    }
                    style={{ display: "none" }}
                  />
                  <div style={{ 
                    width: "20px", 
                    height: "20px", 
                    borderRadius: "4px", 
                    border: exportForm.includePrescriptions ? "none" : "2px solid #d1d5db",
                    background: exportForm.includePrescriptions ? "#3b82f6" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {exportForm.includePrescriptions && <CheckSquare size={14} color="white" />}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: exportForm.includePrescriptions ? "#1d4ed8" : "#4b5563" }}>Đơn thuốc</span>
                </label>
              </div>
            </div>

            {/* Summary */}
            <div style={{ 
              background: "#f9fafb", 
              borderRadius: "10px", 
              padding: "16px", 
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Clock size={16} color="#6b7280" />
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>Tóm tắt xuất</span>
              </div>
              <p style={{ fontSize: "14px", color: "#374151", margin: 0, lineHeight: "1.6" }}>
                Xuất dữ liệu <strong>{exportForm.format.toUpperCase()}</strong> • 
                Phạm vi: <strong>{exportForm.scope === "current" ? "Theo bộ lọc" : "Tùy chọn"}</strong>
                {exportForm.scope === "custom" && exportForm.fromDate && exportForm.toDate && (
                  <> • Ngày: <strong>{dayjs(exportForm.fromDate).format("DD/MM/YYYY")} - {dayjs(exportForm.toDate).format("DD/MM/YYYY")}</strong></>
                )}
              </p>
            </div>

            <div className="row gap-sm">
              <button 
                type="button" 
                className="btn-secondary w-full" 
                onClick={() => setShowExportModal(false)}
                style={{ padding: "14px" }}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="btn-primary w-full" 
                disabled={exporting}
                style={{ 
                  padding: "14px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  border: "none"
                }}
              >
                {exporting ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span className="spinner" style={{ width: "16px", height: "16px" }}></span>
                    Đang xuất...
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <Download size={18} />
                    Tải xuống
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="modal-backdrop">
          <form className="record-modal" onSubmit={handleCreateRecord}>
            <div className="section-title-row">
              <h3>Thêm hồ sơ bệnh án mới</h3>
              <button type="button" className="icon-btn" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="record-form-grid">
              <label>Ngày khám</label>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((prev) => ({ ...prev, visitDate: e.target.value }))}
                required
              />
              <label>Bệnh viện</label>
              <input
                value={form.hospital}
                onChange={(e) => setForm((prev) => ({ ...prev, hospital: e.target.value }))}
                required
              />
              <label>Bác sĩ</label>
              <input
                value={form.doctorName}
                onChange={(e) => setForm((prev) => ({ ...prev, doctorName: e.target.value }))}
                required
              />
              <label>Chuyen khoa</label>
              <input
                value={form.specialty}
                onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
                required
              />
              <label>Chan doan</label>
              <input
                value={form.diagnosis}
                onChange={(e) => setForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                required
              />
              <label>Tom tat</label>
              <textarea
                rows={2}
                value={form.summary}
                onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder="Tom tat ket luan va tinh trang hien tai"
              />
              <label>Trieu chung (moi dong 1 muc)</label>
              <textarea
                rows={3}
                value={form.symptomsText}
                onChange={(e) => setForm((prev) => ({ ...prev, symptomsText: e.target.value }))}
              />
              <label>Loi dan (moi dong 1 muc)</label>
              <textarea
                rows={3}
                value={form.recommendationsText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, recommendationsText: e.target.value }))
                }
              />
              <label>Don thuoc (moi dong theo dinh dang: Ten|Lieu dung|Thoi gian)</label>
              <textarea
                rows={3}
                value={form.prescriptionsText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, prescriptionsText: e.target.value }))
                }
                placeholder="Paracetamol 500mg|1 vien/lan|Cach 4-6 tieng"
              />
              
              {/* Medication Suggestions Section */}
              <div style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSuggestMedications}
                  disabled={suggesting}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Sparkles size={16} />
                  {suggesting ? "Đang gợi ý..." : "AI Gợi ý thuốc"}
                </button>
                
                {medicationSuggestions.length > 0 && (
                  <div style={{ marginTop: "12px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "#166534", fontSize: "14px" }}>💊 Gợi ý thuốc:</h4>
                    <ul style={{ margin: 0, paddingLeft: "16px", color: "#166534", fontSize: "13px" }}>
                      {medicationSuggestions.map((med, idx) => (
                        <li key={idx} style={{ marginBottom: "8px" }}>
                          <strong>{med.medicine}</strong> - {med.dosage}<br />
                          <span style={{ fontSize: "12px" }}>Cách dùng: {med.usage}</span>
                        </li>
                      ))}
                    </ul>
                    <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: "#15803d", fontStyle: "italic" }}>
                      * Lưu ý: Đây chỉ là gợi ý tham khảo. Vui lòng tham khảo ý kiến bác sĩ trước khi sử dụng.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="row gap-sm">
              <button type="button" className="btn-secondary w-full" onClick={() => setShowCreateModal(false)}>
                Huy
              </button>
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? "Dang tao..." : "Luu ho so"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default MedicalRecordsPage;
