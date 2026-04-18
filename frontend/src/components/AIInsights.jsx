import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Star, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const AIInsights = ({ statsData, doctorId = null }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoFetched, setAutoFetched] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    trends: true,
    alerts: true,
    recommendations: true,
    prediction: true,
  });

  const fetchAIInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/admin/ai-analytics", {
        type: doctorId ? "doctor" : "overview",
        doctorId,
      });
      setInsights(data.insights);
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
      setError(err.response?.data?.message || "Không thể tải phân tích AI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (statsData && !autoFetched) {
      setAutoFetched(true);
      fetchAIInsights();
    }
  }, [statsData, doctorId, autoFetched]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case "tốt":
        return { bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", text: "#ffffff", shadow: "rgba(16, 185, 129, 0.4)" };
      case "trung bình":
        return { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", text: "#ffffff", shadow: "rgba(245, 158, 11, 0.4)" };
      case "cần cải thiện":
        return { bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", text: "#ffffff", shadow: "rgba(239, 68, 68, 0.4)" };
      default:
        return { bg: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", text: "#ffffff", shadow: "rgba(99, 102, 241, 0.4)" };
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case "tốt":
        return <Star size={20} fill="#ffffff" color="#ffffff" />;
      case "trung bình":
        return <Target size={20} color="#ffffff" />;
      case "cần cải thiện":
        return <AlertTriangle size={20} color="#ffffff" />;
      default:
        return <Brain size={20} color="#ffffff" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) {
    return (
      <article className="ai-insights-card">
        <div className="ai-header">
          <div className="ai-header-left">
            <div className="ai-icon-wrapper">
              <Brain size={24} className="ai-icon" />
              <Sparkles size={14} className="ai-sparkle" />
            </div>
            <div>
              <h3>Phân tích AI</h3>
              <p className="ai-subtitle">Powered by AI Analytics</p>
            </div>
          </div>
        </div>
        <div className="ai-loading">
          <div className="ai-loading-animation">
            <div className="ai-spinner"></div>
            <div className="ai-pulse-ring"></div>
          </div>
          <p className="ai-loading-text">Đang phân tích dữ liệu...</p>
          <p className="ai-loading-subtext">AI đang xử lý thông tin thống kê</p>
        </div>
        <style>{aiStyles}</style>
      </article>
    );
  }

  if (error) {
    return (
      <article className="ai-insights-card ai-error-card">
        <div className="ai-header">
          <div className="ai-header-left">
            <div className="ai-icon-wrapper ai-icon-error">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3>Phân tích AI</h3>
              <p className="ai-subtitle">Có lỗi xảy ra</p>
            </div>
          </div>
        </div>
        <div className="ai-error">
          <div className="ai-error-icon">
            <AlertTriangle size={48} />
          </div>
          <p className="ai-error-message">{error}</p>
          <button onClick={fetchAIInsights} className="ai-retry-btn">
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
        <style>{aiStyles}</style>
      </article>
    );
  }

  if (!insights) {
    return (
      <article className="ai-insights-card ai-empty-card">
        <div className="ai-header">
          <div className="ai-header-left">
            <div className="ai-icon-wrapper">
              <Brain size={24} className="ai-icon" />
              <Sparkles size={14} className="ai-sparkle" />
            </div>
            <div>
              <h3>Phân tích AI</h3>
              <p className="ai-subtitle">Chưa có dữ liệu</p>
            </div>
          </div>
        </div>
        <div className="ai-empty">
          <div className="ai-empty-icon">
            <Brain size={64} />
          </div>
          <p className="ai-empty-text">Chưa có dữ liệu phân tích</p>
          <p className="ai-empty-subtext">Nhấn nút bên dưới để tạo phân tích AI ngay</p>
          <button onClick={fetchAIInsights} className="ai-generate-btn">
            <Sparkles size={18} />
            Tạo phân tích AI ngay
          </button>
        </div>
        <style>{aiStyles}</style>
      </article>
    );
  }

  const ratingColors = getRatingColor(insights.overallRating);
  const scoreColor = getScoreColor(insights.ratingScore || 0);

  return (
    <article className="ai-insights-card ai-main-card">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-icon-wrapper">
            <Brain size={24} className="ai-icon" />
            <Sparkles size={14} className="ai-sparkle" />
          </div>
          <div>
            <h3>Phân tích AI</h3>
            <p className="ai-subtitle">Powered by AI Analytics</p>
          </div>
        </div>
        <button onClick={fetchAIInsights} className="ai-refresh-btn">
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      {/* Overall Rating Section */}
      <div className="ai-rating-section">
        <div className="ai-rating-left">
          <div 
            className="ai-rating-badge" 
            style={{ 
              background: ratingColors.bg,
              boxShadow: `0 8px 24px ${ratingColors.shadow}`
            }}
          >
            {getRatingIcon(insights.overallRating)}
            <span>{insights.overallRating?.toUpperCase() || "N/A"}</span>
          </div>
          <div className="ai-rating-info">
            <span className="ai-rating-label">Đánh giá tổng quan</span>
            <span className="ai-rating-date">Cập nhật: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
        <div className="ai-score-container">
          <div className="ai-score-circle" style={{ borderColor: scoreColor }}>
            <span className="score-value" style={{ color: scoreColor }}>{insights.ratingScore || 0}</span>
            <span className="score-label">/100</span>
          </div>
          <div className="ai-score-bar">
            <div 
              className="ai-score-fill" 
              style={{ 
                width: `${insights.ratingScore || 0}%`,
                background: `linear-gradient(90deg, ${scoreColor} 0%, ${scoreColor}dd 100%)`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {insights.summary && (
        <div className="ai-summary">
          <div className="ai-summary-icon">📊</div>
          <p>{insights.summary}</p>
        </div>
      )}

      {/* Trends */}
      {insights.trends && insights.trends.length > 0 && (
        <div className="ai-section">
          <div 
            className="ai-section-header" 
            onClick={() => toggleSection('trends')}
          >
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-trends-icon">
                <TrendingUp size={18} />
              </div>
              <h4>Xu hướng chính</h4>
              <span className="ai-section-count">{insights.trends.length}</span>
            </div>
            {expandedSections.trends ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {expandedSections.trends && (
            <ul className="ai-list ai-trends-list">
              {insights.trends.map((trend, index) => (
                <li key={index} className="ai-list-item">
                  <span className="ai-bullet ai-trend-bullet">📈</span>
                  <span className="ai-list-text">{trend}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Alerts */}
      {insights.alerts && insights.alerts.length > 0 && (
        <div className="ai-section ai-alerts-section">
          <div 
            className="ai-section-header" 
            onClick={() => toggleSection('alerts')}
          >
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-alert-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Cảnh báo</h4>
              <span className="ai-section-count ai-alert-count">{insights.alerts.length}</span>
            </div>
            {expandedSections.alerts ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {expandedSections.alerts && (
            <ul className="ai-list ai-alerts-list">
              {insights.alerts.map((alert, index) => (
                <li key={index} className="ai-list-item ai-alert-item">
                  <span className="ai-bullet ai-alert-bullet">⚠️</span>
                  <span className="ai-list-text">{alert}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="ai-section ai-recommendations-section">
          <div 
            className="ai-section-header" 
            onClick={() => toggleSection('recommendations')}
          >
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-recommendation-icon">
                <Lightbulb size={18} />
              </div>
              <h4>Đề xuất cải thiện</h4>
              <span className="ai-section-count">{insights.recommendations.length}</span>
            </div>
            {expandedSections.recommendations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {expandedSections.recommendations && (
            <ul className="ai-list ai-recommendations-list">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="ai-list-item ai-recommendation-item">
                  <span className="ai-bullet ai-recommendation-bullet">💡</span>
                  <span className="ai-list-text">{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Prediction */}
      {insights.prediction && (
        <div className="ai-section ai-prediction-section">
          <div 
            className="ai-section-header" 
            onClick={() => toggleSection('prediction')}
          >
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-prediction-icon">
                <Target size={18} />
              </div>
              <h4>Dự đoán xu hướng</h4>
            </div>
            {expandedSections.prediction ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {expandedSections.prediction && (
            <div className="ai-prediction-content">
              <p>{insights.prediction}</p>
            </div>
          )}
        </div>
      )}

      {/* Doctor-specific insights */}
      {insights.performance && (
        <div className="ai-section">
          <div className="ai-section-header">
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-performance-icon">
                <Star size={18} />
              </div>
              <h4>Đánh giá hiệu suất</h4>
            </div>
          </div>
          <div 
            className="ai-performance-badge" 
            style={{ 
              background: getRatingColor(insights.performance).bg,
              boxShadow: `0 4px 12px ${getRatingColor(insights.performance).shadow}`
            }}
          >
            {insights.performance?.toUpperCase()}
          </div>
        </div>
      )}

      {insights.strengths && insights.strengths.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-header">
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-strength-icon">
                <Star size={18} />
              </div>
              <h4>Điểm mạnh</h4>
              <span className="ai-section-count ai-strength-count">{insights.strengths.length}</span>
            </div>
          </div>
          <ul className="ai-list ai-strengths-list">
            {insights.strengths.map((strength, index) => (
              <li key={index} className="ai-list-item ai-strength-item">
                <span className="ai-bullet ai-strength-bullet">✅</span>
                <span className="ai-list-text">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.improvements && insights.improvements.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-header">
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-improvement-icon">
                <TrendingUp size={18} />
              </div>
              <h4>Cần cải thiện</h4>
              <span className="ai-section-count ai-improvement-count">{insights.improvements.length}</span>
            </div>
          </div>
          <ul className="ai-list ai-improvements-list">
            {insights.improvements.map((improvement, index) => (
              <li key={index} className="ai-list-item ai-improvement-item">
                <span className="ai-bullet ai-improvement-bullet">🔧</span>
                <span className="ai-list-text">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.suggestions && insights.suggestions.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-header">
            <div className="ai-section-header-left">
              <div className="ai-section-icon ai-suggestion-icon">
                <Lightbulb size={18} />
              </div>
              <h4>Đề xuất</h4>
              <span className="ai-section-count">{insights.suggestions.length}</span>
            </div>
          </div>
          <ul className="ai-list ai-suggestions-list">
            {insights.suggestions.map((suggestion, index) => (
              <li key={index} className="ai-list-item ai-suggestion-item">
                <span className="ai-bullet ai-suggestion-bullet">💡</span>
                <span className="ai-list-text">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{aiStyles}</style>
    </article>
  );
};

const aiStyles = `
  .ai-insights-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    border-radius: 20px;
    padding: 28px;
    color: white;
    box-shadow: 0 20px 60px rgba(102, 126, 234, 0.35), 0 8px 24px rgba(118, 75, 162, 0.25);
    position: relative;
    overflow: hidden;
  }

  .ai-insights-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }

  .ai-error-card {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 20px 60px rgba(239, 68, 68, 0.35);
  }

  .ai-empty-card {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    box-shadow: 0 20px 60px rgba(99, 102, 241, 0.35);
  }

  .ai-main-card {
    animation: fadeInUp 0.6s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
  }

  .ai-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .ai-icon-wrapper {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    backdrop-filter: blur(10px);
  }

  .ai-icon-wrapper.ai-icon-error {
    background: rgba(255, 255, 255, 0.25);
  }

  .ai-icon {
    animation: pulse 2s infinite;
  }

  .ai-sparkle {
    position: absolute;
    top: -4px;
    right: -4px;
    animation: sparkle 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.95); }
  }

  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
    50% { opacity: 0.5; transform: scale(1.2) rotate(180deg); }
  }

  .ai-header h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .ai-subtitle {
    margin: 2px 0 0 0;
    font-size: 12px;
    opacity: 0.8;
    font-weight: 500;
  }

  .ai-refresh-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(10px);
  }

  .ai-refresh-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .ai-loading {
    text-align: center;
    padding: 60px 20px;
    position: relative;
    z-index: 1;
  }

  .ai-loading-animation {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
  }

  .ai-spinner {
    width: 80px;
    height: 80px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .ai-pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100px;
    height: 100px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: pulseRing 2s ease-out infinite;
  }

  @keyframes pulseRing {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .ai-loading-text {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .ai-loading-subtext {
    margin: 0;
    font-size: 13px;
    opacity: 0.8;
  }

  .ai-error {
    text-align: center;
    padding: 40px 20px;
    position: relative;
    z-index: 1;
  }

  .ai-error-icon {
    margin-bottom: 20px;
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  .ai-error-message {
    margin: 0 0 24px 0;
    font-size: 15px;
    line-height: 1.6;
  }

  .ai-retry-btn {
    background: white;
    color: #ef4444;
    border: none;
    padding: 12px 28px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .ai-retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .ai-empty {
    text-align: center;
    padding: 60px 20px;
    position: relative;
    z-index: 1;
  }

  .ai-empty-icon {
    margin-bottom: 24px;
    opacity: 0.6;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .ai-empty-text {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 700;
  }

  .ai-empty-subtext {
    margin: 0 0 24px 0;
    font-size: 14px;
    opacity: 0.8;
  }

  .ai-generate-btn {
    background: white;
    color: #6366f1;
    border: none;
    padding: 14px 32px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .ai-generate-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  }

  .ai-rating-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1;
  }

  .ai-rating-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .ai-rating-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 14px;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.5px;
  }

  .ai-rating-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ai-rating-label {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.9;
  }

  .ai-rating-date {
    font-size: 11px;
    opacity: 0.7;
  }

  .ai-score-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .ai-score-circle {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    border: 3px solid;
  }

  .score-value {
    font-size: 36px;
    font-weight: 900;
    line-height: 1;
  }

  .score-label {
    font-size: 16px;
    opacity: 0.8;
    font-weight: 600;
  }

  .ai-score-bar {
    width: 120px;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
  }

  .ai-score-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 1s ease-out;
  }

  .ai-summary {
    margin-bottom: 24px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    display: flex;
    gap: 14px;
    position: relative;
    z-index: 1;
  }

  .ai-summary-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .ai-summary p {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    opacity: 0.95;
  }

  .ai-section {
    margin-bottom: 16px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    z-index: 1;
    transition: all 0.3s ease;
  }

  .ai-section:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .ai-alerts-section {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .ai-prediction-section {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .ai-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .ai-section-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .ai-section-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ai-section-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
  }

  .ai-trends-icon { background: rgba(59, 130, 246, 0.3); }
  .ai-alert-icon { background: rgba(239, 68, 68, 0.3); }
  .ai-recommendation-icon { background: rgba(245, 158, 11, 0.3); }
  .ai-prediction-icon { background: rgba(34, 197, 94, 0.3); }
  .ai-performance-icon { background: rgba(168, 85, 247, 0.3); }
  .ai-strength-icon { background: rgba(34, 197, 94, 0.3); }
  .ai-improvement-icon { background: rgba(245, 158, 11, 0.3); }
  .ai-suggestion-icon { background: rgba(59, 130, 246, 0.3); }

  .ai-section-header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }

  .ai-section-count {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
  }

  .ai-alert-count {
    background: rgba(239, 68, 68, 0.4);
  }

  .ai-strength-count {
    background: rgba(34, 197, 94, 0.4);
  }

  .ai-improvement-count {
    background: rgba(245, 158, 11, 0.4);
  }

  .ai-list {
    list-style: none;
    padding: 0 18px 18px 18px;
    margin: 0;
  }

  .ai-list-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    font-size: 13px;
    line-height: 1.6;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .ai-list-item:last-child {
    border-bottom: none;
  }

  .ai-bullet {
    flex-shrink: 0;
    font-size: 16px;
    margin-top: 2px;
  }

  .ai-list-text {
    flex: 1;
  }

  .ai-alert-item {
    padding: 14px;
    margin: 0 -18px;
    padding-left: 18px;
    padding-right: 18px;
  }

  .ai-prediction-content {
    padding: 0 18px 18px 18px;
  }

  .ai-prediction-content p {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    opacity: 0.95;
  }

  .ai-performance-badge {
    display: inline-block;
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 14px;
    margin: 0 18px 18px 18px;
    letter-spacing: 0.5px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .ai-insights-card {
      padding: 20px;
    }

    .ai-rating-section {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .ai-score-container {
      align-items: flex-start;
      width: 100%;
    }

    .ai-score-bar {
      width: 100%;
    }

    .ai-header {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .ai-refresh-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

export default AIInsights;
