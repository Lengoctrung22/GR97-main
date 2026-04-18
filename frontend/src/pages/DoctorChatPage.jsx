import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import {
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock3,
  MessageSquare,
  PhoneCall,
  SendHorizontal,
  ShieldCheck,
  Stethoscope,
  Video,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useSocket } from "../context/SocketContext";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.locale("vi");

const statusLabelMap = {
  confirmed: "Da xac nhan",
  completed: "Da hoan tat",
  pending: "Cho xac nhan",
  cancelled: "Da huy",
};

const statusToneMap = {
  confirmed: "is-confirmed",
  completed: "is-completed",
  pending: "is-pending",
  cancelled: "is-cancelled",
};

const getDoctorId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getDoctorName = (value) =>
  value?.fullName || value?.name || value?.doctorName || value?.title || "Bac si tu van";

const getDoctorAvatar = (value) => value?.avatarUrl || value?.avatar || "";

const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const formatSchedule = (value) => {
  if (!value) return "Chua co lich hen";
  return dayjs(value).format("HH:mm [|] DD/MM/YYYY");
};

const formatRelative = (value) => {
  if (!value) return "Vua xong";
  return dayjs(value).fromNow();
};

const normalizeDoctor = (doctor, fallback = {}) => ({
  id: getDoctorId(doctor) || fallback.id || fallback.doctorId || "",
  name: getDoctorName(doctor) || fallback.doctorName || "Bac si tu van",
  specialty: doctor?.specialty || fallback.specialty || fallback.doctorSpecialty || "Tu van tong quat",
  hospital: doctor?.hospital || fallback.hospital || "HealthyAI Care",
  avatar: getDoctorAvatar(doctor) || fallback.avatar || fallback.doctorAvatar || "",
  avatarColor: doctor?.avatarColor || fallback.avatarColor || "#1f76d6",
  title: doctor?.title || fallback.title || "Bac si",
});

const buildConversationPreview = (current, doctor, message, isIncoming = false) => ({
  doctorId: doctor.id,
  doctorName: doctor.name,
  doctorSpecialty: doctor.specialty,
  doctorAvatar: doctor.avatar,
  lastMessage: message?.message || current?.lastMessage || "",
  lastMessageAt: message?.createdAt || current?.lastMessageAt || new Date().toISOString(),
  unreadCount: isIncoming ? (current?.unreadCount || 0) + 1 : 0,
});

const hasSameContent = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const DoctorAvatar = ({ doctor, className = "" }) => {
  const name = doctor?.name || "Bac si";
  const avatar = doctor?.avatar;

  return (
    <div
      className={`doctor-chat-avatar ${className}`.trim()}
      style={{ "--avatar-accent": doctor?.avatarColor || "#1f76d6" }}
      aria-hidden="true"
    >
      {avatar ? <img src={avatar} alt={name} /> : <span>{getInitials(name)}</span>}
    </div>
  );
};

