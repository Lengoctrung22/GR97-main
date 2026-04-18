import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateAIInsights = async (statsData) => {
  try {
    const {
      totalAppointments = 0,
      pendingAppointments = 0,
      confirmedAppointments = 0,
      completedAppointments = 0,
      cancelledAppointments = 0,
      totalDoctors = 0,
      monthlyRevenue = 0,
      newPatients = 0,
      topDoctors = [],
      recentAppointments = [],
      chartData = [],
    } = statsData;

    const prompt = `Bạn là một chuyên gia phân tích dữ liệu y tế. Hãy phân tích dữ liệu thống kê sau và đưa ra các insights có giá trị bằng tiếng Việt:

DỮ LIỆU THỐNG KÊ:
- Tổng lịch hẹn: ${totalAppointments}
- Lịch chờ xác nhận: ${pendingAppointments}
- Lịch đã xác nhận: ${confirmedAppointments}
- Lịch đã hoàn thành: ${completedAppointments}
- Lịch đã hủy: ${cancelledAppointments}
- Tổng bác sĩ: ${totalDoctors}
- Doanh thu tháng: ${monthlyRevenue.toLocaleString("vi-VN")} VND
- Bệnh nhân mới: ${newPatients}
- Top bác sĩ: ${topDoctors.map((d) => `${d.doctorName} (${d.appointments} lịch)`).join(", ")}
- Xu hướng 7 ngày: ${chartData.join(", ")}%

Hãy đưa ra:
1. Phân tích xu hướng chính (3-5 điểm)
2. Cảnh báo về các vấn đề cần chú ý
3. Đề xuất cải thiện (3-5 đề xuất)
4. Dự đoán xu hướng sắp tới
5. Đánh giá hiệu suất tổng thể (tốt/trung bình/cần cải thiện)

Trả về kết quả dưới dạng JSON với cấu trúc:
{
  "summary": "Tóm tắt ngắn gọn",
  "trends": ["Xu hướng 1", "Xu hướng 2", ...],
  "alerts": ["Cảnh báo 1", "Cảnh báo 2", ...],
  "recommendations": ["Đề xuất 1", "Đề xuất 2", ...],
  "prediction": "Dự đoán xu hướng",
  "overallRating": "tốt/trung bình/cần cải thiện",
  "ratingScore": 85
}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Bạn là một chuyên gia phân tích dữ liệu y tế, chuyên đưa ra các insights có giá trị dựa trên dữ liệu thống kê. Luôn trả lời bằng tiếng Việt và định dạng JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "";

    // Try to parse JSON from response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const insights = JSON.parse(jsonString);
      return insights;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a fallback structure
      return {
        summary: content.substring(0, 200),
        trends: ["Đang phân tích dữ liệu..."],
        alerts: [],
        recommendations: ["Vui lòng thử lại sau"],
        prediction: "Đang cập nhật",
        overallRating: "trung bình",
        ratingScore: 50,
      };
    }
  } catch (error) {
    console.error("AI Analytics error:", error);
    throw new Error("Không thể tạo phân tích AI. Vui lòng thử lại sau.");
  }
};

export const generateDoctorPerformanceInsights = async (doctorStats) => {
  try {
    const { doctorName, appointments, completionRate, specialty } = doctorStats;

    const prompt = `Phân tích hiệu suất của bác sĩ sau và đưa ra nhận xét:

Bác sĩ: ${doctorName}
Chuyên khoa: ${specialty}
Tổng lịch hẹn: ${appointments}
Tỷ lệ hoàn thành: ${completionRate}%

Hãy đưa ra:
1. Đánh giá hiệu suất
2. Điểm mạnh
3. Điểm cần cải thiện
4. Đề xuất cụ thể

Trả về JSON:
{
  "performance": "xuất sắc/tốt/trung bình/cần cải thiện",
  "strengths": ["Điểm mạnh 1", ...],
  "improvements": ["Cần cải thiện 1", ...],
  "suggestions": ["Đề xuất 1", ...]
}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia đánh giá hiệu suất y tế. Trả lời bằng tiếng Việt và định dạng JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Doctor performance insights error:", error);
    throw new Error("Không thể phân tích hiệu suất bác sĩ.");
  }
};
