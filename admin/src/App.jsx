import { useEffect, useMemo, useState } from "react";
import { ADMIN_TOKEN_KEY, api, setAdminToken } from "./lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const initialDoctorForm = {
  fullName: "",
  title: "BS. CKI",
  specialty: "",
  hospital: "",
  experienceYears: "5",
  rating: "4.7",
  bio: "",
  avatarUrl: "",
  avatarColor: "#2b7edb",
  timeSlots: "08:00, 09:30, 14:00",
  username: "",
  email: "",
  phone: "",
  tempPassword: "",
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });

// --- Icons ---
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconDoctors = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconRevenue = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconUnlock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconKey = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);


// --- Login ---
const LoginForm = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState("admin@booking.com");
  const [password, setPassword] = useState("12345sau");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { identifier, password });
      if (data?.user?.role !== "admin") {
        setError("Tài khoản này không có quyền admin.");
        return;
      }
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err?.response?.data?.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-brand">
        <div className="login-logo">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="#1d6fe8" />
            <path d="M20 8v24M8 20h24" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span>HealthyAI</span>
        </div>
        <p>Admin Portal</p>
      </div>
      <form className="login-card" onSubmit={submit}>
        <h2>Đăng nhập.</h2>
        <p className="login-subtitle">Quản lý hệ thống HealthyAI</p>
        <div className="field-group">
          <label className="field-label">Email / Số điện thoại</label>
          <input
            className="field-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin@booking.com"
          />
        </div>
        <div className="field-group">
          <label className="field-label">Mật khẩu</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? (
            <span className="btn-loading">
              <span className="spinner" />
              Đang đăng nhập...
            </span>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>
    </main>
  );
};

