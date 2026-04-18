import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Fingerprint, IdCard, Phone, UserRound, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    birthDate: "",
    citizenId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!/^\d{8,15}$/.test(form.phone.trim())) {
        throw new Error("So dien thoai khong hop le (8-15 so).");
      }
      if (form.password && form.password.length < 6) {
        throw new Error("Mat khau phai tu 6 ky tu neu ban tu dat.");
      }

      const payload = { ...form };
      if (!payload.email?.trim()) delete payload.email;
      if (!payload.password?.trim()) delete payload.password;
      if (!payload.birthDate?.trim()) delete payload.birthDate;
      if (!payload.citizenId?.trim()) delete payload.citizenId;

      const result = await register(payload);
      if (result?.generatedPassword) {
        setSuccess(`Đăng ký tài khoản thành công! Mật khẩu tạm thời: ${result.generatedPassword}`);
      } else {
        setSuccess("Đăng ký tài khoản thành công!");
      }
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message =
        err?.response?.data?.message ||
        (err?.message === "Network Error"
          ? "Khong ket noi duoc backend. Kiem tra server backend va MongoDB."
          : err?.message || "Registration failed");
      setError(detail ? `${message} (${detail})` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="register-shell">
      <form className="register-card" onSubmit={onSubmit}>
        <h2>Đăng ký thành viên.</h2>
        <p className="muted">
          Gia nhap cong dong suc khoe thong minh tai Da Nang de nhan duoc su cham
          soc tot nhat.
        </p>


        <label>Ho va ten</label>
        <div className="input-with-icon">
          <UserRound size={16} />
          <input
            required
            value={form.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="Nguyen Van A"
          />
        </div>

        <label>Ngay sinh</label>
        <div className="input-with-icon">
          <Calendar size={16} />
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => onChange("birthDate", e.target.value)}
          />
        </div>

        <label>So dinh danh (CCCD/VNeID)</label>
        <div className="input-with-icon">
          <IdCard size={16} />
          <input
            value={form.citizenId}
            onChange={(e) => onChange("citizenId", e.target.value)}
            placeholder="048xxxxxxxxx"
          />
        </div>

        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="Tuy chon (you@example.com)"
        />

        <label>Mat khau (tuy chon)</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => onChange("password", e.target.value)}
          placeholder="Bo trong de tao mat khau tam thoi"
        />

        <label>So dien thoai</label>
        <div className="input-with-icon">
          <Phone size={16} />
          <input
            required
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="0901234567"
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {success && (
          <p className="success-text" style={{ color: "#22c55e", textAlign: "center", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <CheckCircle size={18} />
            {success}
          </p>
        )}

        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
          {loading ? "Dang xu ly..." : "Tiep tuc"} <ArrowRight size={16} />
        </button>

        <p className="register-note">
          Bang cach dang ky, ban dong y voi <Link to="#">Dieu khoan dich vu</Link> va{" "}
          <Link to="#">Chinh sach bao mat</Link> cua HealthAI Da Nang.
        </p>
      </form>
    </section>
  );
};

export default RegisterPage;
