import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "../lib/api";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    if (!token || !email) {
      setIsValidToken(false);
      setError("Link đặt lại mật khẩu không hợp lệ.");
    }
  }, [token, email]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", { 
        token, 
        newPassword 
      });
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      const message = err?.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="auth-split">
        <aside className="auth-hero">
          <p className="badge-soft">Hệ thống Y tế Thông minh</p>
          <h1>Chăm sóc sức khỏe toàn diện cho người dân Đà Nẵng.</h1>
          <p>
            Tiep can dich vu y te chat luong cao, quan ly ho so benh an dien tu va
            nhan tu van suc khoe tu AI moi luc moi noi.
          </p>
        </aside>

        <div className="auth-card">
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#d4edda",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle size={40} color="#28a745" />
            </div>
            <h2 style={{ color: "#28a745", marginBottom: "15px" }}>
              Đặt lại mật khẩu thành công!
            </h2>
            <p className="muted" style={{ marginBottom: "20px" }}>
              Mật khẩu của bạn đã được đặt lại thành công.
            </p>
            <p className="muted" style={{ fontSize: "14px" }}>
              Bạn sẽ được chuyển hướng đến trang đăng nhập trong giây lát...
            </p>
          </div>

          <Link to="/login" className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <ArrowLeft size={16} />
            Đăng nhập ngay
          </Link>
        </div>
      </section>
    );
  }

  if (!isValidToken) {
    return (
      <section className="auth-split">
        <aside className="auth-hero">
          <p className="badge-soft">Hệ thống Y tế Thông minh</p>
          <h1>Chăm sóc sức khỏe toàn diện cho người dân Đà Nẵng.</h1>
          <p>
            Tiep can dich vu y te chat luong cao, quan ly ho so benh an dien tu va
            nhan tu van suc khoe tu AI moi luc moi noi.
          </p>
        </aside>

        <div className="auth-card">
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#f8d7da",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <AlertCircle size={40} color="#dc3545" />
            </div>
            <h2 style={{ color: "#dc3545", marginBottom: "15px" }}>
              Link không hợp lệ
            </h2>
            <p className="muted" style={{ marginBottom: "20px" }}>
              {error || "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."}
            </p>
          </div>

          <Link to="/forgot-password" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            Yêu cầu link mới
          </Link>
          
          <p className="auth-bottom-link" style={{ marginTop: "15px" }}>
            <Link to="/login">
              <ArrowLeft size={14} style={{ marginRight: "5px" }} />
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-split">
      <aside className="auth-hero">
        <p className="badge-soft">Hệ thống Y tế Thông minh</p>
        <h1>Chăm sóc sức khỏe toàn diện cho người dân Đà Nẵng.</h1>
        <p>
          Tiep can dich vu y te chat luong cao, quan ly ho so benh an dien tu va
          nhan tu van suc khoe tu AI moi luc moi noi.
        </p>
      </aside>

      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Đặt lại mật khẩu.</h2>
        <p className="muted">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>

        <label>Mật khẩu mới</label>
        <div className="input-with-icon">
          <Lock size={16} />
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
            minLength={6}
          />
        </div>

        <label>Xác nhận mật khẩu mới</label>
        <div className="input-with-icon">
          <Lock size={16} />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            minLength={6}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="btn-primary auth-submit"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>

        <p className="auth-bottom-link">
          <Link to="/login">
            <ArrowLeft size={14} style={{ marginRight: "5px" }} />
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </section>
  );
};

export default ResetPasswordPage;