// --- Toast ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose}><IconClose /></button>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [doctorForm, setDoctorForm] = useState(initialDoctorForm);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [searchDoctor, setSearchDoctor] = useState("");
  const [confirmLock, setConfirmLock] = useState(null); // doctor to lock/unlock
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const logout = () => {
    setAdminToken("");
    setToken("");
    setUser(null);
    setOverview(null);
    setStats(null);
    setDoctors([]);
  };

  const onLogin = (nextToken, nextUser) => {
    setAdminToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, statsRes, doctorsRes] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/admin/appointments/stats"),
        api.get("/doctors"),
      ]);
      setOverview(overviewRes.data);
      setStats(statsRes.data);
      setDoctors(doctorsRes.data.doctors || []);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        logout();
        return;
      }
      showToast(err?.response?.data?.message || "Không tải được dữ liệu.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { data } = await api.post("/admin/ai-analytics", {
        type: "overview",
      });
      setAiInsights(data.insights);
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
      setAiError(err.response?.data?.message || "Không thể tải phân tích AI");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const cards = useMemo(
    () => [
      {
        key: "appointments",
        label: "Tổng cuộc hẹn",
        value: stats?.cards?.appointmentsCount ?? overview?.cards?.appointmentsCount ?? 0,
        icon: <IconCalendar />,
        color: "blue",
      },
      {
        key: "doctors",
        label: "Tổng bác sĩ",
        value: stats?.cards?.doctorsCount ?? overview?.cards?.doctorsCount ?? 0,
        icon: <IconDoctors />,
        color: "green",
      },
      {
        key: "paid",
        label: "Đã thanh toán",
        value: stats?.paidCount ?? 0,
        icon: <IconCalendar />,
        color: "purple",
      },
      {
        key: "revenue",
        label: "Doanh thu tháng",
        value: `${(stats?.cards?.monthlyRevenue || 0).toLocaleString("vi-VN")}₫`,
        icon: <IconRevenue />,
        color: "orange",
      },
    ],
    [overview, stats]
  );

  // Chart data
  const appointmentChartData = useMemo(() => {
    if (!overview?.chartSeries) return [];
    return overview.chartSeries.map((item) => ({
      name: new Date(item.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      appointments: item.count,
    }));
  }, [overview]);

  const statusChartData = useMemo(() => {
    if (!stats?.statusCounts) return [];
    const statusMapData = [
      { name: "Chờ xác nhận", value: stats.statusCounts.pending || 0, color: "#f59e0b" },
      { name: "Đã xác nhận", value: stats.statusCounts.confirmed || 0, color: "#3b82f6" },
      { name: "Hoàn thành", value: stats.statusCounts.completed || 0, color: "#10b981" },
      { name: "Đã hủy", value: stats.statusCounts.cancelled || 0, color: "#ef4444" },
    ];
    return statusMapData.filter((item) => item.value > 0);
  }, [stats]);

  const topDoctorsChartData = useMemo(() => {
    if (!stats?.topDoctors) return [];
    return stats.topDoctors.map((doctor) => ({
      name: doctor.doctorName?.length > 15 ? doctor.doctorName.substring(0, 15) + "..." : doctor.doctorName,
      appointments: doctor.appointments,
      completed: doctor.completed,
    }));
  }, [stats]);

  const createDoctor = async (e) => {
    e.preventDefault();
    setSavingDoctor(true);
    try {
      const payload = {
        fullName: doctorForm.fullName.trim(),
        title: doctorForm.title.trim(),
        specialty: doctorForm.specialty.trim(),
        hospital: doctorForm.hospital.trim(),
        experienceYears: Number(doctorForm.experienceYears) || 0,
        rating: Number(doctorForm.rating) || 4.7,
        bio: doctorForm.bio.trim(),
        avatarUrl: doctorForm.avatarUrl.trim(),
        avatarColor: doctorForm.avatarColor.trim() || "#2b7edb",
        timeSlots: doctorForm.timeSlots
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
        account: {
          username: doctorForm.username.trim(),
          email: doctorForm.email.trim(),
          phone: doctorForm.phone.trim(),
          tempPassword: doctorForm.tempPassword.trim(),
          isActive: true,
        },
      };
      await api.post("/admin/doctors", payload);
      setShowAddDoctor(false);
      setDoctorForm(initialDoctorForm);
      showToast("Đã thêm bác sĩ mới thành công!");
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || "Không tạo được bác sĩ.", "error");
    } finally {
      setSavingDoctor(false);
    }
  };

  const handleAvatarFromDevice = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("File không hợp lệ. Vui lòng chọn file ảnh.", "error");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      showToast("Ảnh quá lớn. Vui lòng chọn ảnh ≤ 2MB.", "error");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setDoctorForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
      showToast("Đã tải ảnh từ máy tính.");
    } catch (err) {
      showToast(err?.message || "Không tải được ảnh.", "error");
    }
  };

  const doToggleDoctorActive = async (doctor) => {
    const nextActive = !(doctor.account?.isActive ?? true);
    try {
      await api.patch(`/admin/doctors/${doctor._id}/account`, { isActive: nextActive });
      setDoctors((prev) =>
        prev.map((item) =>
          item._id === doctor._id
            ? { ...item, account: { ...(item.account || {}), isActive: nextActive } }
            : item
        )
      );
      showToast(nextActive ? "Đã mở khóa tài khoản bác sĩ." : "Đã khóa tài khoản bác sĩ.");
    } catch (err) {
      showToast(err?.response?.data?.message || "Không cập nhật được tài khoản.", "error");
    } finally {
      setConfirmLock(null);
    }
  };

  const filteredDoctors = useMemo(() => {
    if (!searchDoctor.trim()) return doctors;
    const q = searchDoctor.toLowerCase();
    return doctors.filter(
      (d) =>
        d.fullName?.toLowerCase().includes(q) ||
        d.specialty?.toLowerCase().includes(q) ||
        d.hospital?.toLowerCase().includes(q)
    );
  }, [doctors, searchDoctor]);

  const statusMap = {
    pending: { label: "Chờ xác nhận", color: "status-pending" },
    confirmed: { label: "Đã xác nhận", color: "status-confirmed" },
    completed: { label: "Hoàn thành", color: "status-completed" },
    cancelled: { label: "Đã hủy", color: "status-cancelled" },
  };

  if (!token) return <LoginForm onLogin={onLogin} />;

  return (
    <div className={`app-layout${sidebarOpen ? " sidebar-open" : ""}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#1d6fe8" />
              <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <div className="sidebar-brand">HealthyAI</div>
              <div className="sidebar-role">Admin Portal</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item${tab === "overview" ? " active" : ""}`}
            onClick={() => { setTab("overview"); setSidebarOpen(false); }}
          >
            <IconDashboard />
            <span>Tổng quan</span>
          </button>
          <button
            type="button"
            className={`nav-item${tab === "doctors" ? " active" : ""}`}
            onClick={() => { setTab("doctors"); setSidebarOpen(false); }}
          >
            <IconDoctors />
            <span>Quản lý bác sĩ</span>
          </button>
          <button
            type="button"
            className={`nav-item${tab === "accounts" ? " active" : ""}`}
            onClick={() => { setTab("accounts"); setSidebarOpen(false); }}
          >
            <IconKey />
            <span>Tài khoản bác sĩ</span>
          </button>
          <button
            type="button"
            className={`nav-item${tab === "stats" ? " active" : ""}`}
            onClick={() => { setTab("stats"); setSidebarOpen(false); }}
          >
            <span>Thống kê AI</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{(user?.fullName || "A")[0].toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.fullName || "Admin"}</div>
              <div className="user-tag">Administrator</div>
            </div>
          </div>
          <button type="button" className="btn-icon-ghost" onClick={logout} title="Đăng xuất">
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
          <div className="topbar-title">
            {tab === "overview" ? "Tổng quan hệ thống" : tab === "doctors" ? "Quản lý bác sĩ" : tab === "accounts" ? "Tài khoản bác sĩ" : "Thống kê AI"}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={loadData}
            title="Làm mới dữ liệu"
          >
            <IconRefresh />
            <span className="hide-xs">Làm mới</span>
          </button>
        </header>

        <div className="page-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner-lg" />
              <p>Đang tải dữ liệu...</p>
            </div>
          )}

          {!loading && tab === "overview" && (
            <div className="overview-page">
              {/* Stat Cards */}
              <div className="cards-grid">
                {cards.map((card) => (
                  <div key={card.key} className={`stat-card card-${card.color}`}>
                    <div className="stat-icon">{card.icon}</div>
                    <div className="stat-body">
                      <div className="stat-label">{card.label}</div>
                      <div className="stat-value">{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="charts-grid">
                {/* Appointments Bar Chart */}
                <div className="panel panel-wide">
                  <div className="panel-header">
                    <h3>Lịch hẹn 7 ngày gần nhất</h3>
                  </div>
                  <div className="chart-container">
                    {appointmentChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={appointmentChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value) => [value, 'Lịch hẹn']}
                          />
                          <Bar dataKey="appointments" fill="#667eea" radius={[4, 4, 0, 0]} name="Lịch hẹn" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Chưa có dữ liệu lịch hẹn</div>
                    )}
                  </div>
                </div>

                {/* Status Pie Chart */}
                <div className="panel">
                  <div className="panel-header">
                    <h3>Tỷ lệ trạng thái</h3>
                  </div>
                  <div className="chart-container">
                    {statusChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Chưa có dữ liệu</div>
                    )}
                  </div>
                </div>

                {/* Top Doctors Bar Chart */}
                <div className="panel panel-wide">
                  <div className="panel-header">
                    <h3>Top 5 bác sĩ có nhiều lịch hẹn nhất</h3>
                  </div>
                  <div className="chart-container">
                    {topDoctorsChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={topDoctorsChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" stroke="#6b7280" fontSize={12} />
                          <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={11} width={100} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value, name) => [value, name === 'appointments' ? 'Tổng lịch hẹn' : 'Hoàn thành']}
                          />
                          <Bar dataKey="appointments" fill="#10b981" name="Tổng lịch hẹn" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="completed" fill="#3b82f6" name="Hoàn thành" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Chưa có dữ liệu bác sĩ</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status + Recent */}
              <div className="panels-grid">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Trạng thái cuộc hẹn</h3>
                  </div>
                  <div className="status-grid">
                    {[
                      { key: "pending", label: "Chờ xác nhận", val: stats?.statusCounts?.pending || 0, cls: "pending" },
                      { key: "confirmed", label: "Đã xác nhận", val: stats?.statusCounts?.confirmed || 0, cls: "confirmed" },
                      { key: "completed", label: "Hoàn thành", val: stats?.statusCounts?.completed || 0, cls: "completed" },
                      { key: "cancelled", label: "Đã hủy", val: stats?.statusCounts?.cancelled || 0, cls: "cancelled" },
                    ].map((s) => (
                      <div key={s.key} className={`status-box status-box-${s.cls}`}>
                        <div className="status-box-val">{s.val}</div>
                        <div className="status-box-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel panel-wide">
                  <div className="panel-header">
                    <h3>Lịch hẹn gần đây</h3>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Bệnh nhân</th>
                          <th>Bác sĩ</th>
                          <th>Thời gian</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.recentAppointments || []).slice(0, 8).map((item) => {
                          const st = statusMap[item.status] || { label: item.status, color: "" };
                          return (
                            <tr key={item._id}>
                              <td>{item.user?.fullName || "Khách hàng"}</td>
                              <td>{item.doctor?.fullName || item.doctorName || "Bác sĩ"}</td>
                              <td>{new Date(item.appointmentAt).toLocaleString("vi-VN")}</td>
                              <td>
                                <span className={`badge ${st.color}`}>{st.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {(overview?.recentAppointments || []).length === 0 && (
                          <tr>
                            <td colSpan="4" className="empty-row">Chưa có lịch hẹn nào</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && tab === "doctors" && (
            <div className="doctors-page">
              <div className="page-toolbar">
                <div className="search-box">
                  <IconSearch />
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Tìm bác sĩ theo tên, chuyên khoa, bệnh viện..."
                    value={searchDoctor}
                    onChange={(e) => setSearchDoctor(e.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setShowAddDoctor(true)}>
                  <IconPlus />
                  Thêm bác sĩ
                </button>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Danh sách bác sĩ</h3>
                  <span className="badge-count">{filteredDoctors.length} bác sĩ</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bác sĩ</th>
                        <th>Chuyên khoa</th>
                        <th>Bệnh viện</th>
                        <th>Đánh giá</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doctor) => {
                        const isActive = doctor.account?.isActive !== false;
                        const initials = doctor.fullName
                          ?.split(" ")
                          .slice(-2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase() || "BS";
                        return (
                          <tr key={doctor._id}>
                            <td>
                              <div className="doctor-cell">
                                {doctor.avatarUrl ? (
                                  <img className="doc-avatar" src={doctor.avatarUrl} alt={doctor.fullName} />
                                ) : (
                                  <div
                                    className="doc-avatar doc-avatar-initials"
                                    style={{ background: doctor.avatarColor || "#2b7edb" }}
                                  >
                                    {initials}
                                  </div>
                                )}
                                <div>
                                  <div className="doc-name">{doctor.fullName}</div>
                                  <div className="doc-title">{doctor.title}</div>
                                </div>
                              </div>
                            </td>
                            <td>{doctor.specialty}</td>
                            <td>{doctor.hospital}</td>
                            <td>
                              <span className="rating-badge">⭐ {doctor.rating}</span>
                            </td>
                            <td>
                              <span className={`account-badge ${isActive ? "active" : "locked"}`}>
                                {isActive ? "Đang hoạt động" : "Đã khóa"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`btn btn-sm ${isActive ? "btn-danger-outline" : "btn-success-outline"}`}
                                onClick={() => setConfirmLock(doctor)}
                              >
                                {isActive ? <><IconLock /> Khóa</> : <><IconUnlock /> Mở khóa</>}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDoctors.length === 0 && (
                        <tr>
                          <td colSpan="6" className="empty-row">
                            {searchDoctor ? "Không tìm thấy bác sĩ phù hợp." : "Chưa có bác sĩ nào."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loading && tab === "accounts" && (
            <div className="doctors-page">
              <div className="panel">
                <div className="panel-header">
                  <h3>Tài khoản đăng nhập bác sĩ</h3>
                  <span className="badge-count">{doctors.length} tài khoản</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bác sĩ</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => {
                        const isActive = doctor.account?.isActive !== false;
                        const initials = doctor.fullName
                          ?.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase() || "BS";
                        return (
                          <tr key={doctor._id}>
                            <td>
                              <div className="doctor-cell">
                                {doctor.avatarUrl ? (
                                  <img className="doc-avatar" src={doctor.avatarUrl} alt={doctor.fullName} />
                                ) : (
                                  <div
                                    className="doc-avatar doc-avatar-initials"
                                    style={{ background: doctor.avatarColor || "#2b7edb" }}
                                  >
                                    {initials}
                                  </div>
                                )}
                                <div>
                                  <div className="doc-name">{doctor.fullName}</div>
                                  <div className="doc-title">{doctor.title}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="code-tag">{doctor.account?.username || "—"}</span>
                            </td>
                            <td>{doctor.account?.email || "—"}</td>
                            <td>{doctor.account?.phone || "—"}</td>
                            <td>
                              <span className={`account-badge ${isActive ? "active" : "locked"}`}>
                                {isActive ? "Đang hoạt động" : "Đã khóa"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`btn btn-sm ${isActive ? "btn-danger-outline" : "btn-success-outline"}`}
                                onClick={() => setConfirmLock(doctor)}
                              >
                                {isActive ? <><IconLock /> Khóa</> : <><IconUnlock /> Mở khóa</>}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {doctors.length === 0 && (
                        <tr>
                          <td colSpan="6" className="empty-row">Chưa có tài khoản nào.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loading && tab === "stats" && (
            <div className="stats-page">
              <div className="page-toolbar">
                <h2>Phân tích AI</h2>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={fetchAIInsights}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <span className="btn-loading"><span className="spinner" />Đang phân tích...</span>
                  ) : (
                    <><IconRefresh /> Tạo phân tích AI</>
                  )}
                </button>
              </div>

              {aiLoading && (
                <div className="loading-state">
                  <div className="spinner-lg" />
                  <p>Đang phân tích dữ liệu...</p>
                </div>
              )}

              {aiError && (
                <div className="alert alert-error">
                  <p>{aiError}</p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={fetchAIInsights}>
                    Thử lại
                  </button>
                </div>
              )}

              {!aiLoading && !aiError && !aiInsights && (
                <div className="panel">
                  <div className="panel-header">
                    <h3>Phân tích AI</h3>
                  </div>
                  <div className="panel-body" style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ marginTop: "16px", color: "#6b7280" }}>
                      Nhấn nút "Tạo phân tích AI" để tạo phân tích thông minh cho hệ thống.
                    </p>
                  </div>
                </div>
              )}

              {aiInsights && !aiLoading && (
                <div className="ai-insights-container">
                  {/* Overall Rating */}
                  <div className="panel ai-rating-panel">
                    <div className="panel-header">
                      <h3>Đánh giá tổng thể</h3>
                    </div>
                    <div className="panel-body">
                      <div className="ai-rating-section">
                        <div
                          className="ai-rating-badge"
                          style={{
                            backgroundColor:
                              aiInsights.overallRating === "tốt"
                                ? "#22c55e"
                                : aiInsights.overallRating === "trung bình"
                                ? "#f59b0"
                                : "#ef4444",
                          }}
                        >
                          {aiInsights.overallRating?.toUpperCase() || "N/A"}
                        </div>
                        <div className="ai-score">
                          <span className="score-value">{aiInsights.ratingScore || 0}</span>
                          <span className="score-label">/100</span>
                        </div>
                      </div>
                      {aiInsights.summary && (
                        <div className="ai-summary">
                          <p>{aiInsights.summary}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trends */}
                  {aiInsights.trends && aiInsights.trends.length > 0 && (
                    <div className="panel">
                      <div className="panel-header">
                        <h3>📈 Xu hướng chính</h3>
                      </div>
                      <div className="panel-body">
                        <ul className="ai-list">
                          {aiInsights.trends.map((trend, index) => (
                            <li key={index}>{trend}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Alerts */}
                  {aiInsights.alerts && aiInsights.alerts.length > 0 && (
                    <div className="panel ai-alerts-panel">
                      <div className="panel-header">
                        <h3>⚠️ Cảnh báo</h3>
                      </div>
                      <div className="panel-body">
                        <ul className="ai-list">
                          {aiInsights.alerts.map((alert, index) => (
                            <li key={index}>{alert}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                    <div className="panel">
                      <div className="panel-header">
                        <h3>💡 Đề xuất cải thiện</h3>
                      </div>
                      <div className="panel-body">
                        <ul className="ai-list">
                          {aiInsights.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Prediction */}
                  {aiInsights.prediction && (
                    <div className="panel ai-prediction-panel">
                      <div className="panel-header">
                        <h3>🎯 Dự đoán xu hướng</h3>
                      </div>
                      <div className="panel-body">
                        <p>{aiInsights.prediction}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm lock modal */}
      {confirmLock && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setConfirmLock(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>
                {confirmLock.account?.isActive !== false ? "Khóa tài khoản" : "Mở khóa tài khoản"}
              </h3>
              <button type="button" className="btn-icon" onClick={() => setConfirmLock(null)}>
                <IconClose />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc muốn{" "}
                <strong>
                  {confirmLock.account?.isActive !== false ? "khóa" : "mở khóa"}
                </strong>{" "}
                tài khoản bác sĩ <strong>{confirmLock.fullName}</strong>?
              </p>
              {confirmLock.account?.isActive !== false && (
                <div className="alert alert-warning">
                  Bác sĩ này sẽ không thể đăng nhập vào hệ thống sau khi bị khóa.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmLock(null)}>
                Hủy
              </button>
              <button
                type="button"
                className={`btn ${confirmLock.account?.isActive !== false ? "btn-danger" : "btn-success"}`}
                onClick={() => doToggleDoctorActive(confirmLock)}
              >
                {confirmLock.account?.isActive !== false ? (
                  <><IconLock /> Khóa tài khoản</>
                ) : (
                  <><IconUnlock /> Mở khóa</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor modal */}
      {showAddDoctor && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAddDoctor(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Thêm bác sĩ mới</h3>
              <button type="button" className="btn-icon" onClick={() => setShowAddDoctor(false)}>
                <IconClose />
              </button>
            </div>

            <form className="modal-body doctor-form" onSubmit={createDoctor}>
              <div className="form-section-title">Thông tin cá nhân</div>
              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label">Họ và tên *</label>
                  <input
                    className="field-input"
                    required
                    value={doctorForm.fullName}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Học vị *</label>
                  <input
                    className="field-input"
                    required
                    value={doctorForm.title}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Chuyên khoa *</label>
                  <input
                    className="field-input"
                    required
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, specialty: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Bệnh viện *</label>
                  <input
                    className="field-input"
                    required
                    value={doctorForm.hospital}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, hospital: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Số năm kinh nghiệm</label>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    value={doctorForm.experienceYears}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, experienceYears: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Đánh giá</label>
                  <input
                    className="field-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={doctorForm.rating}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, rating: e.target.value }))}
                  />
                </div>
                <div className="field-group field-full">
                  <label className="field-label">Giới thiệu</label>
                  <textarea
                    className="field-input"
                    value={doctorForm.bio}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, bio: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-section-title">Ảnh đại diện</div>
              <div className="form-grid">
                <div className="field-group field-full">
                  <label className="field-label">URL ảnh</label>
                  <input
                    className="field-input"
                    value={doctorForm.avatarUrl}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="field-group field-full">
                  <label className="field-label">Hoặc tải từ máy tính</label>
                  <input className="field-input" type="file" accept="image/*" onChange={handleAvatarFromDevice} />
                </div>
                {doctorForm.avatarUrl && (
                  <div className="field-group field-full">
                    <div className="avatar-preview-box">
                      <img src={doctorForm.avatarUrl} alt="preview" />
                      <div>
                        <div className="field-label">Ảnh xem trước</div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDoctorForm((p) => ({ ...p, avatarUrl: "" }))}
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="field-group">
                  <label className="field-label">Màu avatar (khi không có ảnh)</label>
                  <input
                    className="field-input"
                    value={doctorForm.avatarColor}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, avatarColor: e.target.value }))}
                    placeholder="#2b7edb"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Giờ khám (cách nhau bởi dấu phẩy)</label>
                  <input
                    className="field-input"
                    value={doctorForm.timeSlots}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, timeSlots: e.target.value }))}
                    placeholder="08:00, 09:30, 14:00"
                  />
                </div>
              </div>

              <div className="form-section-title">Tài khoản đăng nhập</div>
              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label">Username</label>
                  <input
                    className="field-input"
                    value={doctorForm.username}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input
                    className="field-input"
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Số điện thoại</label>
                  <input
                    className="field-input"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Mật khẩu tạm</label>
                  <input
                    className="field-input"
                    value={doctorForm.tempPassword}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, tempPassword: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddDoctor(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingDoctor}>
                  {savingDoctor ? (
                    <span className="btn-loading"><span className="spinner" />Đang tạo...</span>
                  ) : (
                    <><IconPlus /> Tạo bác sĩ</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;
