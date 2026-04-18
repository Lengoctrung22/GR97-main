import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { token, user } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const socketUrl = apiBaseUrl.replace(/\/api\/?$/, "");

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(socketUrl || undefined, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    // Listen for notifications
    newSocket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      
      // Show browser notification if permitted
      if (Notification.permission === "granted") {
        new Notification(notification.title || "HealthyAI", {
          body: notification.message,
          icon: "/brand-favicon.svg",
        });
      }
    });

    // Listen for new chat messages
    newSocket.on("new-message", (data) => {
      // Dispatch event for chat component
      window.dispatchEvent(new CustomEvent("new-message", { detail: data }));
    });

    newSocket.on("new-doctor-message", (data) => {
      window.dispatchEvent(new CustomEvent("new-doctor-message", { detail: data }));
    });

    newSocket.on("new-patient-message", (data) => {
      window.dispatchEvent(new CustomEvent("new-patient-message", { detail: data }));
    });

    // Listen for typing indicators
    newSocket.on("user-typing", (data) => {
      window.dispatchEvent(new CustomEvent("user-typing", { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, socketUrl]);

  // Join a chat room
  const joinChat = useCallback((chatId) => {
    if (socket) {
      socket.emit("join-chat", chatId);
    }
  }, [socket]);

  // Leave a chat room
  const leaveChat = useCallback((chatId) => {
    if (socket) {
      socket.emit("leave-chat", chatId);
    }
  }, [socket]);

  // Send a real-time message
  const sendMessage = useCallback((chatId, message) => {
    if (socket) {
      socket.emit("send-message", { chatId, message });
    }
  }, [socket]);

  // Send typing indicator
  const sendTyping = useCallback((chatId, isTyping) => {
    if (socket) {
      socket.emit("typing", { chatId, isTyping });
    }
  }, [socket]);

  // Join video room
  const joinRoom = useCallback((roomId) => {
    if (socket) {
      socket.emit("join-room", roomId);
    }
  }, [socket]);

  // Leave video room
  const leaveRoom = useCallback((roomId) => {
    if (socket) {
      socket.emit("leave-room", roomId);
    }
  }, [socket]);

  // WebRTC signaling
  const sendOffer = useCallback((roomId, offer, targetSocketId) => {
    if (socket) {
      socket.emit("offer", { roomId, offer, targetSocketId });
    }
  }, [socket]);

  const sendAnswer = useCallback((roomId, answer, targetSocketId) => {
    if (socket) {
      socket.emit("answer", { roomId, answer, targetSocketId });
    }
  }, [socket]);

  const sendIceCandidate = useCallback((roomId, candidate, targetSocketId) => {
    if (socket) {
      socket.emit("ice-candidate", { roomId, candidate, targetSocketId });
    }
  }, [socket]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const value = {
    socket,
    isConnected,
    notifications,
    joinChat,
    leaveChat,
    sendMessage,
    sendTyping,
    joinRoom,
    leaveRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    clearNotifications,
    removeNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
