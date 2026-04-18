import { useAuth } from "../context/AuthContext";

const TimeoutWarning = () => {
  const { showTimeoutWarning, extendSession, logout } = useAuth();

  if (!showTimeoutWarning) return null;

  return (
    <div className="modal-backdrop">
      <div className="timeout-warning-modal">
        <h3>Phiên đăng nhập sắp hết hạn</h3>
        <p>Bạn đã không có hoạt động gì trong 5 phút. Bạn sẽ được đăng xuất tự động.</p>
        <p className="muted">Nhấn "Tiếp tục" để giữ đăng nhập.</p>
        <div className="row gap-sm">
          <button type="button" className="btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
          <button type="button" className="btn-primary" onClick={extendSession}>
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeoutWarning;
