import { useEffect, useState } from "react";
import { Download, CalendarPlus, Pencil, PauseCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

const dayLabels = {
  mon: "Thu 2",
  tue: "Thu 3",
  wed: "Thu 4",
  thu: "Thu 5",
  fri: "Thu 6",
  sat: "Thu 7",
};

const AdminDoctorDetailPage = () => {
  const { id } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/doctors/${id}`);
        setPayload(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <p className="muted">Đang tải thông tin bác sĩ...</p>;
  if (!payload) return <p className="muted">Không tìm thấy bác sĩ.</p>;

  const { doctor, metrics, weeklySchedule, reviews } = payload;

  return (
    <section className="doctor-detail-layout">
      <div className="section-title-row">
        <h1>Quản lý Chi tiết Bác sĩ.</h1>
        <div className="row gap-sm">
          <button type="button" className="btn-secondary">
            <Download size={16} /> Xuất báo cáo
          </button>
          <button type="button" className="btn-primary">
            <CalendarPlus size={16} /> Thêm lịch hẹn mới
          </button>
        </div>
      </div>

      <div className="doctor-detail-grid">
        <aside className="doctor-profile-card">
          <div className="avatar-lg" style={{ background: doctor.avatarColor || "#2b7edb" }}>
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
          <h2>{doctor.fullName}</h2>
          <p className="text-link">{doctor.specialty}</p>
          <span className="status status-confirmed">Hoạt động</span>
          <Link to={`/admin/doctors/${id}/account`} className="btn-primary w-full">
            <Pencil size={16} /> Tài khoản bác sĩ
          </Link>
          <button type="button" className="btn-secondary w-full">
            <PauseCircle size={16} /> Tạm dừng
          </button>
        </aside>

        <div className="stack-md">
          <article className="detail-card">
            <h3>Thông tin cá nhân</h3>
            <div className="doctor-info-grid">
              <div>
                <small>Ho va ten</small>
                <p>{doctor.fullName}</p>
              </div>
              <div>
                <small>Học hàm/Học vị</small>
                <p>{doctor.title}</p>
              </div>
              <div>
                <small>Kinh nghiệm</small>
                <p>{doctor.experienceYears} năm</p>
              </div>
              <div>
                <small>Bệnh viện công tác</small>
                <p>{doctor.hospital}</p>
              </div>
            </div>
            <p>{doctor.bio}</p>
          </article>

          <article className="detail-card">
            <div className="section-title-row">
              <h3>Lịch trực tuần này</h3>
              <div className="row gap-sm">
                <button type="button" className="icon-btn schedule-nav-btn">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" className="icon-btn schedule-nav-btn">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="doctor-shift-grid">
              {Object.entries(weeklySchedule).map(([key, values]) => (
                <div key={key} className="doctor-shift-col">
                  <small>{dayLabels[key]}</small>
                  <div className="doctor-shift-list">
                    {values.map((slot) => (
                      <span
                        key={`${key}_${slot}`}
                        className={`shift-badge${slot === "Trong" || slot === "Nghi" ? " off" : ""}`}
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="detail-card">
            <h3>Đánh giá từ bệnh nhân</h3>
            <div className="stack-sm">
              {reviews.map((review) => (
                <div key={`${review.name}_${review.ago}`} className="review-item">
                  <div className="row space-between">
                    <strong>{review.name}</strong>
                    <small>{review.ago}</small>
                  </div>
                  <p>{"*".repeat(review.stars)}</p>
                  <p className="muted">{review.content}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="stack-sm">
          <article className="mini-stat">
            <p>Tài khoản đăng nhập</p>
            <h3>{doctor.account?.username || "Chua tao"}</h3>
          </article>
          <article className="mini-stat">
            <p>Tổng số lịch hẹn</p>
            <h3>{metrics.totalAppointments}</h3>
          </article>
          <article className="mini-stat">
            <p>Đánh giá trung bình</p>
            <h3>{metrics.rating}/5</h3>
          </article>
          <article className="mini-stat">
            <p>Tỷ lệ hoàn thành</p>
            <h3>{metrics.completionRate}%</h3>
          </article>
        </aside>
      </div>
    </section>
  );
};

export default AdminDoctorDetailPage;
