import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "../lib/api";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
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
            Tiếp cận dịch vụ y tế chất lượng cao, quản lý hồ sơ bệnh án điện tử và
            nhận tư vấn sức khỏe từ AI mọi lúc mọi nơi.
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
              Kiểm tra email của bạn!
            </h2>
            <p className="muted" style={{ marginBottom: "20px" }}>
              Chúng tôi đã gửi link đặt lại mật khẩu đến email{" "}
              <strong>{email}</strong>
            </p>
            <p className="muted" style={{ fontSize: "14px" }}>
              Vui lòng kiểm tra hộp thư (bao gồm cả thư rác) và click vào link
              để đặt lại mật khẩu.
            </p>
            <p className="muted" style={{ fontSize: "14px", marginTop: "15px" }}>
              Link sẽ hết hạn sau 1 giờ.
            </p>
          </div>

          <Link to="/login" className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>
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
          Tiếp cận dịch vụ y tế chất lượng cao, quản lý hồ sơ bệnh án điện tử và 
          nhận tư vấn sức khỏe từ AI mọi lúc mọi nơi.
        </p>
      </aside>

      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Quên mật khẩu.</h2>
        <p className="muted">
          Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu
          cho bạn.
        </p>

        <label>Email</label>
        <div className="input-with-icon">
          <Mail size={16} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập địa chỉ email"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="btn-primary auth-submit"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Gửi link đặt lại mật khẩu"}
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

export default ForgotPasswordPage;
