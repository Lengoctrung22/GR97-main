
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;
const connectedUsers = new Map(); 
const socketRooms = new Map(); 

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URLS?.split(",") || ["http://localhost:5173", "http://localhost:5174", "http://localhost:5176"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user?.userId} (${socket.id})`);
    
    // Add user to connected users
    if (socket.user?.userId) {
      connectedUsers.set(socket.user.userId, socket.id);
      
      // Join user's personal room
      socket.join(`user:${socket.user.userId}`);

      if (socket.user?.role === "doctor" && socket.user?.doctorId) {
        socket.join(`doctor:${socket.user.doctorId}`);
      }
    }

    // Join chat room
    socket.on("join-chat", (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${socket.user.userId} joined chat:${chatId}`);
    });

    // Leave chat room
    socket.on("leave-chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${socket.user.userId} left chat:${chatId}`);
    });

    // Join video room (WebRTC)
    socket.on("join-room", (roomId) => {
      socket.join(`room:${roomId}`);
      // Notify others in the room
      socket.to(`room:${roomId}`).emit("user-joined", {
        userId: socket.user.userId,
        socketId: socket.id,
      });
      console.log(`User ${socket.user.userId} joined room:${roomId}`);
    });

    // Leave video room
    socket.on("leave-room", (roomId) => {
      socket.leave(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit("user-left", {
        userId: socket.user.userId,
        socketId: socket.id,
      });
      console.log(`User ${socket.user.userId} left room:${roomId}`);
    });

    // WebRTC signaling: relay offer
    socket.on("offer", ({ roomId, offer, targetSocketId }) => {
      io.to(targetSocketId).emit("offer", {
        offer,
        senderId: socket.user.userId,
        senderSocketId: socket.id,
      });
    });

    // WebRTC signaling: relay answer
    socket.on("answer", ({ roomId, answer, targetSocketId }) => {
      io.to(targetSocketId).emit("answer", {
        answer,
        senderId: socket.user.userId,
        senderSocketId: socket.id,
      });
    });

    // WebRTC signaling: relay ICE candidates
    socket.on("ice-candidate", ({ roomId, candidate, targetSocketId }) => {
      io.to(targetSocketId).emit("ice-candidate", {
        candidate,
        senderId: socket.user.userId,
        senderSocketId: socket.id,
      });
    });

    // Typing indicator
    socket.on("typing", ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit("user-typing", {
        userId: socket.user.userId,
        isTyping,
      });
    });

    // Real-time message (for instant delivery)
    socket.on("send-message", ({ chatId, message }) => {
      io.to(`chat:${chatId}`).emit("new-message", {
        message,
        senderId: socket.user.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user?.userId} (${socket.id})`);
      
      if (socket.user?.userId) {
        connectedUsers.delete(socket.user.userId);
      }
    });

    // Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  console.log("WebSocket server initialized");
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

/**
 * Send notification to specific user
 */
export const sendNotificationToUser = (userId, notification) => {
  if (!io) return;
  
  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send notification to multiple users
 */
export const sendNotificationToUsers = (userIds, notification) => {
  if (!io) return;
  
  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("notification", {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Broadcast to all connected clients
 */
export const broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Send to specific room
 */
export const sendToRoom = (roomId, event, data) => {
  if (!io) return;
  io.to(`room:${roomId}`).emit(event, data);
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

/**
 * Get user's socket ID
 */
export const getUserSocketId = (userId) => {
  return connectedUsers.get(userId);
};

/**
 * Get count of connected users
 */
export const getConnectedUsersCount = () => {
  return connectedUsers.size;
};
