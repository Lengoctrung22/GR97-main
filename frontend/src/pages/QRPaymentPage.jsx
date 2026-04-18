import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const QRPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const bookingCode = searchParams.get("bookingCode");

  // Lấy thông tin thanh toán
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!bookingCode) {
        setError("Không tìm thấy mã đơn hàng");
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.post("/payment/create", {
          bookingCode,
          paymentMethod: "vnpay_qr"
        });
        setPaymentData(data);
      } catch (err) {
        console.error("Failed to create payment:", err);
        setError("Không thể tạo thanh toán. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentInfo();
  }, [bookingCode]);

  // Kiểm tra trạng thái thanh toán
  const checkPaymentStatus = async () => {
    if (!bookingCode) return;

    setCheckingStatus(true);
    try {
      const { data } = await api.get(`/payment/status/${bookingCode}`);
      
      if (data.paymentStatus === "paid") {
        // Thanh toán thành công, chuyển đến trang kết quả
        navigate(`/payment-result?success=true&bookingCode=${bookingCode}`);
      } else {
        alert("Chưa nhận được thanh toán. Vui lòng quét mã QR và thử lại.");
      }
    } catch (err) {
      console.error("Failed to check payment status:", err);
      alert("Không thể kiểm tra trạng thái thanh toán");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Mở trang thanh toán VNPAY
  const openVnpayGateway = () => {
    if (paymentData?.paymentUrl) {
      window.open(paymentData.paymentUrl, "_blank");
    }
  };

  // Format số tiền
  const formatAmount = (amount) => {
    if (!amount) return "0";
    return parseInt(amount).toLocaleString("vi-VN");
  };

  // Quay lại
  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="qr-payment-page">
        <div className="qr-payment-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Đang tạo mã QR thanh toán...</p>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-payment-page">
        <div className="qr-payment-container">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <h3>Có lỗi xảy ra</h3>
            <p>{error}</p>
            <button className="btn-back" onClick={handleBack}>
              Quay lại
            </button>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="qr-payment-page">
      <div className="qr-payment-container">
        {/* Header */}
        <div className="qr-payment-header">
          <button className="back-btn" onClick={handleBack}>
            ←
          </button>
          <div className="header-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="#2780de"/>
              <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="header-title">
            <h2>Thanh toán QR</h2>
            <span className="header-subtitle">Quét mã QR để thanh toán</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="qr-payment-info">
          <div className="info-row">
            <span className="info-label">Mã đơn hàng</span>
            <span className="info-value">{paymentData?.bookingCode || bookingCode}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Số tiền</span>
            <span className="info-value amount">
              {paymentData?.amount ? formatAmount(paymentData.amount) + " đ" : "---"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Trạng thái</span>
            <span className="info-value status pending">Chờ thanh toán</span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="qr-code-section">
          <h3>Quét mã QR bằng ứng dụng ngân hàng</h3>
          
          {paymentData?.qrImageUrl && (
            <div className="qr-code-container">
              <img 
                src={paymentData.qrImageUrl} 
                alt="VNPay QR Code" 
                className="qr-code-image"
              />
            </div>
          )}

          <div className="qr-instructions">
            <div className="instruction-item">
              <span className="instruction-number">1</span>
              <span>Mở ứng dụng ngân hàng trên điện thoại</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">2</span>
              <span>Chọn chức năng quét mã QR</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">3</span>
              <span>Quét mã QR bên trên</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-number">4</span>
              <span>Xác nhận thanh toán trong ứng dụng</span>
            </div>
          </div>

          <div className="qr-timer">
            <span className="timer-icon">⏱️</span>
            <span>Mã QR có hiệu lực trong 15 phút</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="qr-payment-actions">
          <button 
            className="btn-open-vnpay"
            onClick={openVnpayGateway}
            disabled={!paymentData?.paymentUrl}
          >
            Mở trang thanh toán VNPAY
          </button>
          
          <button 
            className="btn-check-status"
            onClick={checkPaymentStatus}
            disabled={checkingStatus}
          >
            {checkingStatus ? "Đang kiểm tra..." : "Kiểm tra trạng thái thanh toán"}
          </button>
        </div>

        {/* Footer */}
        <div className="qr-payment-footer">
          <span className="footer-icon">🔒</span>
          <span>Thanh toán an toàn qua VNPAY</span>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .qr-payment-page {
    min-height: 100vh;
    background: #f5f5f5;
    padding: 20px;
  }

  .qr-payment-container {
    max-width: 480px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .qr-payment-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
  }

  .back-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .back-btn:hover {
    background: #e5e5e5;
  }

  .header-logo {
    flex-shrink: 0;
  }

  .header-title h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .header-subtitle {
    font-size: 13px;
    color: #666;
  }

  .qr-payment-info {
    padding: 16px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #f0f0f0;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
  }

  .info-label {
    color: #666;
    font-size: 14px;
  }

  .info-value {
    font-weight: 500;
    color: #1a1a1a;
  }

  .info-value.amount {
    font-size: 20px;
    font-weight: 700;
    color: #0066cc;
  }

  .info-value.status {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .info-value.status.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .qr-code-section {
    padding: 24px 20px;
    text-align: center;
  }

  .qr-code-section h3 {
    margin: 0 0 20px;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .qr-code-container {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }

  .qr-code-image {
    width: 250px;
    height: 250px;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 10px;
    background: white;
  }

  .qr-instructions {
    text-align: left;
    margin-bottom: 20px;
  }

  .instruction-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .instruction-item:last-child {
    border-bottom: none;
  }

  .instruction-number {
    width: 28px;
    height: 28px;
    background: #2780de;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .instruction-item span:last-child {
    color: #333;
    font-size: 14px;
  }

  .qr-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: #fef3c7;
    border-radius: 8px;
    font-size: 13px;
    color: #92400e;
  }

  .timer-icon {
    font-size: 16px;
  }

  .qr-payment-actions {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .btn-open-vnpay {
    width: 100%;
    padding: 14px;
    background: #2780de;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-open-vnpay:hover:not(:disabled) {
    background: #1e6bc7;
  }

  .btn-open-vnpay:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .btn-check-status {
    width: 100%;
    padding: 14px;
    background: white;
    color: #2780de;
    border: 2px solid #2780de;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-check-status:hover:not(:disabled) {
    background: #f0f7ff;
  }

  .btn-check-status:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .qr-payment-footer {
    padding: 16px 20px;
    text-align: center;
    background: #f8f9fa;
    border-top: 1px solid #f0f0f0;
    font-size: 12px;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .footer-icon {
    font-size: 14px;
  }

  .loading-state,
  .error-state {
    padding: 60px 20px;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #2780de;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-state p {
    color: #666;
    font-size: 14px;
  }

  .error-state .error-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }

  .error-state h3 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #1a1a1a;
  }

  .error-state p {
    color: #666;
    margin-bottom: 20px;
  }

  .btn-back {
    padding: 12px 24px;
    background: #2780de;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-back:hover {
    background: #1e6bc7;
  }

  @media (max-width: 480px) {
    .qr-payment-page {
      padding: 10px;
    }

    .qr-code-image {
      width: 200px;
      height: 200px;
    }
  }
`;

export default QRPaymentPage;
