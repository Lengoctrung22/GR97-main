import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Bot, Paperclip, SendHorizontal, Stethoscope, Trash2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const fallbackSuggestedDoctors = [
  { _id: "doc_4", fullName: "BS. CKI Nguyen Thu Ha", specialty: "Nội tiêu hóa", rating: 4.7 },
  { _id: "doc_5", fullName: "BS. CKII Tran Van Minh", specialty: "Tim mạch", rating: 4.9 },
  { _id: "doc_8", fullName: "ThS. BS Nguyen Quoc Bao", specialty: "Nội hô hấp", rating: 4.8 },
];

const ChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState("chatty");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [suggestedDoctors, setSuggestedDoctors] = useState(fallbackSuggestedDoctors);
  
  // Search state for doctors
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [doctorSearchResults, setDoctorSearchResults] = useState([]);
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  
  // Search state for services
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceSearchResults, setServiceSearchResults] = useState([]);
  const [isSearchingServices, setIsSearchingServices] = useState(false);
  const [showServiceResults, setShowServiceResults] = useState(false);
  
  const listRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/chat/history");
      setMessages(data.messages || []);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedDoctors = async () => {
    try {
      const { data } = await api.get("/doctors", { params: { minRating: "4.7" } });
      const doctors = (data.doctors || []).slice(0, 3).map((doctor) => ({
        _id: doctor._id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        rating: doctor.rating,
      }));
      setSuggestedDoctors(doctors.length ? doctors : fallbackSuggestedDoctors);
    } catch {
      setSuggestedDoctors(fallbackSuggestedDoctors);
    }
  };

  // Search doctors by name, specialty or hospital
  const searchDoctors = async (query) => {
    if (!query.trim()) {
      setDoctorSearchResults([]);
      setShowDoctorResults(false);
      return;
    }
    setIsSearchingDoctors(true);
    try {
      const { data } = await api.get("/doctors", { params: { q: query } });
      const doctors = (data.doctors || []).slice(0, 5).map((doctor) => ({
        _id: doctor._id,
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        hospital: doctor.hospital,
        rating: doctor.rating,
      }));
      setDoctorSearchResults(doctors);
      setShowDoctorResults(true);
    } catch {
      setDoctorSearchResults([]);
    } finally {
      setIsSearchingDoctors(false);
    }
  };

  // Search services/packages
  const searchServices = async (query) => {
    if (!query.trim()) {
      setServiceSearchResults([]);
      setShowServiceResults(false);
      return;
    }
    setIsSearchingServices(true);
    try {
      const { data } = await api.get("/services");
      const queryLower = query.toLowerCase();
      const filtered = (data.services || [])
        .filter(s => 
          s.title.toLowerCase().includes(queryLower) || 
          s.description.toLowerCase().includes(queryLower)
        )
        .slice(0, 5)
        .map(service => ({
          _id: service._id,
          title: service.title,
          description: service.description,
          price: service.price,
          durationMinutes: service.durationMinutes,
        }));
      setServiceSearchResults(filtered);
      setShowServiceResults(true);
    } catch {
      setServiceSearchResults([]);
    } finally {
      setIsSearchingServices(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadSuggestedDoctors();
  }, []);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    // Add small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Handle scroll to detect if user is at bottom - for showing scroll button
  const handleScroll = () => {
    const el = listRef.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setError("");
    const text = message.trim();
    setMessage("");
    setSending(true);

    const optimistic = {
      _id: `tmp_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await api.post("/chat/support", { message: text, mood });
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err?.response?.data?.message || "Không gửi được tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const clearChatHistory = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử chat?")) return;
    try {
      await api.delete("/chat/history");
      setMessages([]);
    } catch (err) {
      setError("Không thể xóa lịch sử chat");
    }
  };

  return (
    <section className="diagnosis-layout">
      <div className="diagnosis-main">
        <div className="diagnosis-header">
          <h2>Trợ lý bác sĩ AI</h2>
          <div className="header-actions">
            <button
              type="button"
              className="clear-chat-btn"
              onClick={clearChatHistory}
              title="Xóa lịch sử chat"
            >
              <Trash2 size={16} />
              Xóa chat
            </button>
            <div className="mood-switch">
              <button
                type="button"
                className={`mood-btn${mood === "chatty" ? " active" : ""}`}
                onClick={() => setMood("chatty")}
              >
                Than thien chat
              </button>
              <button
                type="button"
                className={`mood-btn${mood === "professional" ? " active" : ""}`}
                onClick={() => setMood("professional")}
              >
                Chuyên nghiệp
              </button>
            </div>
          </div>
        </div>

        <div className="chat-list diagnosis-chat" ref={listRef} onScroll={handleScroll}>
          {loading ? (
            <p className="muted">Đang tải lịch sử trò chuyện...</p>
          ) : messages.length === 0 ? (
            <article className="bubble ai">
              <p>
                Chào bạn! Hãy mô tả triệu chứng cụ thể (ví dụ: đau bụng 2 ngày, sốt 38.5, buồn nôn)
                để tôi phân tích sơ bộ, gợi ý chuyên khoa và hướng dẫn bước tiếp theo.
              </p>
            </article>
          ) : (
            messages.map((item) => (
              <article
                key={item._id}
                className={item.role === "assistant" ? "bubble ai" : "bubble user"}
              >
                <p>{item.content}</p>
                <time>{dayjs(item.createdAt).format("HH:mm")}</time>
              </article>
            ))
          )}
          {showScrollButton && (
            <button
              type="button"
              className="scroll-to-bottom-btn"
              onClick={() => {
                setIsAtBottom(true);
                listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
              }}
            >
              ↓ Xuống tin nhắn mới nhất
            </button>
          )}
        </div>

        <form className="chat-input diagnosis-input" onSubmit={sendMessage}>
          <button type="button" className="icon-btn">
            <Paperclip size={16} />
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nhập triệu chứng của bạn tại đây..."
            disabled={sending}
          />
          <button className="btn-primary" disabled={sending}>
            <SendHorizontal size={16} />
          </button>
        </form>
        {error ? <p className="error-text" style={{ padding: "0 14px 12px" }}>{error}</p> : null}
      </div>

      <aside className="diagnosis-right">
        <article className="diag-doctor-card">
          <div className="section-title-row">
            <h3>Bác sĩ gợi ý</h3>
            <button type="button" className="text-link" onClick={() => navigate("/doctors")}>
              Xem tất cả
            </button>
          </div>
          
          {/* Search doctors input */}
          <div className="search-input-wrapper" style={{ marginBottom: '12px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm bác sĩ theo tên, chuyên khoa..."
              value={doctorSearchQuery}
              onChange={(e) => {
                setDoctorSearchQuery(e.target.value);
                searchDoctors(e.target.value);
              }}
              onFocus={() => doctorSearchResults.length > 0 && setShowDoctorResults(true)}
              onBlur={() => setTimeout(() => setShowDoctorResults(false), 200)}
              className="search-input"
            />
          </div>
          
          {/* Search results dropdown */}
          {showDoctorResults && doctorSearchResults.length > 0 && (
            <div className="search-results-dropdown">
              {doctorSearchResults.map((doctor) => (
                <div 
                  className="search-result-item" 
                  key={doctor._id}
                  onClick={() => navigate("/doctors")}
                >
                  <div className="avatar-circle">
                    <Bot size={14} />
                  </div>
                  <div>
                    <p className="result-name">{doctor.fullName}</p>
                    <small>{doctor.specialty} • {doctor.hospital}</small>
                    <small className="rating">{doctor.rating} sao</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="stack-sm">
            {suggestedDoctors.map((doctor) => (
              <div className="doctor-row subtle" key={doctor._id || doctor.fullName}>
                <div className="avatar-circle">
                  <Bot size={14} />
                </div>
                <div>
                  <p>{doctor.fullName}</p>
                  <small>{doctor.specialty}</small>
                  <small>{doctor.rating} sao</small>
                </div>
                <button type="button" className="btn-secondary text-sm" onClick={() => navigate("/doctors")}>
                  Đặt lịch
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="diag-package-card">
          <h3>
            <Stethoscope size={18} /> Gói xét nghiệm tại nhà
          </h3>
          
          {/* Search services input */}
          <div className="search-input-wrapper" style={{ marginBottom: '12px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm gói xét nghiệm, dịch vụ..."
              value={serviceSearchQuery}
              onChange={(e) => {
                setServiceSearchQuery(e.target.value);
                searchServices(e.target.value);
              }}
              onFocus={() => serviceSearchResults.length > 0 && setShowServiceResults(true)}
              onBlur={() => setTimeout(() => setShowServiceResults(false), 200)}
              className="search-input"
            />
          </div>
          
          {/* Service search results */}
          {showServiceResults && serviceSearchResults.length > 0 && (
            <div className="search-results-dropdown">
              {serviceSearchResults.map((service) => (
                <div 
                  className="search-result-item service-item" 
                  key={service._id}
                  onClick={() => navigate("/doctors")}
                >
                  <div className="service-info">
                    <p className="result-name">{service.title}</p>
                    <small>{service.description.substring(0, 60)}...</small>
                    <div className="service-meta">
                      <span className="price">{service.price?.toLocaleString('vi-VN')} VNĐ</span>
                      <span className="duration">{service.durationMinutes} phút</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <p>
            Phát hiện sớm các vấn đề đã dây với gói tầm soát cơ bản. Đội ngũ y tế lấy mẫu tại nơi.
          </p>
          <button type="button" className="btn-secondary w-full" onClick={() => navigate("/doctors")}>
            Tìm hiểu thêm
          </button>
        </article>
      </aside>
    </section>
  );
};

export default ChatPage;
