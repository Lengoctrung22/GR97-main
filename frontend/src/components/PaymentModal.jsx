import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

// Thông tin ngân hàng với số tài khoản
const BANKS = [
  { id: "vietcombank", name: "Vietcombank", code: "VCB", logo: "🏦", stk: "1014567891", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "vietinbank", name: "Vietinbank", code: "CTG", logo: "🏦", stk: "1000123456789", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "bidv", name: "BIDV", code: "BIDV", logo: "🏦", stk: "12010000999999", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "agribank", name: "Agribank", code: "AGB", logo: "🏦", stk: "1604200018888", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "mbbank", name: "MB Bank", code: "MB", logo: "🏦", stk: "7901010101010", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "tpbank", name: "TPBank", code: "TPB", logo: "🏦", stk: "000201001555", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "acb", name: "ACB", code: "ACB", logo: "🏦", stk: "12345678910", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "sacombank", name: "Sacombank", code: "SCB", logo: "🏦", stk: "060012345678", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "techcombank", name: "Techcombank", code: "TCB", logo: "🏦", stk: "19031234567890", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "vpbank", name: "VPBank", code: "VPB", logo: "🏦", stk: "100123456789", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "hdbank", name: "HD Bank", code: "HDB", logo: "🏦", stk: "201010101010", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "shinhanbank", name: "Shinhan Bank", code: "SHB", logo: "🏦", stk: "1000123456789", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "ucbvnd", name: "UCB VND", code: "UCB", logo: "🏦", stk: "500123456789", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "vietcapital", name: "Viet Capital Bank", code: "BVB", logo: "🏦", stk: "1001234567890", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "pvcombank", name: "PVcombank", code: "PVC", logo: "🏦", stk: "1001234567890", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "oceanbank", name: "Oceanbank", code: "OceanBank", logo: "🏦", stk: "1000123456789", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "gpbank", name: "GPBank", code: "GPB", logo: "🏦", stk: "100123456789", chutaikhoan: "HEALTHY AI CLINIC" },
  { id: "vnpay", name: "VNPay Wallet", code: "VNP", logo: "📱", stk: "19010101010101", chutaikhoan: "HEALTHY AI CLINIC" },
];

const PAYMENT_METHODS = [
  { 
    id: "vnpay_qr", 
    name: "Quét mã QR VNPay", 
    icon: "📱",
    description: "Quét mã QR bằng ứng dụng VNPay"
  },
  { 
    id: "bank_transfer", 
    name: "Chuyển khoản ngân hàng", 
    icon: "🏦",
    description: "Chuyển khoản qua ATM/Internet Banking"
  },
  { 
    id: "atm_card", 
    name: "Thẻ ATM nội địa", 
    icon: "💳",
    description: "Thanh toán bằng thẻ ATM"
  },
];

