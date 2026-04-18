import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Coins, UsersRound, TrendingUp, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { api } from "../lib/api";
import AIInsights from "../components/AIInsights";

const fallbackChart = [40, 50, 35, 60, 75, 48, 30];

const AdminStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/appointments/stats");
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const cards = [
    {
      label: "Tổng lịch hẹn",
      value: stats?.cards?.appointmentsCount || 0,
      trend: `${stats?.statusCounts?.pending || 0} chờ xác nhận`,
      icon: Activity,
      color: "blue",
      bgColor: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      iconBg: "rgba(59, 130, 246, 0.15)",
    },
    {
      label: "Tổng bác sĩ",
      value: stats?.cards?.doctorsCount || 0,
      trend: `${stats?.topDoctors?.length || 0} bác sĩ nổi bật`,
      icon: UsersRound,
      color: "purple",
      bgColor: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      iconBg: "rgba(139, 92, 246, 0.15)",
    },
    {
      label: "Doanh thu tháng",
      value: `${(stats?.cards?.monthlyRevenue || 0).toLocaleString("vi-VN")} VND`,
      trend: `${stats?.paidCount || 0} lịch đã thanh toán`,
      icon: Coins,
      color: "green",
      bgColor: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      iconBg: "rgba(16, 185, 129, 0.15)",
    },
    {
      label: "Bệnh nhân mới",
      value: stats?.cards?.newPatients || 0,
      trend: `${stats?.statusCounts?.completed || 0} lịch hoàn thành`,
      icon: BarChart3,
      color: "orange",
      bgColor: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      iconBg: "rgba(245, 158, 11, 0.15)",
    },
  ];

  const chartData = stats?.chart?.length ? stats.chart : fallbackChart;
  const topDoctors = useMemo(() => stats?.topDoctors || [], [stats?.topDoctors]);

  const statusRatios = useMemo(() => {
    const total = stats?.cards?.appointmentsCount || 0;
    const statusCounts = stats?.statusCounts || {};
    if (!total) {
      return [
        { label: "Chờ xác nhận", value: 0, icon: Clock, color: "#f59e0b" },
        { label: "Đã xác nhận", value: 0, icon: Calendar, color: "#3b82f6" },
        { label: "Đã hoàn thành", value: 0, icon: CheckCircle, color: "#10b981" },
        { label: "Đã hủy", value: 0, icon: XCircle, color: "#ef4444" },
      ];
    }
    return [
      { label: "Chờ xác nhận", value: Math.round(((statusCounts.pending || 0) / total) * 100), icon: Clock, color: "#f59e0b" },
      { label: "Đã xác nhận", value: Math.round(((statusCounts.confirmed || 0) / total) * 100), icon: Calendar, color: "#3b82f6" },
      { label: "Đã hoàn thành", value: Math.round(((statusCounts.completed || 0) / total) * 100), icon: CheckCircle, color: "#10b981" },
      { label: "Đã hủy", value: Math.round(((statusCounts.cancelled || 0) / total) * 100), icon: XCircle, color: "#ef4444" },
    ];
  }, [stats?.cards?.appointmentsCount, stats?.statusCounts]);

  return (
    <section className="admin-stats-page">
      {/* Page Header */}
      <div className="stats-page-header">
        <div className="stats-header-content">
          <div className="stats-header-icon">
            <TrendingUp size={32} />
          </div>
          <div>
            <h1 className="stats-page-title">Thống kê lịch hẹn</h1>
            <p className="stats-page-subtitle">Phân tích tổng quan lịch hẹn, doanh thu và hiệu suất bác sĩ</p>
          </div>
        </div>
        <div className="stats-header-badge">
          <span className="stats-badge-live"></span>
          Cập nhật实时
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-grid">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <article 
              key={card.label} 
              className="stats-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="stats-card-header">
                <div 
                  className="stats-card-icon"
                  style={{ background: card.iconBg }}
                >
                  <Icon size={24} style={{ color: card.color === 'blue' ? '#3b82f6' : card.color === 'purple' ? '#8b5cf6' : card.color === 'green' ? '#10b981' : '#f59e0b' }} />
                </div>
                <div className="stats-card-trend">
                  <TrendingUp size={14} />
                  <span>{card.trend}</span>
                </div>
              </div>
              <div className="stats-card-body">
                <p className="stats-card-label">{card.label}</p>
                <h3 className="stats-card-value">{card.value}</h3>
              </div>
              <div 
                className="stats-card-accent"
                style={{ background: card.bgColor }}
              ></div>
            </article>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="stats-charts-grid">
        {/* Bar Chart */}
        <article className="stats-chart-card">
          <div className="stats-chart-header">
            <div className="stats-chart-title">
              <BarChart3 size={20} />
              <h3>Xu hướng lịch khám (7 ngày)</h3>
            </div>
            <span className="stats-chart-badge">
              <span className="stats-badge-pulse"></span>
              Tự động cập nhật
            </span>
          </div>
          {loading ? (
            <div className="stats-chart-loading">
              <div className="stats-loading-spinner"></div>
              <p>Đang tải dữ liệu biểu đồ...</p>
            </div>
          ) : (
            <div className="stats-bar-chart">
              {chartData.map((value, index) => (
                <div key={`${value}_${index}`} className="stats-bar-col">
                  <div className="stats-bar-wrapper">
                    <div 
                      className="stats-bar-fill" 
                      style={{ 
                        height: `${value}%`,
                        background: `linear-gradient(180deg, #667eea 0%, #764ba2 100%)`,
                        animationDelay: `${index * 0.1}s`
                      }}
                    />
                  </div>
                  <small className="stats-bar-label">T{index + 2}</small>
                  <span className="stats-bar-value">{value}%</span>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Status Pie Chart */}
        <article className="stats-pie-card">
          <div className="stats-chart-header">
            <div className="stats-chart-title">
              <Activity size={20} />
              <h3>Tỷ lệ trạng thái lịch hẹn</h3>
            </div>
          </div>
          <div className="stats-status-grid">
            {statusRatios.map((item) => {
              const StatusIcon = item.icon;
              return (
                <div key={item.label} className="stats-status-item">
                  <div className="stats-status-header">
                    <div className="stats-status-icon" style={{ background: `${item.color}20` }}>
                      <StatusIcon size={18} style={{ color: item.color }} />
                    </div>
                    <span className="stats-status-label">{item.label}</span>
                    <strong className="stats-status-value" style={{ color: item.color }}>{item.value}%</strong>
                  </div>
                  <div className="stats-status-bar">
                    <div 
                      className="stats-status-fill" 
                      style={{ 
                        width: `${item.value}%`,
                        background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}dd 100%)`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {/* Top Doctors Table */}
      <article className="stats-table-card">
        <div className="stats-table-header">
          <div className="stats-table-title">
            <UsersRound size={20} />
            <h3>Top bác sĩ theo lịch hẹn</h3>
          </div>
          <span className="stats-table-count">{topDoctors.length} bác sĩ</span>
        </div>
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Bác sĩ</th>
                <th>Chuyên khoa</th>
                <th>Tổng lịch</th>
                <th>Tỷ lệ hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {topDoctors.map((doctor, index) => (
                <tr key={doctor.doctorId} style={{ animationDelay: `${index * 0.05}s` }}>
                  <td>
                    <div className="stats-doctor-info">
                      <div className="stats-doctor-avatar">
                        {doctor.doctorName?.charAt(0) || 'B'}
                      </div>
                      <span className="stats-doctor-name">{doctor.doctorName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="stats-doctor-specialty">{doctor.specialty}</span>
                  </td>
                  <td>
                    <span className="stats-doctor-appointments">{doctor.appointments}</span>
                  </td>
                  <td>
                    <div className="stats-completion-wrapper">
                      <div className="stats-completion-bar">
                        <div 
                          className="stats-completion-fill"
                          style={{ width: `${doctor.completionRate}%` }}
                        />
                      </div>
                      <span className="stats-completion-value">{doctor.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && topDoctors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="stats-table-empty">
                    <div className="stats-empty-state">
                      <UsersRound size={48} />
                      <p>Chưa có dữ liệu thống kê.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      {/* AI Insights Section */}
      <div className="stats-ai-section">
        <AIInsights statsData={stats} />
      </div>

      <style>{statsPageStyles}</style>
    </section>
  );
};

const statsPageStyles = `
  .admin-stats-page {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Page Header */
  .stats-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
    padding: 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    color: white;
    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
  }

  .stats-header-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stats-header-icon {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }

  .stats-page-title {
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .stats-page-subtitle {
    margin: 4px 0 0 0;
    font-size: 14px;
    opacity: 0.9;
  }

  .stats-header-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    backdrop-filter: blur(10px);
  }

  .stats-badge-live {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  /* Stats Cards Grid */
  .stats-cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .stats-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    animation: slideUp 0.5s ease-out forwards;
    opacity: 0;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .stats-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  }

  .stats-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .stats-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stats-card-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #64748b;
    background: #f1f5f9;
    padding: 6px 10px;
    border-radius: 20px;
  }

  .stats-card-body {
    position: relative;
    z-index: 1;
  }

  .stats-card-label {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }

  .stats-card-value {
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: -0.5px;
  }

  .stats-card-accent {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    opacity: 0.8;
  }

  /* Charts Grid */
  .stats-charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .stats-chart-card,
  .stats-pie-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .stats-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .stats-chart-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .stats-chart-title h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
  }

  .stats-chart-title svg {
    color: #667eea;
  }

  .stats-chart-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #10b981;
    background: #dcfce7;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 600;
  }

  .stats-badge-pulse {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .stats-chart-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #64748b;
  }

  .stats-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .stats-bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 200px;
    gap: 12px;
    padding: 0 10px;
  }

  .stats-bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .stats-bar-wrapper {
    width: 100%;
    height: 160px;
    background: #f1f5f9;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }

  .stats-bar-fill {
    width: 100%;
    border-radius: 8px;
    animation: growUp 0.8s ease-out forwards;
    transform-origin: bottom;
  }

  @keyframes growUp {
    from { transform: scaleY(0); }
    to { transform: scaleY(1); }
  }

  .stats-bar-label {
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
  }

  .stats-bar-value {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
  }

  /* Status Grid */
  .stats-status-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stats-status-item {
    padding: 16px;
    background: #f8fafc;
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .stats-status-item:hover {
    background: #f1f5f9;
    transform: translateX(4px);
  }

  .stats-status-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .stats-status-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stats-status-label {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
  }

  .stats-status-value {
    font-size: 18px;
    font-weight: 800;
  }

  .stats-status-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .stats-status-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease-out;
  }

  /* Table Card */
  .stats-table-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    margin-bottom: 24px;
  }

  .stats-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .stats-table-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .stats-table-title h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
  }

  .stats-table-title svg {
    color: #667eea;
  }

  .stats-table-count {
    font-size: 13px;
    color: #64748b;
    background: #f1f5f9;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 600;
  }

  .stats-table-wrapper {
    overflow-x: auto;
  }

  .stats-table {
    width: 100%;
    border-collapse: collapse;
  }

  .stats-table th {
    padding: 14px 16px;
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
  }

  .stats-table td {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .stats-table tbody tr {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
    transition: background 0.2s ease;
  }

  .stats-table tbody tr:hover {
    background: #f8fafc;
  }

  .stats-doctor-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .stats-doctor-avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
  }

  .stats-doctor-name {
    font-weight: 600;
    color: #1e293b;
    font-size: 14px;
  }

  .stats-doctor-specialty {
    font-size: 13px;
    color: #64748b;
    background: #f1f5f9;
    padding: 4px 10px;
    border-radius: 6px;
  }

  .stats-doctor-appointments {
    font-weight: 700;
    color: #1e293b;
    font-size: 16px;
  }

  .stats-completion-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .stats-completion-bar {
    flex: 1;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .stats-completion-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    border-radius: 4px;
    transition: width 1s ease-out;
  }

  .stats-completion-value {
    font-weight: 700;
    color: #10b981;
    font-size: 14px;
    min-width: 45px;
    text-align: right;
  }

  .stats-table-empty {
    text-align: center;
    padding: 60px 20px !important;
  }

  .stats-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #94a3b8;
  }

  .stats-empty-state p {
    margin: 0;
    font-size: 14px;
  }

  /* AI Section */
  .stats-ai-section {
    margin-top: 24px;
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .stats-cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stats-charts-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .stats-page-header {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .stats-cards-grid {
      grid-template-columns: 1fr;
    }

    .stats-page-title {
      font-size: 22px;
    }

    .stats-card-value {
      font-size: 24px;
    }
  }
`;

export default AdminStatsPage;
