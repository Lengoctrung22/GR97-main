import { Bell, Building2, Lock, ShieldCheck } from "lucide-react";

const AdminSettingsPage = () => {
  return (
    <section className="stack-md">
      <div>
        <h1>Cài đặt hệ thống.</h1>
        <p className="muted">
          Quản lý thương hiệu, bảo mật, thông báo và chính sách liên thông dữ liệu.
        </p>
      </div>

      <div className="admin-settings-grid">
        <article className="admin-settings-card">
          <h3>
            <Building2 size={18} /> Thương hiệu
          </h3>
          <div className="stack-sm">
            <label>Tên hệ thống</label>
            <input defaultValue="HealthAI Da Nang" />
            <label>Domain chính</label>
            <input defaultValue="portal.healthai.vn" />
            <label>Email hỗ trợ</label>
            <input defaultValue="support@healthai.vn" />
          </div>
          <button type="button" className="btn-primary">
            Lưu thông tin thương hiệu
          </button>
        </article>

        <article className="admin-settings-card">
          <h3>
            <Bell size={18} /> Thông báo hệ thống
          </h3>
          <div className="toggle-list">
            <label>
              <input type="checkbox" defaultChecked /> Gửi email khi có lịch hẹn mới
            </label>
            <label>
              <input type="checkbox" defaultChecked /> Gửi SMS nhắc lịch trước 2 giờ
            </label>
            <label>
              <input type="checkbox" defaultChecked /> Cảnh báo khi hệ thống mất kết nối
            </label>
            <label>
              <input type="checkbox" /> Báo cáo tổng hợp cuối ngày
            </label>
          </div>
          <button type="button" className="btn-secondary">
            Cập nhật thông báo
          </button>
        </article>

        <article className="admin-settings-card">
          <h3>
            <Lock size={18} /> Bảo mật truy cập
          </h3>
          <div className="stack-sm">
            <label>Session timeout (phút)</label>
            <input type="number" defaultValue={30} />
            <label>Số lần đăng nhập sai tối đa</label>
            <input type="number" defaultValue={5} />
            <label>Bắt buộc 2FA cho tài khoản admin</label>
            <select defaultValue="enabled">
              <option value="enabled">Bắt buộc</option>
              <option value="optional">Khuyến nghị</option>
              <option value="disabled">Tắt</option>
            </select>
          </div>
          <button type="button" className="btn-secondary">
            Lưu chính sách bảo mật
          </button>
        </article>

        <article className="admin-settings-card">
          <h3>
            <ShieldCheck size={18} /> Quyền riêng tư và liên thông
          </h3>
          <div className="toggle-list">
            <label>
              <input type="checkbox" defaultChecked /> Cho phép đồng bộ hồ sơ giữa bệnh viện
            </label>
            <label>
              <input type="checkbox" defaultChecked /> Ghi log truy cập dữ liệu nhạy cảm
            </label>
            <label>
              <input type="checkbox" defaultChecked /> Mã hóa dữ liệu tài liệu y tế
            </label>
          </div>
          <button type="button" className="btn-primary">
            Lưu cài đặt quyền riêng tư
          </button>
        </article>
      </div>
    </section>
  );
};

export default AdminSettingsPage;
