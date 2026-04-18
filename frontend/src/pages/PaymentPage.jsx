import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// Danh sách ngân hàng với màu sắc theo hình mẫu
const BANKS = [
  { id: "vietcombank", name: "Vietcombank", code: "VCB", color: "#2780DE" },
  { id: "vietinbank", name: "Vietinbank", code: "CTG", color: "#00A0E9" },
  { id: "bidv", name: "BIDV", code: "BIDV", color: "#F37021" },
  { id: "agribank", name: "Agribank", code: "AGB", color: "#009847" },
  { id: "mbbank", name: "MB Bank", code: "MB", color: "#E3001B" },
  { id: "tpbank", name: "TPBank", code: "TPB", color: "#00A8CC" },
  { id: "acb", name: "ACB", code: "ACB", color: "#F37021" },
  { id: "sacombank", name: "Sacombank", code: "SCB", color: "#F5A623" },
  { id: "techcombank", name: "Techcombank", code: "TCB", color: "#E3001B" },
  { id: "vpbank", name: "VPBank", code: "VPB", color: "#009847" },
  { id: "hdbank", name: "HD Bank", code: "HDB", color: "#00AAFF" },
  { id: "shinhanbank", name: "Shinhan Bank", code: "SHB", color: "#003399" },
  { id: "ucbvnd", name: "UCB", code: "UCB", color: "#0066CC" },
  { id: "vietcapital", name: "Viet Capital", code: "BVB", color: "#F37021" },
  { id: "pvcombank", name: "PVcombank", code: "PVC", color: "#009847" },
  { id: "oceanbank", name: "Oceanbank", code: "OceanBank", color: "#0066CC" },
  { id: "gpbank", name: "GPBank", code: "GPB", color: "#F37021" },
  { id: "vnpay", name: "VNPay", code: "VNP", color: "#2780DE" },
];

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);

  const bookingCode = searchParams.get("bookingCode");

  // Lấy thông tin booking
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingCode) return;
      try {
        const { data } = await api.get(`/payment/info/${bookingCode}`);
        setBooking(data);
      } catch (error) {
        console.error("Failed to fetch booking:", error);
      }
    };
    fetchBooking();
  }, [bookingCode]);

  // Xử lý khi chọn ngân hàng
  const handleSelectBank = async (bank) => {
    if (!bookingCode) {
      alert("Không tìm thấy mã đơn hàng");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/payment/create", {
        bookingCode,
        bankCode: bank.code,
        paymentMethod: "bank_transfer"
      });
      
      // Mở cổng thanh toán trong tab mới
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
      } else {
        alert("Không thể tạo liên kết thanh toán");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thanh toán QR
  const handleQRPayment = () => {
    if (!bookingCode) {
      alert("Không tìm thấy mã đơn hàng");
      return;
    }
    navigate(`/payment/checkout?bookingCode=${bookingCode}`);
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

  return (
    <div className="payment-page">
      <div className="payment-page-container">
        {/* Header */}
        <div className="payment-page-header">
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
            <h2>Cổng thanh toán</h2>
            <span className="header-subtitle">Thanh toán an toàn qua VNPay</span>
          </div>
        </div>

        {/* Order Info */}
        <div className="payment-page-order">
          <div className="order-info">
            <div className="order-row">
              <span className="order-label">Mã đơn hàng</span>
              <span className="order-value">{bookingCode || "---"}</span>
            </div>
            <div className="order-row">
              <span className="order-label">Số tiền</span>
              <span className="order-value amount">{booking?.amount ? formatAmount(booking.amount) + " đ" : "---"}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-page-methods">
          <h3>Chọn phương thức thanh toán</h3>
          
          {/* QR Code Option */}
          <div className="method-option" onClick={handleQRPayment}>
            <div className="method-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="10" height="10" fill="#1a1a1a"/>
                <rect x="18" y="4" width="10" height="10" fill="#1a1a1a"/>
                <rect x="4" y="18" width="10" height="10" fill="#1a1a1a"/>
                <rect x="8" y="8" width="4" height="4" fill="white"/>
                <rect x="22" y="8" width="4" height="4" fill="white"/>
                <rect x="8" y="22" width="4" height="4" fill="white"/>
                <rect x="18" y="18" width="4" height="4" fill="#1a1a1a"/>
                <rect x="22" y="22" width="4" height="4" fill="#1a1a1a"/>
              </svg>
            </div>
            <div className="method-info">
              <span className="method-name">Quét mã QR</span>
              <span className="method-desc">Quét mã QR bằng ứng dụng ngân hàng</span>
            </div>
            <div className="method-arrow">›</div>
          </div>

          {/* Bank Transfer */}
          <div className="bank-list-section">
            <h4>Chuyển khoản ngân hàng</h4>
            <div className="bank-grid">
              {BANKS.map((bank) => (
                <button
                  key={bank.id}
                  className="bank-item"
                  onClick={() => handleSelectBank(bank)}
                  disabled={loading}
                >
                  <div 
                    className="bank-logo"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.code}
                  </div>
                  <span className="bank-name">{bank.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="payment-page-footer">
          <span>🔒 Thanh toán an toàn</span>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Đang xử lý...</p>
        </div>
      )}

      <style>{`
        .payment-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }

        .payment-page-container {
          max-width: 480px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .payment-page-header {
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

        .payment-page-order {
          padding: 16px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #f0f0f0;
        }

        .order-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }

        .order-label {
          color: #666;
          font-size: 14px;
        }

        .order-value {
          font-weight: 500;
          color: #1a1a1a;
        }

        .order-value.amount {
          font-size: 20px;
          font-weight: 700;
          color: #0066cc;
        }

        .payment-page-methods {
          padding: 20px;
        }

        .payment-page-methods h3 {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .method-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 20px;
        }

        .method-option:hover {
          background: #f0f0f0;
        }

        .method-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .method-info {
          flex: 1;
        }

        .method-name {
          display: block;
          font-weight: 500;
          color: #1a1a1a;
        }

        .method-desc {
          font-size: 12px;
          color: #666;
        }

        .method-arrow {
          font-size: 24px;
          color: #999;
        }

        .bank-list-section h4 {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .bank-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .bank-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bank-item:hover {
          border-color: #2780de;
          background: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .bank-item:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .bank-item:active {
          transform: translateY(0);
        }

        .bank-logo {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 13px;
        }

        .bank-name {
          font-size: 10px;
          color: #333;
          text-align: center;
          line-height: 1.2;
        }

        .payment-page-footer {
          padding: 16px 20px;
          text-align: center;
          background: #f8f9fa;
          border-top: 1px solid #f0f0f0;
          font-size: 12px;
          color: #666;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2780de;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-overlay p {
          color: white;
          margin-top: 16px;
          font-size: 14px;
        }

        @media (max-width: 400px) {
          .bank-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentPage;