export default function DoctorChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId");
  const appointmentId = searchParams.get("appointmentId");
  const { isConnected } = useSocket();

  const [appointments, setAppointments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState("appointments");
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarError, setSidebarError] = useState("");
  const [messageError, setMessageError] = useState("");
  const messagesEndRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => String(item.doctorId) === String(doctorId)) || null,
    [conversations, doctorId]
  );

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const syncSelectedDoctor = async (id) => {
    if (!id) {
      setSelectedDoctor(null);
      setSelectedAppointment(null);
      return;
    }

    const appointmentById = appointmentId
      ? appointments.find((item) => String(item._id) === String(appointmentId))
      : null;
    const appointmentMatch =
      appointmentById ||
      appointments.find((item) => {
        const doctorKey = getDoctorId(item.doctor);
        return String(doctorKey) === String(id);
      });

    if (appointmentMatch?.doctor) {
      setSelectedDoctor(
        normalizeDoctor(appointmentMatch.doctor, {
          hospital: appointmentMatch.hospital,
        })
      );
      setSelectedAppointment(appointmentMatch);
      return;
    }

    const conversationMatch = conversations.find((item) => String(item.doctorId) === String(id));

    if (conversationMatch) {
      setSelectedDoctor(
        normalizeDoctor(
          {
            _id: conversationMatch.doctorId,
            name: conversationMatch.doctorName,
            specialty: conversationMatch.doctorSpecialty,
            avatar: conversationMatch.doctorAvatar,
          },
          conversationMatch
        )
      );
      if (appointmentId) {
        const linkedAppointment = appointments.find((item) => String(item._id) === String(appointmentId));
        setSelectedAppointment(linkedAppointment || null);
      } else {
        setSelectedAppointment(null);
      }
      return;
    }

    try {
      const { data } = await api.get(`/doctors/${id}`);
      setSelectedDoctor(normalizeDoctor(data.doctor));
    } catch {
      setSelectedDoctor({
        id,
        name: "Bac si tu van",
        specialty: "Tu van tong quat",
        hospital: "HealthyAI Care",
        avatar: "",
        avatarColor: "#1f76d6",
        title: "Bac si",
      });
    }
  };

  const loadSidebarData = async ({ silent = false } = {}) => {
    if (!silent) {
      setSidebarLoading(true);
    }
    setSidebarError("");

    const [appointmentsResult, conversationsResult] = await Promise.allSettled([
      api.get("/doctor-chat/appointments"),
      api.get("/doctor-chat/conversations"),
    ]);

    if (appointmentsResult.status === "fulfilled") {
      const nextAppointments = appointmentsResult.value.data.appointments || [];
      setAppointments((prev) => (hasSameContent(prev, nextAppointments) ? prev : nextAppointments));
    } else {
      if (!silent) {
        setAppointments([]);
      }
    }

    if (conversationsResult.status === "fulfilled") {
      const nextConversations = conversationsResult.value.data.conversations || [];
      setConversations((prev) => (hasSameContent(prev, nextConversations) ? prev : nextConversations));
    } else {
      if (!silent) {
        setConversations([]);
      }
    }

    if (
      appointmentsResult.status === "rejected" &&
      conversationsResult.status === "rejected"
    ) {
      setSidebarError("Khong the tai danh sach trao doi voi bac si. Vui long thu lai.");
    }

    if (!silent) {
      setSidebarLoading(false);
    }
  };

  const loadMessages = async (id, currentAppointmentId, { silent = false } = {}) => {
    if (!id) {
      setMessages([]);
      return;
    }

    if (!silent) {
      setMessagesLoading(true);
    }
    if (!silent) {
      setMessageError("");
    }

    try {
      const { data } = await api.get("/doctor-chat/history", {
        params: {
          doctorId: id,
          appointmentId: currentAppointmentId || undefined,
        },
      });

      const nextMessages = data.messages || [];
      setMessages((prev) => (hasSameContent(prev, nextMessages) ? prev : nextMessages));
      api
        .post("/doctor-chat/read", {
          doctorId: id,
          appointmentId: currentAppointmentId || undefined,
        })
        .catch(() => {});
      if (!silent && nextMessages.length) {
        setTimeout(() => scrollToBottom("auto"), 50);
      }
    } catch {
      if (!silent) {
        setMessages([]);
        setMessageError("Khong the tai lich su tin nhan. Vui long thu lai.");
      }
    } finally {
      if (!silent) {
        setMessagesLoading(false);
      }
    }
  };

  useEffect(() => {
    loadSidebarData();
  }, []);

  useEffect(() => {
    syncSelectedDoctor(doctorId);
  }, [doctorId, appointmentId, appointments, conversations]);

  useEffect(() => {
    loadMessages(doctorId, appointmentId);
  }, [doctorId, appointmentId]);

  useEffect(() => {
    const handleIncomingDoctorMessage = (event) => {
      const payload = event.detail;
      const incomingMessage = payload?.message;
      const incomingDoctorId = String(payload?.doctorId || incomingMessage?.doctor || "");

      if (!incomingMessage || !incomingDoctorId) {
        return;
      }

      const incomingAppointmentId = String(incomingMessage.appointment || "");
      const isActiveDoctor = String(doctorId || "") === incomingDoctorId;
      const isActiveAppointment =
        !appointmentId || incomingAppointmentId === String(appointmentId);
      const shouldShowInCurrentThread = isActiveDoctor && isActiveAppointment;

      setConversations((prev) => {
        const existing = prev.find((item) => String(item.doctorId) === incomingDoctorId) || null;
        const doctor = selectedDoctor && String(selectedDoctor.id) === incomingDoctorId
          ? selectedDoctor
          : {
              id: incomingDoctorId,
              name: existing?.doctorName || "Bac si tu van",
              specialty: existing?.doctorSpecialty || "Tu van tong quat",
              avatar: existing?.doctorAvatar || "",
              avatarColor: "#1f76d6",
            };
        const preview = buildConversationPreview(
          existing,
          doctor,
          incomingMessage,
          !shouldShowInCurrentThread
        );
        const rest = prev.filter((item) => String(item.doctorId) !== incomingDoctorId);
        return [preview, ...rest];
      });

      if (!shouldShowInCurrentThread) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((item) => String(item._id) === String(incomingMessage._id))) {
          return prev;
        }
        return [...prev, incomingMessage];
      });

      api
        .post("/doctor-chat/read", {
          doctorId: incomingDoctorId,
          appointmentId: appointmentId || undefined,
        })
        .catch(() => {});
    };

    window.addEventListener("new-doctor-message", handleIncomingDoctorMessage);
    return () => {
      window.removeEventListener("new-doctor-message", handleIncomingDoctorMessage);
    };
  }, [appointmentId, doctorId, selectedDoctor]);

  useEffect(() => {
    if (messages.length) {
      scrollToBottom();
    }
  }, [messages.length]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadSidebarData({ silent: true });
      if (doctorId) {
        loadMessages(doctorId, appointmentId, { silent: true });
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [appointmentId, doctorId]);

  const handleRetrySidebar = () => {
    loadSidebarData();
  };

  const handleRetryMessages = () => {
    loadMessages(doctorId, appointmentId);
  };

  const handleOpenConversation = (doctor, appointment = null) => {
    const params = new URLSearchParams();
    params.set("doctorId", getDoctorId(doctor));

    if (appointment?._id) {
      params.set("appointmentId", appointment._id);
    }

    navigate(`/doctor-chat?${params.toString()}`);
  };

  const handleBackToList = () => {
    navigate("/doctor-chat");
  };

  const handleOpenVideoCall = () => {
    if (!doctorId) return;

    const params = new URLSearchParams();
    params.set("doctorId", doctorId);
    if (selectedAppointment?._id) {
      params.set("appointmentId", selectedAppointment._id);
    }
    navigate(`/video-call?${params.toString()}`);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (!trimmed || !doctorId) return;

    setSending(true);
    setMessageError("");

    try {
      const { data } = await api.post("/doctor-chat/message", {
        doctorId,
        appointmentId: appointmentId || undefined,
        message: trimmed,
      });

      setMessages((prev) => [...prev, data.message]);
      setDraft("");

      if (selectedDoctor) {
        setConversations((prev) => {
          const nextDoctor = selectedDoctor;
          const existingIndex = prev.findIndex(
            (item) => String(item.doctorId) === String(nextDoctor.id)
          );
          const nextPreview = buildConversationPreview(
            existingIndex >= 0 ? prev[existingIndex] : null,
            nextDoctor,
            data.message
          );

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated.splice(existingIndex, 1);
            return [nextPreview, ...updated];
          }

          return [nextPreview, ...prev];
        });
      }
    } catch (error) {
      setMessageError(error?.response?.data?.message || "Khong gui duoc tin nhan.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`doctor-chat-shell${doctorId ? " has-active-thread" : ""}`}>
      <aside className="doctor-chat-sidebar">
        <div className="doctor-chat-sidebar-head">
          <div>
            <p className="doctor-chat-eyebrow">Lien he chuyen mon</p>
            <h1>Tin nhan voi bac si</h1>
          </div>
          <span className={`doctor-chat-connection${isConnected ? " is-online" : ""}`}>
            {isConnected ? "Dang ket noi" : "Ngoai tuyen"}
          </span>
        </div>

        <div className="doctor-chat-tabs">
          <button
            type="button"
            className={`doctor-chat-tab${activeTab === "appointments" ? " active" : ""}`}
            onClick={() => setActiveTab("appointments")}
          >
            <CalendarDays size={16} />
            Lich hen
          </button>
          <button
            type="button"
            className={`doctor-chat-tab${activeTab === "conversations" ? " active" : ""}`}
            onClick={() => setActiveTab("conversations")}
          >
            <MessageSquare size={16} />
            Cuoc tro chuyen
          </button>
        </div>

        {sidebarError ? (
          <div className="doctor-chat-feedback is-error">
            <p>{sidebarError}</p>
            <button type="button" className="text-link" onClick={handleRetrySidebar}>
              Thu lai
            </button>
          </div>
        ) : null}

        <div className="doctor-chat-list">
          {sidebarLoading ? (
            <div className="doctor-chat-empty">
              <MessageSquare size={36} />
              <p>Dang tai du lieu trao doi...</p>
            </div>
          ) : activeTab === "appointments" ? (
            appointments.length ? (
              appointments.map((item) => {
                const doctor = normalizeDoctor(item.doctor, { hospital: item.hospital });
                const isActive =
                  String(doctor.id) === String(doctorId) &&
                  (!appointmentId || String(item._id) === String(appointmentId));

                return (
                  <button
                    key={item._id}
                    type="button"
                    className={`doctor-chat-list-card${isActive ? " active" : ""}`}
                    onClick={() => handleOpenConversation(item.doctor, item)}
                  >
                    <DoctorAvatar doctor={doctor} />
                    <div className="doctor-chat-list-main">
                      <div className="doctor-chat-list-title">
                        <strong>{doctor.name}</strong>
                        <span className={`doctor-chat-badge ${statusToneMap[item.status] || ""}`}>
                          {statusLabelMap[item.status] || item.status || "Lich hen"}
                        </span>
                      </div>
                      <p>{doctor.specialty}</p>
                      <small>
                        <Clock3 size={13} />
                        {formatSchedule(item.appointmentAt)}
                      </small>
                    </div>
                    <ChevronRight size={18} className="doctor-chat-list-arrow" />
                  </button>
                );
              })
            ) : (
              <div className="doctor-chat-empty">
                <CalendarDays size={36} />
                <p>Ban chua co lich hen nao du dieu kien de nhan tin.</p>
                <button type="button" className="btn-secondary" onClick={() => navigate("/doctors")}>
                  Dat lich kham
                </button>
              </div>
            )
          ) : conversations.length ? (
            conversations.map((item) => {
              const doctor = normalizeDoctor(
                {
                  _id: item.doctorId,
                  name: item.doctorName,
                  specialty: item.doctorSpecialty,
                  avatar: item.doctorAvatar,
                },
                item
              );
              const isActive = String(item.doctorId) === String(doctorId);

              return (
                <button
                  key={item.doctorId}
                  type="button"
                  className={`doctor-chat-list-card${isActive ? " active" : ""}`}
                  onClick={() => handleOpenConversation({ _id: item.doctorId })}
                >
                  <DoctorAvatar doctor={doctor} />
                  <div className="doctor-chat-list-main">
                    <div className="doctor-chat-list-title">
                      <strong>{doctor.name}</strong>
                      <time>{formatRelative(item.lastMessageAt)}</time>
                    </div>
                    <p>{doctor.specialty}</p>
                    <small>{item.lastMessage || "Bat dau cuoc tro chuyen moi."}</small>
                  </div>
                  {item.unreadCount ? (
                    <span className="doctor-chat-unread">{item.unreadCount}</span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="doctor-chat-empty">
              <MessageSquare size={36} />
              <p>Chua co cuoc tro chuyen nao voi bac si.</p>
            </div>
          )}
        </div>
      </aside>

      <div className="doctor-chat-thread">
        {doctorId && selectedDoctor ? (
          <>
            <header className="doctor-chat-thread-head">
              <div className="doctor-chat-thread-identity">
                <button type="button" className="doctor-chat-back" onClick={handleBackToList}>
                  <ArrowLeft size={18} />
                </button>
                <DoctorAvatar doctor={selectedDoctor} className="is-large" />
                <div>
                  <div className="doctor-chat-headline">
                    <h2>{selectedDoctor.name}</h2>
                    <span className="doctor-chat-trust">
                      <ShieldCheck size={14} />
                      Bao mat ho so
                    </span>
                  </div>
                  <p>{selectedDoctor.specialty}</p>
                  <small>{selectedDoctor.hospital}</small>
                </div>
              </div>

              <div className="doctor-chat-thread-actions">
                <button type="button" className="icon-btn" title="Goi dien">
                  <PhoneCall size={18} />
                </button>
                <button type="button" className="btn-primary" onClick={handleOpenVideoCall}>
                  <Video size={16} />
                  Tu van video
                </button>
              </div>
            </header>

            <div className="doctor-chat-thread-meta">
              <div className="doctor-chat-meta-card">
                <span>Lich hen</span>
                <strong>
                  {selectedAppointment ? formatSchedule(selectedAppointment.appointmentAt) : "Khong gan lich cu the"}
                </strong>
              </div>
              <div className="doctor-chat-meta-card">
                <span>Trang thai</span>
                <strong>
                  {selectedAppointment
                    ? statusLabelMap[selectedAppointment.status] || selectedAppointment.status
                    : "Dang trao doi"}
                </strong>
              </div>
              <div className="doctor-chat-meta-card">
                <span>Luu y</span>
                <strong>Gui trieu chung, don thuoc, ket qua xet nghiem neu can</strong>
              </div>
            </div>

            <div className="doctor-chat-messages">
              {messagesLoading ? (
                <div className="doctor-chat-empty">
                  <MessageSquare size={36} />
                  <p>Dang tai lich su tin nhan...</p>
                </div>
              ) : messageError ? (
                <div className="doctor-chat-feedback is-error">
                  <p>{messageError}</p>
                  <button type="button" className="text-link" onClick={handleRetryMessages}>
                    Tai lai
                  </button>
                </div>
              ) : messages.length ? (
                messages.map((item) => {
                  const isPatient = item.sender === "patient";

                  return (
                    <article
                      key={item._id || `${item.createdAt}_${item.message}`}
                      className={`doctor-message${isPatient ? " is-self" : ""}`}
                    >
                      {!isPatient ? <DoctorAvatar doctor={selectedDoctor} className="is-compact" /> : null}
                      <div className="doctor-message-bubble">
                        <p>{item.message}</p>
                        <time>{dayjs(item.createdAt).format("HH:mm [|] DD/MM/YYYY")}</time>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="doctor-chat-empty is-thread">
                  <Stethoscope size={38} />
                  <p>Chua co tin nhan nao trong cuoc tro chuyen nay.</p>
                  <small>Hay bat dau bang cach mo ta trieu chung, thuoc dang dung, hoac ket qua can co.</small>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="doctor-chat-composer" onSubmit={handleSendMessage}>
              <div className="doctor-chat-composer-box">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Nhap noi dung can trao doi voi bac si..."
                  rows={1}
                  disabled={sending}
                />
                <button type="submit" className="btn-primary" disabled={sending || !draft.trim()}>
                  <SendHorizontal size={16} />
                  Gui
                </button>
              </div>
              <p className="doctor-chat-composer-note">
                Tin nhan mang tinh ho tro tu van. Trong truong hop khan cap, vui long lien he co so y te gan nhat.
              </p>
            </form>
          </>
        ) : (
          <div className="doctor-chat-placeholder">
            <div className="doctor-chat-placeholder-card">
              <MessageSquare size={40} />
              <h2>Chon mot cuoc trao doi voi bac si</h2>
              <p>
                Mo lich hen hoac cuoc tro chuyen ben trai de xem lich su tu van, gui them thong tin benh ly va tiep tuc theo doi.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="doctor-chat-aside">
        <div className="doctor-chat-panel doctor-chat-panel-highlight">
          <p className="doctor-chat-eyebrow">Huong dan nhanh</p>
          <h3>Gui thong tin dung cach de bac si phan hoi nhanh hon</h3>
          <ul className="doctor-chat-checklist">
            <li>Mo ta trieu chung, muc do va thoi gian bat dau.</li>
            <li>Neu co, gui them ket qua xet nghiem, toa thuoc hoac chi so bat thuong.</li>
            <li>Noi ro tien su benh ly, di ung thuoc va cac dau hieu canh bao.</li>
          </ul>
        </div>

        <div className="doctor-chat-panel">
          <div className="section-title-row">
            <h3>Thong tin cuoc hen</h3>
            <CalendarDays size={16} />
          </div>
          {selectedAppointment ? (
            <div className="doctor-chat-summary">
              <div>
                <span>Thoi gian</span>
                <strong>{formatSchedule(selectedAppointment.appointmentAt)}</strong>
              </div>
              <div>
                <span>Trang thai</span>
                <strong>{statusLabelMap[selectedAppointment.status] || selectedAppointment.status}</strong>
              </div>
              <div>
                <span>Ghi chu</span>
                <strong>{selectedAppointment.notes || "Chua co ghi chu bo sung"}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">
              Cuoc tro chuyen nay chua duoc gan voi mot lich hen cu the. Ban van co the tiep tuc nhan tin voi bac si.
            </p>
          )}
        </div>

        <div className="doctor-chat-panel">
          <div className="section-title-row">
            <h3>Nhat ky trao doi</h3>
            <CheckCheck size={16} />
          </div>
          <div className="doctor-chat-summary">
            <div>
              <span>Tin nhan</span>
              <strong>{messages.length}</strong>
            </div>
            <div>
              <span>Cap nhat gan nhat</span>
              <strong>
                {messages.length ? formatRelative(messages[messages.length - 1]?.createdAt) : "Chua co"}
              </strong>
            </div>
            <div>
              <span>Cuoc tro chuyen</span>
              <strong>{activeConversation ? "Dang hoat dong" : "Moi bat dau"}</strong>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
