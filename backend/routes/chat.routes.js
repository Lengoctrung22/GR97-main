import { Router } from "express";
import { z } from "zod";
import { ChatMessage } from "../models/ChatMessage.js";
import { authRequired } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { generateSupportReply, analyzeMedicalImage, analyzeMultipleMedicalImages } from "../services/ai.service.js";
import { 
  addChatMessage,
  getChatHistory,
  getRecentChatHistory,
  clearChatHistory,
} from "../services/memoryChat.js";

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";
const IMAGE_ANALYSIS_TIMEOUT_MS = 20000;
const IMAGE_ANALYSIS_ACTIONS = new Set([
  "emergency",
  "urgent",
  "consult_doctor",
  "monitor",
  "try_later",
]);
const IMAGE_ANALYSIS_URGENCY = new Set(["low", "medium", "high", "critical"]);

const stringifyResultValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const normalizeWarnings = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyResultValue(item)).filter(Boolean);
  }
  const singleValue = stringifyResultValue(value);
  return singleValue ? [singleValue] : [];
};

const normalizeImageAnalysisResult = (value, imageType) => ({
  success: value?.success !== false,
  imageType,
  imageTypeLabel: stringifyResultValue(value?.imageTypeLabel),
  analysis:
    stringifyResultValue(value?.analysis) ||
    "Hiện tại hệ thống chưa thể tạo nội dung phân tích rõ ràng. Vui lòng thử lại sau.",
  warnings: normalizeWarnings(value?.warnings),
  recommendedAction: IMAGE_ANALYSIS_ACTIONS.has(value?.recommendedAction)
    ? value.recommendedAction
    : "consult_doctor",
  specialty: stringifyResultValue(value?.specialty) || null,
  urgency: IMAGE_ANALYSIS_URGENCY.has(value?.urgency) ? value.urgency : "medium",
  disclaimer:
    stringifyResultValue(value?.disclaimer) ||
    "Đây chỉ là phân tích sơ bộ từ AI. Hãy tham khảo ý kiến bác sĩ chuyên khoa để được chẩn đoán chính xác.",
});

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  mood: z.enum(["chatty", "professional"]).optional().default("chatty"),
});

// ===== PUBLIC ROUTES (no auth required) =====

// GPT-4 Vision: Phân tích hình ảnh y khoa - PUBLIC for testing
const imageAnalysisSchema = z.object({
  image: z.string().min(1), // Base64 encoded image
  imageType: z.enum(["skin", "xray", "ct_mri", "ultrasound", "eye", "wound", "general"]).optional().default("general"),
  additionalContext: z.string().optional().default(""),
});

router.post(
  "/analyze-image",
  validateBody(imageAnalysisSchema),
  async (req, res, next) => {
    try {
      const { image, imageType, additionalContext } = req.body;
      const result = await Promise.race([
        analyzeMedicalImage(image, imageType, additionalContext),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              analysis:
                "AI đang xử lý quá lâu. Vui lòng thử lại với ảnh nhỏ hơn hoặc thử lại sau.",
              warnings: [
                "Yêu cầu phân tích hình ảnh đã vượt quá thời gian chờ an toàn của hệ thống.",
              ],
              recommendedAction: "try_later",
              urgency: "medium",
            });
          }, IMAGE_ANALYSIS_TIMEOUT_MS);
        }),
      ]);

      return res.json(normalizeImageAnalysisResult(result, imageType));
    } catch (error) {
      return next(error);
    }
  }
);

// Phân tích nhiều hình ảnh - PUBLIC for testing
const multipleImagesSchema = z.object({
  images: z.array(z.string()).min(1).max(5),
  imageType: z.enum(["skin", "xray", "ct_mri", "ultrasound", "eye", "wound", "general"]).optional().default("general"),
  additionalContext: z.string().optional().default(""),
});

router.post(
  "/analyze-images",
  validateBody(multipleImagesSchema),
  async (req, res, next) => {
    try {
      const { images, imageType, additionalContext } = req.body;
      
      const result = await analyzeMultipleMedicalImages(images, imageType, additionalContext);
      
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }
);

// ===== PROTECTED ROUTES (auth required) =====

router.use(authRequired);

router.get("/history", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      return res.json({ messages: getChatHistory(req.user.userId) });
    }

    const messages = await ChatMessage.find({ user: req.user.userId }).sort({
      createdAt: 1,
    });
    return res.json({ messages });
  } catch (error) {
    return next(error);
  }
});

// Xóa lịch sử chat
router.delete("/history", async (req, res, next) => {
  try {
    if (useMemoryAuth) {
      clearChatHistory(req.user.userId);
      return res.json({ success: true, message: "Đã xóa lịch sử chat" });
    }

    await ChatMessage.deleteMany({ user: req.user.userId });
    return res.json({ success: true, message: "Đã xóa lịch sử chat" });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/support",
  validateBody(messageSchema),
  async (req, res, next) => {
    try {
      const { message, mood } = req.body;
      const userId = req.user.userId;

      if (useMemoryAuth) {
        const normalizedHistory = getRecentChatHistory(userId, 10);
        addChatMessage(userId, "user", message);
        const reply = await generateSupportReply(normalizedHistory, message, { mood });
        const assistantMessage = addChatMessage(userId, "assistant", reply);
        return res.json({ message: assistantMessage });
      }

      const history = await ChatMessage.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const normalizedHistory = history.reverse().map((item) => ({
        role: item.role,
        content: item.content,
      }));

      await ChatMessage.create({
        user: userId,
        role: "user",
        content: message,
      });

      const reply = await generateSupportReply(normalizedHistory, message, { mood });

      const assistantMessage = await ChatMessage.create({
        user: userId,
        role: "assistant",
        content: reply,
      });

      return res.json({
        message: assistantMessage,
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
