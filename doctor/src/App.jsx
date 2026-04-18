import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const TOKEN_KEY = "doctor_token";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const BASE = `${API_URL}/doctor-portal`;
const CHAT_BASE = `${API_URL}/doctor-chat/doctor`;

const api = axios.create({ baseURL: API_URL });

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest.url?.includes("/auth/refresh")) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/";
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((refreshError) => Promise.reject(refreshError));
      }

      isRefreshing = true;

      try {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        if (!currentToken) throw new Error("No token available");

        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        localStorage.setItem(TOKEN_KEY, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        processQueue(null, data.token);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timeoutId = setTimeout(onClose, 3500);
    return () => clearTimeout(timeoutId);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="toast-close">
        x
      </button>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(`${BASE}/login`, { identifier, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.token, data.doctor);
    } catch (err) {
      setError(err?.response?.data?.message || "Dang nhap that bai.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="12" fill="#1d6fe8" />
              <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <div className="brand-name">HealthyAI</div>
              <div className="brand-sub">Cong bac si</div>
            </div>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <h2>Dang nhap</h2>
          <p className="login-hint">Danh cho bac si trong he thong HealthyAI</p>

          <div className="field-group">
            <label className="field-label">Email / Username / So dien thoai</label>
            <input
              className="field-input"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="doctor@healthyai.vn"
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Mat khau</label>
            <input
              className="field-input"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Dang dang nhap..." : "Dang nhap"}
          </button>
        </form>
      </div>
    </main>
  );
};

const STATUS_CONFIG = {
  pending: { label: "Cho xac nhan", cls: "s-pending" },
  confirmed: { label: "Da xac nhan", cls: "s-confirmed" },
  completed: { label: "Hoan thanh", cls: "s-completed" },
  cancelled: { label: "Da huy", cls: "s-cancelled" },
};

const ApptRow = ({ appt, onStatusChange }) => {
  const [busy, setBusy] = useState(false);
  const status = STATUS_CONFIG[appt.status] || { label: appt.status, cls: "" };
  const canConfirm = appt.status === "pending";
  const canComplete = appt.status === "confirmed";
  const canCancel = appt.status === "pending" || appt.status === "confirmed";

  const update = async (nextStatus) => {
    setBusy(true);
    try {
      await onStatusChange(appt._id, nextStatus);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="patient-cell">
          <div className="patient-avatar">{(appt.user?.fullName || "B")[0].toUpperCase()}</div>
          <div>
            <div className="patient-name">{appt.user?.fullName || "Benh nhan"}</div>
            <div className="patient-contact">{appt.user?.phone || appt.user?.email || ""}</div>
          </div>
        </div>
      </td>
      <td>{new Date(appt.appointmentAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</td>
      <td>{appt.service?.name || "—"}</td>
      <td>{appt.notes || "—"}</td>
      <td><span className={`status-badge ${status.cls}`}>{status.label}</span></td>
      <td>
        <div className="action-btns">
          {canConfirm ? <button type="button" className="btn btn-success btn-xs" disabled={busy} onClick={() => update("confirmed")}>Chap nhan</button> : null}
          {canComplete ? <button type="button" className="btn btn-primary btn-xs" disabled={busy} onClick={() => update("completed")}>Hoan thanh</button> : null}
          {canCancel ? <button type="button" className="btn btn-danger btn-xs" disabled={busy} onClick={() => update("cancelled")}>Tu choi</button> : null}
        </div>
      </td>
    </tr>
  );
};

const ConversationItem = ({ item, active, onClick }) => (
  <button type="button" className={`chat-conversation-item${active ? " active" : ""}`} onClick={() => onClick(item)}>
    <div className="chat-conversation-avatar">{(item.patientName || "B").charAt(0).toUpperCase()}</div>
    <div className="chat-conversation-body">
      <div className="chat-conversation-top">
        <strong>{item.patientName || "Benh nhan"}</strong>
        <span>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : ""}</span>
      </div>
      <div className="chat-conversation-meta">
        <span>{item.patientPhone || item.patientEmail || "Khong co lien he"}</span>
        {item.unreadCount ? <span className="chat-unread-badge">{item.unreadCount}</span> : null}
      </div>
      <p>{item.lastMessage || "Chua co noi dung trao doi."}</p>
    </div>
  </button>
);

const hasSameContent = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const getConversationKey = (conversation) =>
  conversation?.patientId ? `${conversation.patientId}_${conversation.appointmentId || "none"}` : "";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [doctor, setDoctor] = useState(null);
  const [view, setView] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const selectedConversationKey = useMemo(() => getConversationKey(selectedConversation), [selectedConversation]);
  const activeConversation = useMemo(
    () =>
      conversations.find((item) => getConversationKey(item) === selectedConversationKey) ||
      selectedConversation ||
      null,
    [conversations, selectedConversation, selectedConversationKey]
  );

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setDoctor(null);
    setAppointments([]);
    setConversations([]);
    setSelectedConversation(null);
    setChatMessages([]);
  }, []);

  const onLogin = (nextToken, nextDoctor) => {
    setToken(nextToken);
    setDoctor(nextDoctor);
  };

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get(`${BASE}/me`);
      setDoctor(data.doctor);
    } catch {
      return null;
    }
    return null;
  }, []);

  const loadAppointments = useCallback(async (statusFilter) => {
    setLoading(true);
    try {
      const params = statusFilter && statusFilter !== "all" ? { status: statusFilter } : {};
      const { data } = await api.get(`${BASE}/appointments`, { params });
      setAppointments(data.appointments || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        logout();
      } else {
        showToast(err?.response?.data?.message || "Khong tai duoc du lieu lich hen.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [logout, showToast]);

  const loadConversations = useCallback(async (keepSelection = true, { silent = false } = {}) => {
    if (!silent) {
      setChatLoading(true);
    }
    try {
      const { data } = await api.get(CHAT_BASE + "/conversations");
      const nextConversations = data.conversations || [];
      setConversations((prev) => (hasSameContent(prev, nextConversations) ? prev : nextConversations));
      setSelectedConversation((current) => {
        const fallbackConversation = nextConversations[0] || null;
        if (keepSelection && current) {
          const matched = nextConversations.find(
            (item) => getConversationKey(item) === getConversationKey(current)
          );
          return matched ? current : fallbackConversation;
        }
        return fallbackConversation;
      });
    } catch (err) {
      showToast(err?.response?.data?.message || "Khong tai duoc danh sach tin nhan.", "error");
    } finally {
      if (!silent) {
        setChatLoading(false);
      }
    }
  }, [showToast]);

  const loadChatMessages = useCallback(async (conversation, { silent = false } = {}) => {
    if (!conversation?.patientId) {
      setChatMessages([]);
      return;
    }

    if (!silent) {
      setMessagesLoading(true);
      setChatError("");
    }
    try {
      const { data } = await api.get(CHAT_BASE + "/history", {
        params: {
          patientId: conversation.patientId,
          appointmentId: conversation.appointmentId || undefined,
        },
      });
      const nextMessages = data.messages || [];
      setChatMessages((prev) => (hasSameContent(prev, nextMessages) ? prev : nextMessages));
      await api.post(CHAT_BASE + "/read", {
        patientId: conversation.patientId,
        appointmentId: conversation.appointmentId || undefined,
      });
      setConversations((prev) =>
        prev.map((item) =>
          String(item.patientId) === String(conversation.patientId) &&
          String(item.appointmentId || "") === String(conversation.appointmentId || "")
            ? { ...item, unreadCount: 0 }
            : item
        )
      );
    } catch (err) {
      if (!silent) {
        setChatMessages([]);
        setChatError(err?.response?.data?.message || "Khong tai duoc lich su tin nhan.");
      }
    } finally {
      if (!silent) {
        setMessagesLoading(false);
      }
    }
  }, []);

  const handleSendChatMessage = async (event) => {
    event.preventDefault();
    const message = chatDraft.trim();

    if (!message || !activeConversation?.patientId) return;

    setChatSending(true);
    setChatError("");
    try {
      const { data } = await api.post(CHAT_BASE + "/message", {
        patientId: activeConversation.patientId,
        appointmentId: activeConversation.appointmentId || undefined,
        message,
      });
      setChatMessages((prev) => [...prev, data.message]);
      setChatDraft("");
      setConversations((prev) => {
        const updated = prev.map((item) =>
          String(item.patientId) === String(activeConversation.patientId) &&
          String(item.appointmentId || "") === String(activeConversation.appointmentId || "")
            ? {
                ...item,
                lastMessage: data.message.message,
                lastMessageAt: data.message.createdAt,
                lastSender: "doctor",
              }
            : item
        );
        return updated.sort(
          (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        );
      });
    } catch (err) {
      setChatError(err?.response?.data?.message || "Khong gui duoc tin nhan.");
    } finally {
      setChatSending(false);
    }
  };

  const handleStatusChange = async (appointmentId, status) => {
    try {
      const { data } = await api.patch(`${BASE}/appointments/${appointmentId}/status`, { status });
      setAppointments((prev) =>
        prev.map((item) => (item._id === appointmentId ? { ...item, status: data.appointment.status } : item))
      );
      showToast("Da cap nhat lich hen.");
    } catch (err) {
      showToast(err?.response?.data?.message || "Khong cap nhat duoc lich hen.", "error");
    }
  };

  useEffect(() => {
    if (!token) return;
    loadProfile();
    loadAppointments(filter);
    loadConversations(false);
  }, [token, filter, loadProfile, loadAppointments, loadConversations]);

  useEffect(() => {
    if (view !== "chat") return;
    loadChatMessages(selectedConversation);
  }, [view, selectedConversationKey, loadChatMessages]);

  useEffect(() => {
    if (!token || view !== "chat") return undefined;

    const intervalId = setInterval(() => {
      loadConversations(true, { silent: true });
      if (selectedConversation?.patientId) {
        loadChatMessages(selectedConversation, { silent: true });
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [token, view, selectedConversationKey, loadConversations, loadChatMessages]);

  const counts = useMemo(
    () => ({
      all: appointments.length,
      pending: appointments.filter((item) => item.status === "pending").length,
      confirmed: appointments.filter((item) => item.status === "confirmed").length,
      completed: appointments.filter((item) => item.status === "completed").length,
      cancelled: appointments.filter((item) => item.status === "cancelled").length,
    }),
    [appointments]
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0),
    [conversations]
  );

  const filteredAppointments = useMemo(
    () => (filter === "all" ? appointments : appointments.filter((item) => item.status === filter)),
    [appointments, filter]
  );

  const initials =
    doctor?.fullName
      ?.split(" ")
      .slice(-2)
      .map((item) => item[0])
      .join("")
      .toUpperCase() || "BS";

  if (!token) {
    return <LoginPage onLogin={onLogin} />;
  }

  return (
    <div className={`app-layout${sidebarOpen ? " sidebar-open" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#1d6fe8" />
              <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <div className="sidebar-brand">HealthyAI</div>
              <div className="sidebar-role">Cong bac si</div>
            </div>
          </div>
        </div>

        {doctor ? (
          <div className="doctor-profile-card">
            {doctor.avatarUrl ? (
              <img className="doc-avatar-lg" src={doctor.avatarUrl} alt={doctor.fullName} />
            ) : (
              <div className="doc-avatar-lg doc-avatar-initials" style={{ background: doctor.avatarColor || "#1d6fe8" }}>
                {initials}
              </div>
            )}
            <div className="doc-info">
              <div className="doc-name">{doctor.fullName}</div>
              <div className="doc-title">{doctor.title} • {doctor.specialty}</div>
              <div className="doc-hospital">{doctor.hospital}</div>
            </div>
          </div>
        ) : null}

        <nav className="sidebar-nav">
          <div className="nav-section-label">Dieu huong</div>
          <button type="button" className={`nav-item${view === "appointments" ? " active" : ""}`} onClick={() => setView("appointments")}>
            <IconCalendar />
            <span>Lich hen ({total})</span>
          </button>
          <button
            type="button"
            className={`nav-item${view === "chat" ? " active" : ""}`}
            onClick={() => {
              setView("chat");
              loadConversations(false);
            }}
          >
            <IconMessage />
            <span>{`Tin nhan${unreadTotal ? ` (${unreadTotal})` : ""}`}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" style={{ background: doctor?.avatarColor || "#1d6fe8" }}>{initials}</div>
            <div className="user-meta">
              <div className="user-name">{doctor?.fullName || "Bac si"}</div>
              <div className="user-role">Doctor</div>
            </div>
          </div>
          <button type="button" className="btn-icon-ghost" onClick={logout} title="Dang xuat">
            <IconLogout />
          </button>
        </div>
      </aside>

      {sidebarOpen ? <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="main-content">
        <header className="topbar">
          <button type="button" className="hamburger" onClick={() => setSidebarOpen((prev) => !prev)}>
            <span /><span /><span />
          </button>
          <div className="topbar-title">
            {view === "appointments" ? <IconCalendar /> : <IconMessage />}
            {view === "appointments" ? "Lich hen cua toi" : "Tin nhan benh nhan"}
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (view === "appointments") {
                  loadAppointments(filter);
                } else {
                  loadConversations();
                  loadChatMessages(activeConversation);
                }
              }}
            >
              <IconRefresh /> Lam moi
            </button>
          </div>
        </header>

        <div className="page-body">
          {view === "appointments" ? (
            <>
              <div className="summary-cards">
                {[
                  { key: "all", label: "Tat ca", cls: "" },
                  { key: "pending", label: "Cho xac nhan", cls: "card-pending" },
                  { key: "confirmed", label: "Da xac nhan", cls: "card-confirmed" },
                  { key: "completed", label: "Hoan thanh", cls: "card-completed" },
                  { key: "cancelled", label: "Da huy", cls: "card-cancelled" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`summary-card ${item.cls}${filter === item.key ? " active" : ""}`}
                    onClick={() => setFilter(item.key)}
                  >
                    <div className="sum-val">{counts[item.key]}</div>
                    <div className="sum-label">{item.label}</div>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner-lg" />
                  <p>Dang tai du lieu...</p>
                </div>
              ) : (
                <div className="panel">
                  <div className="panel-header">
                    <h3>Danh sach lich hen</h3>
                    <span className="badge-count">{filteredAppointments.length} lich hen</span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Benh nhan</th>
                          <th>Thoi gian</th>
                          <th>Dich vu</th>
                          <th>Ghi chu</th>
                          <th>Trang thai</th>
                          <th>Hanh dong</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map((appointment) => (
                          <ApptRow key={appointment._id} appt={appointment} onStatusChange={handleStatusChange} />
                        ))}
                        {!filteredAppointments.length ? (
                          <tr>
                            <td colSpan="6" className="empty-row">Khong co lich hen nao.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="chat-layout">
              <div className="chat-sidebar">
                <div className="panel-header">
                  <h3>Hoi thoai</h3>
                  <span className="badge-count">{conversations.length}</span>
                </div>
                <div className="chat-conversation-list">
                  {chatLoading ? (
                    <div className="chat-empty">Dang tai danh sach tin nhan...</div>
                  ) : conversations.length ? (
                    conversations.map((item) => (
                      <ConversationItem
                        key={`${item.patientId}_${item.appointmentId || "none"}`}
                        item={item}
                        active={getConversationKey(item) === selectedConversationKey}
                        onClick={setSelectedConversation}
                      />
                    ))
                  ) : (
                    <div className="chat-empty">Chua co benh nhan nao nhan tin.</div>
                  )}
                </div>
              </div>

              <div className="chat-thread">
                {activeConversation ? (
                  <>
                    <div className="panel-header">
                      <div>
                        <h3>{activeConversation.patientName || "Benh nhan"}</h3>
                        <div className="muted">
                          {activeConversation.patientPhone || activeConversation.patientEmail || "Khong co lien he"}
                        </div>
                      </div>
                      <div className="chat-thread-summary">
                        {activeConversation.appointmentAt
                          ? new Date(activeConversation.appointmentAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
                          : "Khong gan lich cu the"}
                      </div>
                    </div>

                    <div className="chat-messages">
                      {messagesLoading ? (
                        <div className="chat-empty">Dang tai lich su tin nhan...</div>
                      ) : chatMessages.length ? (
                        chatMessages.map((message) => (
                          <div key={message._id || `${message.createdAt}_${message.message}`} className={`chat-message ${message.sender === "doctor" ? "is-self" : ""}`}>
                            <div className="chat-bubble">
                              <p>{message.message}</p>
                              <time>{new Date(message.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</time>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="chat-empty">Chua co tin nhan nao trong hoi thoai nay.</div>
                      )}
                    </div>

                    <form className="chat-composer" onSubmit={handleSendChatMessage}>
                      <textarea
                        value={chatDraft}
                        onChange={(event) => setChatDraft(event.target.value)}
                        placeholder="Nhap noi dung tra loi benh nhan..."
                        rows={3}
                        disabled={chatSending}
                      />
                      <div className="chat-composer-footer">
                        <span className="muted">Tin nhan se duoc gui den dung benh nhan cua lich hen nay.</span>
                        <button type="submit" className="btn btn-primary" disabled={chatSending || !chatDraft.trim()}>
                          <IconSend /> Gui
                        </button>
                      </div>
                    </form>
                    {chatError ? <div className="alert alert-error">{chatError}</div> : null}
                  </>
                ) : (
                  <div className="chat-empty">Chon mot hoi thoai de xem va tra loi tin nhan.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
