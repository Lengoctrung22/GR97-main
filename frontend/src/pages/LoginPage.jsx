import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Cloud, Lock, ShieldCheck, UserRound, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user was redirected due to timeout
  const isTimeout = location.search.includes("reason=timeout");

  // Show timeout message if redirected
  useEffect(() => {
    if (isTimeout) {
      setError("Phiên đăng nhập đã hết hạn do không hoạt động trong 5 phút. Vui lòng đăng nhập lại.");
    }
  }, [isTimeout]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedUser = await login(identifier, password, rememberMe);
      setSuccess("Đăng nhập thành công! Đang chuyển hướng...");
      const redirectTo =
        location.state?.from?.pathname ||
        (loggedUser?.role === "admin" ? "/admin/dashboard" : "/dashboard");
      setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 1500);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message =
        err?.response?.data?.message ||
        (err?.message === "Network Error"
          ? "Khong ket noi duoc backend. Kiem tra server backend va MongoDB."
          : err?.message || "Login failed");
      setError(detail ? `${message} (${detail})` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-split">
      <aside className="auth-hero">
        <p className="badge-soft">Hệ thống Y tế Thông minh</p>
        <h1>Chăm sóc sức khỏe toàn diện cho người dân Đà Nẵng.</h1>
        <p>
          Tiep can dich vu y te chat luong cao, quan ly ho so benh an dien tu va
          nhan tu van suc khoe tu AI moi luc moi noi.
        </p>

        <div className="hero-feature">
          <div className="hero-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4>Bao mat tuyet doi</h4>
            <p>Du lieu duoc ma hoa dau cuoi va tuan thu tieu chuan quoc te.</p>
          </div>
        </div>
        <div className="hero-feature">
          <div className="hero-icon">
            <Cloud size={18} />
          </div>
          <div>
            <h4>Lien thong du lieu</h4>
            <p>Ket noi ho so benh an giua cac benh vien lon tai Da Nang.</p>
          </div>
        </div>
      </aside>

      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Đăng nhập.</h2>


        <label>So dien thoai hoac Email</label>
        <div className="input-with-icon">
          <UserRound size={16} />
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Nhap so dien thoai hoac email"
          />
        </div>

        <label>Mat khau</label>
        <div className="input-with-icon">
          <Lock size={16} />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhap mat khau"
          />
        </div>

        <div className="remember-me-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Ghi nho dang nhap</span>
          </label>
          <Link to="/forgot-password" className="forgot-password-link">
            Quen mat khau?
          </Link>
        </div>

        {error && <p className="error-text">{error}</p>}
        {success && (
          <p className="success-text" style={{ color: "#22c55e", textAlign: "center", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <CheckCircle size={18} />
            {success}
          </p>
        )}

        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
          {loading ? "Dang xu ly..." : "Dang nhap he thong"}
        </button>

        <p className="auth-bottom-link">
          Chua co tai khoan? <Link to="/register">Dang ky ngay</Link>
        </p>
      </form>
    </section>
  );
};

export default LoginPage;
