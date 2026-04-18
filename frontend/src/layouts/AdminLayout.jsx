import {
  LayoutGrid,
  Users,
  CalendarClock,
  BarChart3,
  Settings,
  Bell,
  CircleHelp,
  Search,
  HeadphonesIcon,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Clock from "../components/Clock";
import { useAuth } from "../context/AuthContext";

const adminMenu = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: LayoutGrid },
  { to: "/admin/doctors", label: "Quản lý Bác sĩ", icon: Users },
  { to: "/admin/schedules", label: "Quản lý Lịch khám", icon: CalendarClock },
  { to: "/admin/stats", label: "Thống kê", icon: BarChart3 },
  { to: "/admin/settings", label: "Cài đặt", icon: Settings },
];

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }) => `admin-link${isActive ? " active" : ""}`;

  const initials = (name = "") =>
    name
      .split(" ")
      .slice(-2)
      .map((v) => v[0])
      .join("")
      .toUpperCase();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <BrandLogo title="HealthAI" subtitle="Hệ thống quản trị" />
        <Clock />

        <div className="admin-menu-section">Menu chính</div>
        <nav className="admin-menu">
          {adminMenu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-support" style={{ marginTop: "auto", marginBottom: "10px" }}>
          <HeadphonesIcon size={16} />
          Trung tâm Hỗ trợ 24/7
        </div>

        <div className="admin-sidebar-profile">
          <div className="avatar-circle" style={{ background: "#2563eb" }}>
            {initials(user?.fullName || "Admin")}
          </div>
          <div className="admin-sidebar-profile-info" style={{ flex: 1, minWidth: 0 }}>
            <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.fullName || "Admin"}
            </p>
            <small>Quản trị viên</small>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            style={{
              background: "transparent",
              color: "#64748b",
              padding: "6px",
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="search-chip wide">
            <Search size={16} />
            <span>Tìm kiếm bệnh nhân, bác sĩ...</span>
          </div>
          <div className="admin-actions">
            <button type="button" className="icon-btn">
              <Bell size={17} />
            </button>
            <button type="button" className="icon-btn">
              <CircleHelp size={17} />
            </button>
            <div className="admin-user">
              <p>{user?.role === "admin" ? "Admin Đà Nẵng" : user?.fullName || "Admin"}</p>
              <small>Quản trị viên hệ thống</small>
            </div>
          </div>
        </header>
        <div className="admin-body">{children}</div>
      </section>
    </div>
  );
};

export default AdminLayout;
