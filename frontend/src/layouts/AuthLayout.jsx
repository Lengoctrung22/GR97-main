import { CircleHelp, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

const AuthLayout = ({ children, showLoginHint = false, showRegisterHint = false }) => {
  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <BrandLogo title="HealthAI Da Nang" />
        <div className="auth-topbar-right">
          <button className="icon-btn" type="button" aria-label="Thông báo">
            <Bell size={17} />
          </button>
          <button className="icon-btn" type="button" aria-label="Hỗ trợ">
            <CircleHelp size={17} />
          </button>
          {showLoginHint ? (
            <p className="hint-text">
              Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
          ) : null}
          {showRegisterHint ? (
            <p className="hint-text">
              Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </p>
          ) : null}
        </div>
      </header>

      <main className="auth-content">{children}</main>

      <footer className="auth-footer">
        <p>Dữ liệu được bảo mật theo tiêu chuẩn ISO 27001 & HIPAA</p>
        <div className="auth-footer-links">
          <a href="#">Điều khoản sử dụng</a>
          <a href="#">Chính sách bảo mật</a>
          <a href="#">Liên hệ hỗ trợ</a>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;
