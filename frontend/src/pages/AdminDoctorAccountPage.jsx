import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Save, Trash2, UserCog } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

const makeTempPassword = () =>
  `Doc${Math.floor(1000 + Math.random() * 9000)}@${Math.floor(10 + Math.random() * 90)}`;

const AdminDoctorAccountPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    tempPassword: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/admin/doctors/${id}/account`);
        setPayload(data);
        setForm({
          username: data.account?.username || "",
          email: data.account?.email || "",
          phone: data.account?.phone || "",
          tempPassword: data.account?.tempPassword || "",
          isActive: data.account?.isActive ?? true,
        });
      } catch (err) {
        setError(err?.response?.data?.message || "Không tải được tài khoản bác sĩ.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updatedAt = useMemo(() => {
    const value = payload?.account?.updatedAt;
    if (!value) return "Chưa cập nhật";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
    return date.toLocaleString("vi-VN");
  }, [payload?.account?.updatedAt]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/doctors/${id}/account`, form);
      setPayload((prev) => ({
        ...prev,
        account: data.account,
      }));
      setNotice("Đã cập nhật tài khoản bác sĩ.");
    } catch (err) {
      setError(err?.response?.data?.message || "Không cập nhật được tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Ban co chac chan muon xoa tai khoan bac si nay? Tai khoan se bi vo hieu hoa.")) {
      return;
    }
    
    setDeleting(true);
    setError("");
    setNotice("");
    
    try {
      await api.delete(`/admin/doctors/${id}/account`);
      setNotice("Đã xóa tài khoản bác sĩ thành công.");
      setForm((prev) => ({
        ...prev,
        username: "",
        email: "",
        phone: "",
        tempPassword: "",
        isActive: false,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Không xóa được tài khoản.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="muted">Đang tải tài khoản bác sĩ...</p>;
  if (!payload) return <p className="muted">Không tìm thấy bác sĩ.</p>;

  return (
    <section className="stack-md">
      <div className="section-title-row">
        <div>
          <h1>Tài khoản bác sĩ.</h1>
          <p className="muted">Quản lý thông tin đăng nhập và trạng thái tài khoản.</p>
        </div>
        <Link to={`/admin/doctors/${id}`} className="btn-secondary">
          <ArrowLeft size={16} /> Quay lại hồ sơ
        </Link>
      </div>

      <div className="doctor-account-grid">
        <article className="doctor-profile-card">
          <div className="avatar-lg" style={{ background: payload.doctor.avatarColor || "#2b7edb" }}>
            {payload.doctor.avatarUrl ? (
              <img src={payload.doctor.avatarUrl} alt={payload.doctor.fullName} />
            ) : (
              payload.doctor.fullName
                .split(" ")
                .slice(-2)
                .map((item) => item[0])
                .join("")
            )}
          </div>
          <h2>{payload.doctor.fullName}</h2>
          <p className="muted">{payload.doctor.specialty}</p>
          <p className="muted">{payload.doctor.hospital}</p>
          <span className={`status ${form.isActive ? "status-confirmed" : "status-cancelled"}`}>
            {form.isActive ? "đang hoạt động" : "tạm khóa"}
          </span>
          <small className="muted">Cập nhật lần cuối: {updatedAt}</small>
        </article>

        <article className="detail-card">
          <h3>
            <UserCog size={18} /> Cấu hình tài khoản
          </h3>
          <form className="stack-sm" onSubmit={handleSave}>
            <label>
              Tên đăng nhập
              <input
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="vd: bs.dangvanhao"
              />
            </label>
            <label>
              Email
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="doctor@healthyai.vn"
              />
            </label>
            <label>
              Số điện thoại
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="090xxxxxxx"
              />
            </label>
            <label>
              Mật khẩu tạm thời
              <div className="row gap-sm">
                <input
                  value={form.tempPassword}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tempPassword: e.target.value }))
                  }
                  placeholder="Nhập mật khẩu tạm thời"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, tempPassword: makeTempPassword() }))
                  }
                >
                  <KeyRound size={14} /> Tạo nhanh
                </button>
              </div>
            </label>
            <label className="row gap-sm">
              <input
                type="checkbox"
                className="compact-checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Kích hoạt tài khoản bác sĩ
            </label>

            {error ? <p className="error-text">{error}</p> : null}
            {notice ? <p className="success-text">{notice}</p> : null}

            <div className="row gap-sm">
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? "Đang lưu..." : "Lưu tài khoản"}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 size={16} /> {deleting ? "Đang xóa..." : "Xóa tài khoản"}
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  );
};

export default AdminDoctorAccountPage;
