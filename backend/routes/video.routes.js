import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import { getIO, sendNotificationToUser } from "../services/socket.service.js";

const router = Router();

router.use(authRequired);

// Tạo phòng video call mới
router.post("/create-room", async (req, res) => {
  try {
    const { appointmentId, duration = 30 } = req.body;
    const roomId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Thông tin phòng
    const room = {
      roomId,
      appointmentId,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
      duration, // phút
      participants: [req.user.userId],
      status: "waiting",
    };

    return res.json({
      success: true,
      room,
      // Thông tin để client kết nối WebRTC
      signalingServer: process.env.SIGNALING_SERVER || `http://localhost:${process.env.PORT || 5000}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Tham gia phòng video
router.post("/join-room", async (req, res) => {
  try {
    const { roomId } = req.body;
    const io = getIO();

    // Thông báo cho người khác trong phòng
    io.to(`room:${roomId}`).emit("user-joined-room", {
      userId: req.user.userId,
      userName: req.user.name || req.user.email,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: "Joined room successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Gửi thông báo cho bác sĩ khi bệnh nhân muốn video call
router.post("/notify-doctor", async (req, res) => {
  try {
    const { doctorId, appointmentId, patientName } = req.body;
    
    sendNotificationToUser(doctorId, {
      type: "video_call_request",
      title: "Yêu cầu gọi video",
      message: `Bệnh nhân ${patientName} muốn gọi video`,
      appointmentId,
      action: "accept_video_call",
    });

    return res.json({
      success: true,
      message: "Notification sent",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Lấy trạng thái phòng
router.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    // Có thể lưu vào Redis hoặc MongoDB để theo dõi
    return res.json({
      success: true,
      roomId,
      status: "active",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
