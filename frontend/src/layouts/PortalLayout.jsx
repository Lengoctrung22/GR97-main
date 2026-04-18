import { Bell, Search, UserRound, Camera, MessageSquare } from "lucide-react";
import { NavLink } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Clock from "../components/Clock";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

const navItems = [
  { to: "/dashboard", label: "Trang chủ" },
  { to: "/doctors", label: "Bác sĩ" },
  { to: "/diagnosis", label: "Chẩn đoán AI" },
  { to: "/records", label: "Hồ sơ bệnh án" },
  { to: "/analyze", label: "Phân tích ảnh", icon: Camera },
  { to: "/doctor-chat", label: "Chat bác sĩ", icon: MessageSquare },
];

const PortalLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navClass = ({ isActive }) => `portal-nav-link${isActive ? " active" : ""}`;

  return (
    <div className="portal-layout">
      <header className="portal-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <BrandLogo title="Da Nang Care" />
          <Clock />
        </div>

        <nav className="portal-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.icon && <item.icon size={16} />}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="portal-actions">
          <div className="search-chip">
            <Search size={16} />
            <span>Tìm kiếm nhanh...</span>
          </div>
          <NotificationBell />
          <div className="user-mini">
            <UserRound size={18} />
            <div>
              <p>{user?.fullName || "Người dùng"}</p>
              <small>ID: BN-99210</small>
            </div>
          </div>
          <button type="button" className="btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="portal-main">{children}</main>
    </div>
  );
};

export default PortalLayout;