const PaymentModal = ({ booking, onClose, onConfirm, loading }) => {
  const [selectedMethod, setSelectedMethod] = useState("vnpay_qr");
  const [selectedBank, setSelectedBank] = useState(null);
  const [showBankList, setShowBankList] = useState(false);
  const navigate = useNavigate();

  if (!booking) return null;

  const { payment, appointment } = booking;

  const handlePayment = () => {
    onConfirm();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép!");
  };

  // Mở cổng thanh toán - chuyển đến trang thanh toán
  const handleOpenGateway = () => {
    onClose();
    if (selectedMethod === "vnpay_qr") {
      navigate(`/payment/checkout?bookingCode=${payment.bookingCode}`);
    } else {
      navigate(`/payment-page?bookingCode=${payment.bookingCode}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="payment-modal-v2" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-header-v2">
          <div className="payment-logo-v2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="#2780de"/>
              <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="payment-title-v2">
            <h3>Thanh toán đặt lịch</h3>
            <span className="payment-code-v2">Mã đơn: {payment.bookingCode}</span>
          </div>
          <button className="payment-close-v2" onClick={onClose}>✕</button>
        </div>

        {/* Payment Amount */}
        <div className="payment-amount-v2">
          <span className="amount-label">Số tiền cần thanh toán</span>
          <span className="amount-value">{payment.amount.toLocaleString("vi-VN")} VND</span>
        </div>

        {/* Appointment Info */}
        <div className="payment-info-v2">
          <div className="info-row-v2">
            <span className="info-label">Bác sĩ</span>
            <span className="info-value">{appointment.doctorName}</span>
          </div>
          <div className="info-row-v2">
            <span className="info-label">Thời gian</span>
            <span className="info-value">{appointment.slotLabel} - {dayjs(appointment.appointmentAt).format("DD/MM/YYYY")}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-methods-v2">
          <h4>Chọn phương thức thanh toán</h4>
          <div className="method-grid-v2">
            {PAYMENT_METHODS.map((method) => (
              <div
                key={method.id}
                className={`method-card-v2 ${selectedMethod === method.id ? "active" : ""}`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <span className="method-icon-v2">{method.icon}</span>
                <div className="method-info-v2">
                  <span className="method-name-v2">{method.name}</span>
                  <span className="method-desc-v2">{method.description}</span>
                </div>
                <div className="method-check-v2">
                  {selectedMethod === method.id && "✓"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Selection (for bank transfer) */}
        {selectedMethod === "bank_transfer" && (
          <div className="bank-selection-v2">
            <h4>Chọn ngân hàng</h4>
            <div 
              className="bank-selected-v2"
              onClick={() => setShowBankList(!showBankList)}
            >
              {selectedBank ? (
                <>
                  <span className="bank-logo-v2">{selectedBank.logo}</span>
                  <span>{selectedBank.name}</span>
                </>
              ) : (
                <span className="muted">-- Chọn ngân hàng --</span>
              )}
              <span className="bank-arrow-v2">{showBankList ? "▲" : "▼"}</span>
            </div>
            {showBankList && (
              <div className="bank-list-v2">
                {BANKS.filter(b => b.id !== "vnpay").map((bank) => (
                  <div
                    key={bank.id}
                    className={`bank-item-v2 ${selectedBank?.id === bank.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBank(bank);
                      setShowBankList(false);
                    }}
                  >
                    <span className="bank-logo-v2">{bank.logo}</span>
                    <span>{bank.name}</span>
                    <span className="bank-code-v2">{bank.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

         {/* QR Code Display */}
         {selectedMethod === "vnpay_qr" && payment.qrImageUrl && (
           <div className="qr-section-v2">
             <div className="qr-container-v2">
               <img 
                 src={payment.qrImageUrl} 
                 alt="VNPay QR Code" 
                 className="qr-image-v2"
                 onError={(e) => {
                   console.error('Lỗi tải QR code:', e);
                 }}
               />
             </div>
             <p className="qr-instruction-v2">
               Mở ứng dụng VNPay, quét mã QR bên trên để thanh toán
             </p>
             <div className="qr-tips-v2">
               <p className="tip-item-v2">💡 Đảm bảo quét rõ cả khuôn mã QR, không bị che khuất</p>
               <p className="tip-item-v2">💡 Nếu quét không được,Try zoom in/out hoặc làm sạch lens camera</p>
               <p className="tip-item-v2">💡 Đảm bảo ánh sáng đủ, không sử dụng flash trực tiếp vào QR</p>
               <p className="tip-item-v2">💡 Mã QR có hiệu lực trong 15 phút</p>
             </div>
             <div className="qr-timer-v2">
               <span className="timer-icon">⏱️</span>
               <span>Mã QR có hiệu lực trong 15 phút</span>
             </div>
           </div>
         )}
         {selectedMethod === "vnpay_qr" && !payment.qrImageUrl && (
           <div className="qr-section-v2">
             <div className="qr-loading-v2">
               <div className="qr-spinner-v2"></div>
               <p>Đang tải mã QR thanh toán...</p>
             </div>
           </div>
         )}

        {/* Bank Transfer Info */}
        {selectedMethod === "bank_transfer" && (
          <div className="transfer-info-v2">
            <div className="transfer-header-v2">
              <span className="transfer-icon-v2">🏦</span>
              <span>Thông tin chuyển khoản</span>
            </div>
            <div className="transfer-details-v2">
              <div className="transfer-row-v2">
                <span className="transfer-label-v2">Ngân hàng</span>
                <span className="transfer-value-v2">
                  {selectedBank ? selectedBank.name : "Vietcombank"}
                  <button 
                    className="copy-btn-v2" 
                    onClick={() => copyToClipboard(selectedBank ? selectedBank.name : "Vietcombank")}
                  >
                    📋
                  </button>
                </span>
              </div>
              <div className="transfer-row-v2">
                <span className="transfer-label-v2">Số tài khoản</span>
                <span className="transfer-value-v2">
                  {selectedBank ? selectedBank.stk : "1014567891"}
                  <button className="copy-btn-v2" onClick={() => copyToClipboard(selectedBank ? selectedBank.stk : "1014567891")}>📋</button>
                </span>
              </div>
              <div className="transfer-row-v2">
                <span className="transfer-label-v2">Chủ tài khoản</span>
                <span className="transfer-value-v2">
                  {selectedBank ? selectedBank.chutaikhoan : "HEALTHY AI CLINIC"}
                  <button className="copy-btn-v2" onClick={() => copyToClipboard(selectedBank ? selectedBank.chutaikhoan : "HEALTHY AI CLINIC")}>📋</button>
                </span>
              </div>
              <div className="transfer-row-v2">
                <span className="transfer-label-v2">Nội dung CK</span>
                <span className="transfer-value-v2 highlight-v2">
                  {payment.bookingCode}
                  <button className="copy-btn-v2" onClick={() => copyToClipboard(payment.bookingCode)}>📋</button>
                </span>
              </div>
              <div className="transfer-row-v2">
                <span className="transfer-label-v2">Số tiền</span>
                <span className="transfer-value-v2 amount-v2">
                  {payment.amount.toLocaleString("vi-VN")} VND
                  <button className="copy-btn-v2" onClick={() => copyToClipboard(payment.amount.toString())}>📋</button>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ATM Card Info */}
        {selectedMethod === "atm_card" && (
          <div className="atm-info-v2">
            <div className="atm-header-v2">
              <span className="atm-icon-v2">💳</span>
              <span>Thanh toán bằng thẻ ATM</span>
            </div>
            <p className="atm-desc-v2">
              Bạn sẽ được chuyển đến cổng thanh toán VNPay để nhập thông tin thẻ ATM
            </p>
            <div className="atm-banks-v2">
              <span className="atm-supported-v2">Hỗ trợ thẻ từ các ngân hàng:</span>
              <div className="atm-bank-tags-v2">
                {BANKS.slice(0, 8).map((bank) => (
                  <span key={bank.id} className="atm-bank-tag-v2">{bank.name}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions-v2">
          <button className="btn-cancel-v2" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </button>
          {payment.paymentUrl && (
            <button 
              className="btn-open-vnpay-v2"
              onClick={handleOpenGateway}
            >
              {selectedMethod === "vnpay_qr" ? "Mở trang thanh toán QR" : "Mở cổng thanh toán"}
            </button>
          )}
          <button 
            className="btn-confirm-v2" 
            onClick={handlePayment}
            disabled={loading || (selectedMethod === "bank_transfer" && !selectedBank)}
          >
            {loading ? "Đang xử lý..." : "Xác nhận đã thanh toán"}
          </button>
        </div>

        {/* Footer Note */}
        <div className="payment-footer-v2">
          <span className="footer-icon">🔒</span>
          <span>Thanh toán an toàn qua VNPay</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
