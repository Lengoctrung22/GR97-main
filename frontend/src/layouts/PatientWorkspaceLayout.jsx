import { Bell, LayoutGrid, CalendarDays, FileText, Bot, Settings, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Clock from "../components/Clock";
import { useAuth } from "../context/AuthContext";

const menu = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutGrid },
  { to: "/diagnosis", label: "Chẩn đoán AI", icon: Bot },
  { to: "/appointments", label: "Lịch hẹn", icon: CalendarDays },
  { to: "/records", label: "Hồ sơ bệnh án", icon: FileText },
  { to: "/settings", label: "Cài đặt", icon: Settings },
];

const PatientWorkspaceLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }) => `workspace-link${isActive ? " active" : ""}`;

  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <BrandLogo title="HealthAI Da Nang" subtitle="Hệ thống y tế thông minh" />
        <Clock />
        <div className="workspace-menu">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
        <div className="workspace-help">
          <p>Cần hỗ trợ khẩn cấp?</p>
          <small>Liên hệ ngay đội ngũ y tế trực tuyến 24/7</small>
          <button type="button">1900 1234</button>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <h2>Xin chào, {user?.fullName || "Người dùng"}</h2>
          <div className="workspace-actions">
            <div className="search-chip">
              <Search size={16} />
              <span>Tìm kiếm nhanh...</span>
            </div>
            <button type="button" className="icon-btn">
              <Bell size={17} />
            </button>
            <div className="workspace-user">{user?.fullName || "Người dùng"}</div>
            <button type="button" className="btn-secondary" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <div className="workspace-body">{children}</div>
      </section>
    </div>
  );
};

export default PatientWorkspaceLayout;
