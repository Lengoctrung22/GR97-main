import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const getGreeting = () => {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 11) return "Chào buổi sáng!";
  if (hours >= 11 && hours < 13) return "Chào buổi trưa!";
  if (hours >= 13 && hours < 18) return "Chào buổi chiều!";
  if (hours >= 18 && hours < 22) return "Chào buổi tối!";
  return "Chúc ngủ ngon! 🌌";
};

const fallbackDoctors = [
  {
    _id: "doc_1",
    fullName: "BS. CKII Đặng văn hào",
    specialty: "Nhi khoa",
    avatarColor: "#2b7edb",
    avatarUrl:
      "https://images.pexels.com/photos/6129573/pexels-photo-6129573.jpeg?cs=srgb&dl=pexels-rdne-6129573.jpg&fm=jpg",
  },
  {
    _id: "doc_2",
    fullName: "BS. CKII Lê Thị Thanh Xuân",
    specialty: "Nội tổng quát",
    avatarColor: "#0ea5a2",
    avatarUrl:
      "https://images.pexels.com/photos/7904406/pexels-photo-7904406.jpeg?cs=srgb&dl=pexels-anntarazevich-7904406.jpg&fm=jpg",
  },
  {
    _id: "doc_3",
    fullName: "ThS. BS Lê Như Ngọc",
    specialty: "Sản phụ khoa",
    avatarColor: "#2563eb",
    avatarUrl:
      "https://images.pexels.com/photos/7904457/pexels-photo-7904457.jpeg?cs=srgb&dl=pexels-anntarazevich-7904457.jpg&fm=jpg",
  },
  {
    _id: "doc_4",
    fullName: "BS. CKI Nguyễn Thu Hà",
    specialty: "Nội tiêu hóa",
    avatarColor: "#1d9bf0",
    avatarUrl:
      "https://images.pexels.com/photos/7904470/pexels-photo-7904470.jpeg?cs=srgb&dl=pexels-anntarazevich-7904470.jpg&fm=jpg",
  },
  {
    _id: "doc_5",
    fullName: "BS. CKII Trần Văn Minh",
    specialty: "Tim mạch",
    avatarColor: "#0f7b9b",
    avatarUrl:
      "https://images.pexels.com/photos/28755708/pexels-photo-28755708.jpeg?cs=srgb&dl=pexels-pexels-user-1920570806-28755708.jpg&fm=jpg",
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [metrics, setMetrics] = useState({
    heartRate: 72,
    bloodPressure: "120/80",
    glucose: "5.6",
    glucoseStatus: "Bình thường",
  });
  const [metricsForm, setMetricsForm] = useState({
    heartRate: "72",
    bloodPressure: "120/80",
    glucose: "5.6",
  });
  const [appointments, setAppointments] = useState([]);
  const [upcoming, setUpcoming] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [metricError, setMetricError] = useState("");
  const [metricNotice, setMetricNotice] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, appointmentsRes, doctorsRes] = await Promise.all([
          api.get("/users/dashboard"),
          api.get("/appointments/me"),
          api.get("/doctors"),
        ]);
        setStats(statsRes.data.stats || {});
        const nextMetrics = statsRes.data.healthMetrics || metrics;
        setMetrics(nextMetrics);
        setMetricsForm({
          heartRate: String(nextMetrics.heartRate ?? 72),
          bloodPressure: nextMetrics.bloodPressure || "120/80",
          glucose: String(nextMetrics.glucose ?? 5.6),
        });
        setUpcoming(statsRes.data.upcomingAppointment || null);
        setAppointments((appointmentsRes.data.appointments || []).slice(0, 5));
        const doctorList = doctorsRes.data.doctors || [];
        setDoctors((doctorList.length ? doctorList : fallbackDoctors).slice(0, 3));
      } catch {
        setDoctors(fallbackDoctors);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcomingDate = upcoming?.appointmentAt
    ? dayjs(upcoming.appointmentAt).format("HH:mm - DD/MM/YYYY")
    : "Chưa có lịch hẹn sắp tới";

  const submitMetrics = async (e) => {
    e.preventDefault();
    setSavingMetrics(true);
    setMetricError("");
    setMetricNotice("");
    try {
      const payload = {
        heartRate: Number(metricsForm.heartRate),
        bloodPressure: metricsForm.bloodPressure.trim(),
        glucose: Number(metricsForm.glucose),
      };
      const { data } = await api.patch("/users/health-metrics", payload);
      const nextMetrics = data.healthMetrics || metrics;
      setMetrics(nextMetrics);
      setMetricsForm({
        heartRate: String(nextMetrics.heartRate ?? ""),
        bloodPressure: nextMetrics.bloodPressure || "",
        glucose: String(nextMetrics.glucose ?? ""),
      });
      setShowMetricModal(false);
      setMetricNotice("Đã cập nhật chỉ số sức khỏe.");
    } catch (error) {
      setMetricError(error?.response?.data?.message || "Không cập nhật được chỉ số.");
    } finally {
      setSavingMetrics(false);
    }
  };

  return (
    <section className="dashboard-grid">
      <div className="dashboard-left">
        <h1 className="dashboard-greeting">{getGreeting()}</h1>
        <p className="muted">
          Ban có {stats.upcomingCount || 0} lịch hẹn sắp tới và sức khỏe đang ổn định.
        </p>

        <style>{`
          .dashboard-greeting {
            font-size: 28px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
          }
        `}</style>

        <div className="section-title-row">
          <h3>Lịch khám sắp tới</h3>
          <Link to="/doctors" className="text-link">
            Xem tất cả
          </Link>
        </div>

        <article className="upcoming-card">
          <div>
            <span className="chip-blue">
              {upcoming ? "Sắp tới" : "Chưa có lịch hẹn"}
            </span>
            <h3>{upcoming?.service?.title || "Khám tổng quát"}</h3>
            <p className="muted">{upcoming?.doctorName || "Đang cập nhật bác sĩ"}</p>
            <p className="muted">{upcomingDate}</p>
            <p className="muted">{upcoming?.hospital || "Bệnh viện Đà Nẵng"}</p>
            <div className="row gap-sm">
              <button type="button" className="btn-primary" onClick={() => navigate("/records")}>
                Chi tiết
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/doctors")}>
                Đổi lịch
              </button>
            </div>
          </div>
          <div className="illustration-block">HEALTH</div>
        </article>

        <h3>Lịch sử khám bệnh</h3>
        <div className="stack-sm">
          {loading ? <p className="muted">Đang tải dữ liệu...</p> : null}
          {!loading && appointments.length === 0 ? (
            <p className="muted">Chưa có lịch sử khám bệnh.</p>
          ) : null}
          {appointments.map((item) => (
            <article className="history-item" key={item._id}>
              <div className="dot-icon">{item.service?.title?.[0] || "K"}</div>
              <div>
                <h4>{item.service?.title || "Khám tổng quát"}</h4>
                <p className="muted">{item.doctorName || "Bác sĩ đang cập nhật"}</p>
              </div>
              <div className="history-right">
                <p>{dayjs(item.appointmentAt).format("DD/MM/YYYY")}</p>
                <span className={`status status-${item.status}`}>{item.status}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="dashboard-right">
        <div className="row gap-sm">
          <button type="button" className="btn-primary flex-1" onClick={() => navigate("/diagnosis")}>
            Chẩn đoán AI
          </button>
          <button type="button" className="btn-dark flex-1" onClick={() => navigate("/doctors")}>
            Đặt lịch khám
          </button>
        </div>

        <article className="metric-card">
          <h3>Chỉ số của bạn</h3>
          <div className="metric-grid">
            <div>
              <small>Nhịp tim</small>
              <p>{metrics.heartRate} bpm</p>
            </div>
            <div>
              <small>Huyết áp</small>
              <p>{metrics.bloodPressure}</p>
            </div>
            <div className="full">
              <small>Đường huyết</small>
              <p>
                {metrics.glucose} mmol/L <span>{metrics.glucoseStatus}</span>
              </p>
            </div>
          </div>
          <button type="button" className="btn-secondary w-full" onClick={() => setShowMetricModal(true)}>
            Cập nhật chỉ số
          </button>
          {metricNotice ? <p className="success-text">{metricNotice}</p> : null}
        </article>

        <article className="doctor-list-card">
          <h3>Bác sĩ hàng đầu tại Đà Nẵng</h3>
          <div className="stack-sm">
            {doctors.map((doctor) => (
              <div className="doctor-row" key={doctor._id}>
                <div
                  className="avatar-circle"
                  style={{ background: doctor.avatarColor || "#2b7edb" }}
                >
                  {doctor.avatarUrl ? (
                    <img src={doctor.avatarUrl} alt={doctor.fullName} />
                  ) : (
                    doctor.fullName
                      .split(" ")
                      .slice(-2)
                      .map((v) => v[0])
                      .join("")
                  )}
                </div>
                <div>
                  <p>{doctor.fullName}</p>
                  <small>{doctor.specialty}</small>
                </div>
                <button type="button" className="mini-plus" onClick={() => navigate("/doctors")}>
                  +
                </button>
              </div>
            ))}
          </div>
        </article>
      </aside>

      {showMetricModal ? (
        <div className="modal-backdrop">
          <form className="metric-modal" onSubmit={submitMetrics}>
            <h3>Cập nhật chỉ số sức khỏe</h3>
            <p className="muted">Nhập chỉ số mới để hệ thống cập nhật tổng quan sức khỏe.</p>
            <div className="stack-sm">
              <label>Nhịp tim (bpm)</label>
              <input
                value={metricsForm.heartRate}
                onChange={(e) =>
                  setMetricsForm((prev) => ({ ...prev, heartRate: e.target.value }))
                }
                required
              />
              <label>Huyết áp</label>
              <input
                value={metricsForm.bloodPressure}
                onChange={(e) =>
                  setMetricsForm((prev) => ({ ...prev, bloodPressure: e.target.value }))
                }
                placeholder="120/80"
                required
              />
              <label>Đường huyết (mmol/L)</label>
              <input
                value={metricsForm.glucose}
                onChange={(e) =>
                  setMetricsForm((prev) => ({ ...prev, glucose: e.target.value }))
                }
                required
              />
            </div>
            {metricError ? <p className="error-text">{metricError}</p> : null}
            <div className="row gap-sm">
              <button type="button" className="btn-secondary w-full" onClick={() => setShowMetricModal(false)}>
                Hủy
              </button>
              <button type="submit" className="btn-primary w-full" disabled={savingMetrics}>
                {savingMetrics ? "Đang lưu..." : "Lưu chỉ số"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default DashboardPage;
