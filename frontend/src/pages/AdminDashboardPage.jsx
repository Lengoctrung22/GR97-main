import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CalendarCheck, Stethoscope, TrendingUp, UserPlus } from "lucide-react";

const CARD_ICONS = [CalendarCheck, Stethoscope, TrendingUp, UserPlus];

const AdminDashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [overviewRes, doctorsRes] = await Promise.all([
          api.get("/admin/overview"),
          api.get("/doctors"),
        ]);
        setOverview(overviewRes.data);
        setDoctors((doctorsRes.data.doctors || []).slice(0, 4));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = [
    {
      label: "Tổng lịch hẹn",
      value: overview?.cards?.appointmentsCount || 0,
      growth: "+12.5%",
    },
    {
      label: "Tổng bác sĩ",
      value: overview?.cards?.doctorsCount || 0,
      growth: "+2.1%",
    },
    {
      label: "Doanh thu tháng",
      value: `${(overview?.cards?.monthlyRevenue || 0).toLocaleString("vi-VN")} ₫`,
      growth: "+8.4%",
    },
    {
      label: "Bệnh nhân mới",
      value: overview?.cards?.newPatients || 0,
      growth: "+15.2%",
    },
  ];

  return (
    <section className="stack-md">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Tổng quan hệ thống.</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Chào mừng quay trở lại. Đây là thống kê hoạt động mới nhất.
        </p>
      </div>

      {/* Stat cards */}
      <div className="admin-card-grid">
        {cards.map((card, i) => {
          const Icon = CARD_ICONS[i];
          return (
            <article key={card.label} className="admin-stat-card">
              <div className="admin-stat-card-row">
                <div className="admin-stat-card-icon">
                  <Icon size={18} />
                </div>
                <small>{card.growth}</small>
              </div>
              <p>{card.label}</p>
              <h3>{loading ? "—" : card.value}</h3>
            </article>
          );
        })}
      </div>

      {/* Chart + featured doctors */}
      <div className="admin-mid-grid">
        <article className="admin-chart-card">
          <div className="section-title-row">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Xu hướng lịch khám (7 ngày qua)</h3>
            <span className="tag">Tuần này</span>
          </div>
          {loading ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>
              Đang tải dữ liệu biểu đồ...
            </p>
          ) : (
            <div className="bar-chart">
              {(overview?.chart || []).map((value, index) => (
                <div key={`${value}_${index}`} className="bar-col">
                  <div style={{ height: `${Math.max(value, 5)}%` }} />
                  <small>T{index + 2}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-doctor-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Bác sĩ tiêu biểu</h3>
          <div className="stack-sm">
            {loading ? (
              <p className="muted">Đang tải...</p>
            ) : doctors.length === 0 ? (
              <p className="muted">Không có dữ liệu</p>
            ) : (
              doctors.map((doctor) => (
                <div key={doctor._id} className="doctor-row">
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
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{doctor.fullName}</p>
                    <small className="muted">{doctor.specialty}</small>
                  </div>
                  <span className="status status-confirmed">Sẵn sàng</span>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {/* Recent appointments table */}
      <article className="admin-table-card">
        <div className="section-title-row">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Lịch hẹn gần đây</h3>
          <a href="#" className="text-link" style={{ fontSize: 13 }}>
            Xem tất cả →
          </a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Bệnh nhân</th>
              <th>Bác sĩ</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : (overview?.recentAppointments || []).length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>
                  Không có lịch hẹn nào
                </td>
              </tr>
            ) : (
              (overview?.recentAppointments || []).map((item) => (
                <tr key={item._id}>
                  <td style={{ fontWeight: 600 }}>{item.user?.fullName || "Khách hàng"}</td>
                  <td>{item.doctor?.fullName || item.doctorName || "Đang cập nhật"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {new Date(item.appointmentAt).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    <span className={`status status-${item.status}`}>{item.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
};

export default AdminDashboardPage;
