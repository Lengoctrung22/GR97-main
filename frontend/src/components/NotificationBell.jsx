import { useState } from "react";
import { Bell, X, Check, Calendar, MessageSquare, Video, AlertCircle } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { formatDistanceToNow } from "dayjs";

const NOTIFICATION_ICONS = {
  appointment: Calendar,
  message: MessageSquare,
  video_call: Video,
  default: Bell,
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, clearNotifications, removeNotification } = useSocket();

  const handleClose = () => {
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const Icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    return <Icon size={18} />;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bell size={24} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-800">Thông báo</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Xóa tất cả
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Không có thông báo</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div
                    key={notification.id || index}
                    className="px-4 py-3 border-b hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        notification.type === "video_call" ? "bg-blue-100 text-blue-600" :
                        notification.type === "appointment" ? "bg-green-100 text-green-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {notification.message}
                        </p>
                        {notification.timestamp && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: "vi" })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t text-center">
                <button
                  onClick={handleClose}
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
