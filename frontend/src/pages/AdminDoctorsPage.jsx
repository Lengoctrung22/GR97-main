import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Trash2 } from "lucide-react";
import { api } from "../lib/api";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const initialForm = {
  fullName: "",
  title: "",
  specialty: "",
  hospital: "",
  experienceYears: "5",
  rating: "4.7",
  bio: "",
  avatarUrl: "",
  avatarColor: "#2b7edb",
  timeSlots: "08:00, 09:30, 14:00",
  accountUsername: "",
  accountEmail: "",
  accountPhone: "",
  accountPassword: "",
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });

const AdminDoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/doctors");
      setDoctors(data.doctors || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const submitCreateDoctor = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        fullName: form.fullName.trim(),
        title: form.title.trim(),
        specialty: form.specialty.trim(),
        hospital: form.hospital.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        rating: Number(form.rating) || 4.7,
        bio: form.bio.trim(),
        avatarColor: form.avatarColor.trim() || "#2b7edb",
        avatarUrl: form.avatarUrl.trim(),
        timeSlots: form.timeSlots
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        account: {
          username: form.accountUsername.trim(),
          email: form.accountEmail.trim(),
          phone: form.accountPhone.trim(),
          tempPassword: form.accountPassword.trim(),
          isActive: true,
        },
      };

      await api.post("/admin/doctors", payload);
      setForm(initialForm);
      setShowCreateModal(false);
      setNotice("Đã thêm bác sĩ mới.");
      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể thêm bác sĩ.");
    } finally {
      setCreating(false);
    }
  };

  const handleAvatarFromDevice = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setNotice("");

    if (!file.type.startsWith("image/")) {
      setError("File không hợp lệ. Vui lòng chọn file ảnh.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError("Ảnh quá lớn. Vui lòng chọn ảnh <= 2MB.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
      setNotice("Đã tải ảnh từ máy tính.");
    } catch (err) {
      setError(err?.message || "Không tải được ảnh.");
    }
  };

  const handleDeleteDoctor = async (doctorId, doctorName) => {
    if (!window.confirm(`Ban co chac chan muon xoa bac si "${doctorName}"? Hanh dong nay se xoa ca lich hen cua bac si.`)) {
      return;
    }
    
    setDeletingId(doctorId);
    setError("");
    setNotice("");
    
    try {
      await api.delete(`/admin/doctors/${doctorId}`);
      setNotice("Đã xóa bác sĩ thành công.");
      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Không xóa được bác sĩ.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="stack-md">
      <div className="section-title-row">
        <div>
          <h1>Quản lý Bác sĩ.</h1>
          <p className="muted">Danh sách bác sĩ, hồ sơ chi tiết và thêm bác sĩ tùy chỉnh.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <PlusCircle size={16} /> Thêm bác sĩ
        </button>
      </div>

      {notice ? <p className="success-text">{notice}</p> : null}

      <div className="doctor-admin-grid">
        {loading ? <p className="muted">Đang tải danh sách bác sĩ...</p> : null}
        {doctors.map((doctor) => (
          <article key={doctor._id} className="doctor-admin-card">
            <div className="doctor-row">
              <div
                className="avatar-circle"
                style={{ background: doctor.avatarColor || "#2b7edb" }}
              >
                {doctor.avatarUrl ? (
                  <img src={doctor.avatarUrl} alt={doctor.fullName} />
                ) : (
                  doctor.fullName
                    .split(" ")
                    .slice(-2)
                    .map((v) => v[0])
                    .join("")
                )}
              </div>
              <div>
                <h3>{doctor.fullName}</h3>
                <p className="muted">{doctor.specialty}</p>
              </div>
            </div>
            <p className="muted">{doctor.hospital}</p>
            <div className="row gap-sm">
              <span className="tag">{doctor.experienceYears} năm KN</span>
              <span className="tag">{doctor.rating} sao</span>
            </div>
            <div className="row gap-sm">
              <Link to={`/admin/doctors/${doctor._id}`} className="btn-primary w-full">
                Hồ sơ
              </Link>
              <Link to={`/admin/doctors/${doctor._id}/account`} className="btn-secondary w-full">
                Tài khoản
              </Link>
              <button
                type="button"
                className="btn-danger w-full"
                onClick={() => handleDeleteDoctor(doctor._id, doctor.fullName)}
                disabled={deletingId === doctor._id}
              >
                <Trash2 size={14} /> {deletingId === doctor._id ? "..." : "Xóa"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {showCreateModal ? (
        <div className="modal-backdrop">
          <div className="admin-form-modal">
            <div className="section-title-row">
              <h3>Thêm bác sĩ mới</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Đóng
              </button>
            </div>
            <form className="admin-form-grid" onSubmit={submitCreateDoctor}>
              <label>
                Họ và tên
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </label>
              <label>
                Học hàm/Học vị
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label>
                Chuyên khoa
                <input
                  required
                  value={form.specialty}
                  onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
                />
              </label>
              <label>
                Bệnh viện
                <input
                  required
                  value={form.hospital}
                  onChange={(e) => setForm((prev) => ({ ...prev, hospital: e.target.value }))}
                />
              </label>
              <label>
                Năm kinh nghiệm
                <input
                  type="number"
                  min="0"
                  value={form.experienceYears}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, experienceYears: e.target.value }))
                  }
                />
              </label>
              <label>
                Đánh giá
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
                />
              </label>
              <label className="full">
                Ảnh đại diện (URL)
                <input
                  value={form.avatarUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                />
              </label>
              <label className="full">
                Tải ảnh từ máy tính
                <input type="file" accept="image/*" onChange={handleAvatarFromDevice} />
              </label>
              {form.avatarUrl ? (
                <div className="full avatar-preview-box">
                  <img src={form.avatarUrl} alt="Doctor avatar preview" />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setForm((prev) => ({ ...prev, avatarUrl: "" }))}
                  >
                    Xóa ảnh
                  </button>
                </div>
              ) : null}
              <label>
                Màu avatar
                <input
                  value={form.avatarColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, avatarColor: e.target.value }))}
                />
              </label>
              <label className="full">
                Khung giờ (cách nhau dấu phẩy)
                <input
                  value={form.timeSlots}
                  onChange={(e) => setForm((prev) => ({ ...prev, timeSlots: e.target.value }))}
                />
              </label>
              <label className="full">
                Giới thiệu
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                />
              </label>
              <h4 className="full">Tài khoản bác sĩ</h4>
              <label>
                Username
                <input
                  value={form.accountUsername}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountUsername: e.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.accountEmail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountEmail: e.target.value }))
                  }
                />
              </label>
              <label>
                Số điện thoại
                <input
                  value={form.accountPhone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountPhone: e.target.value }))
                  }
                />
              </label>
              <label>
                Mật khẩu tạm
                <input
                  value={form.accountPassword}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountPassword: e.target.value }))
                  }
                />
              </label>

              {error ? <p className="error-text full">{error}</p> : null}
              <div className="row gap-sm full">
                <button type="button" className="btn-secondary w-full" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary w-full" disabled={creating}>
                  {creating ? "Đang tạo..." : "Tạo bác sĩ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default AdminDoctorsPage;
