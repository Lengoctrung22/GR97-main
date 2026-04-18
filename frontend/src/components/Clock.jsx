import { useEffect, useState } from "react";

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const weekday = date.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${weekday}, ${day}/${month}/${year}`;
  };

  return (
    <div className="clock-display">
      <div className="clock-date">{formatDate(time)}</div>
      <div className="clock-time">{formatTime(time)}</div>

      <style>{`
        .clock-display {
          text-align: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .clock-time {
          font-size: 24px;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: 1px;
        }

        .clock-date {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default Clock;
