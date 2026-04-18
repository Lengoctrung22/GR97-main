import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Home } from "lucide-react";
import { api } from "../lib/api";

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);

  const success = searchParams.get("success") === "true";
  const bookingCode = searchParams.get("bookingCode") || "";
  const message = searchParams.get("message") || "";

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!bookingCode) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/payment/status/${bookingCode}`);
        setAppointment(data);
      } catch (error) {
        console.error("Failed to check payment status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [bookingCode]);

  const getTitle = () => {
    if (loading) return "Đang kiểm tra...";
    if (success || appointment?.paymentStatus === "paid") return "Thanh toán thành công!";
    return "Thanh toán thất bại";
  };

  const getDescription = () => {
    if (loading) return "Vui lòng chờ trong giây lát...";
    if (success || appointment?.paymentStatus === "paid") {
      return `Mã đặt lịch: ${bookingCode}. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!`;
    }
    return message || "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.";
  };

  const getIcon = () => {
    if (loading) return null;
    if (success || appointment?.paymentStatus === "paid") {
      return <CheckCircle size={64} className="text-success" />;
    }
    return <XCircle size={64} className="text-danger" />;
  };

  return (
    <section className="payment-result-page">
      <div className="payment-result-card">
        <div className="payment-result-icon">{getIcon()}</div>
        
        <h1>{getTitle()}</h1>
        <p className="payment-result-description">{getDescription()}</p>

        {appointment && (
          <div className="payment-result-details">
            <div className="detail-row">
              <span>Mã đặt lịch:</span>
              <strong>{appointment.bookingCode}</strong>
            </div>
            <div className="detail-row">
              <span>Trạng thái thanh toán:</span>
              <span className={`status-badge ${appointment.paymentStatus}`}>
                {appointment.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
              </span>
            </div>
            <div className="detail-row">
              <span>Trạng thái lịch hẹn:</span>
              <span className={`status-badge ${appointment.status}`}>
                {appointment.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
              </span>
            </div>
          </div>
        )}

        <div className="payment-result-actions">
          <Link to="/dashboard" className="btn-primary">
            <Home size={18} /> Về trang chủ
          </Link>
          <Link to="/doctors" className="btn-secondary">
            <ArrowLeft size={18} /> Đặt lịch khám
          </Link>
        </div>
      </div>

      <style>{`
        .payment-result-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
        }

        .payment-result-card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .payment-result-icon {
          margin-bottom: 24px;
        }

        .payment-result-icon .text-success {
          color: #22c55e;
        }

        .payment-result-icon .text-danger {
          color: #ef4444;
        }

        .payment-result-card h1 {
          font-size: 24px;
          margin-bottom: 12px;
          color: #1f2937;
        }

        .payment-result-description {
          color: #6b7280;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .payment-result-details {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: left;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row span:first-child {
          color: #6b7280;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.paid, .status-badge.confirmed {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .payment-result-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .payment-result-actions a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </section>
  );
};

export default PaymentResultPage;
