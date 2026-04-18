const recordsByUser = new Map();
let counter = 1;

const defaultRecordTemplates = [
  {
    visitDate: "2023-10-15T09:00:00.000Z",
    hospital: "Bệnh viện Vinmec Đà Nẵng",
    doctorName: "BS. Trần Hoàng Nam",
    specialty: "Nội khoa",
    diagnosis: "Viêm họng cấp tính",
    summary: "Viêm họng cấp tính do vi khuẩn.",
    symptoms: ["Đau họng, khó nuốt kéo dài 3 ngày", "Sốt nhẹ 38°C", "Amidan sưng đỏ"],
    recommendations: ["Nghỉ ngơi tại nhà", "Súc miệng nước muối thường xuyên", "Tránh đồ lạnh"],
    files: [
      { name: "Công thức máu (CBC).pdf", size: "1.2 MB", uploadedAtLabel: "15/10" },
      { name: "Nội soi tai mũi họng.pdf", size: "4.5 MB", uploadedAtLabel: "15/10" },
    ],
    prescriptions: [
      { medicine: "Augmentin 1g", dosage: "1 viên/lần, ngày 2 lần", usage: "Sau ăn (7 ngày)" },
      {
        medicine: "Paracetamol 500mg",
        dosage: "1 viên/lần khi sốt trên 38.5°C",
        usage: "Cách mỗi 4-6 tiếng",
      },
    ],
  },
  {
    visitDate: "2023-08-28T09:00:00.000Z",
    hospital: "Bệnh viện Gia Định",
    doctorName: "BS. Lê Thị Mai",
    specialty: "Nội tổng quát",
    diagnosis: "Khám sức khỏe tổng quát",
    summary: "Các chỉ số ổn định, khuyến nghị duy trì vận động.",
    symptoms: ["Kiểm tra định kỳ"],
    recommendations: ["Tập luyện tối thiểu 150 phút/tuần", "Tái khám sau 6 tháng"],
    files: [{ name: "Báo cáo tổng quát.pdf", size: "850 KB", uploadedAtLabel: "28/08" }],
    prescriptions: [],
  },
];

const getOrCreateRecords = (userId) => {
  if (!recordsByUser.has(userId)) {
    const seeded = defaultRecordTemplates
      .map((item) => ({
        _id: `record_${counter++}`,
        user: userId,
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    recordsByUser.set(userId, seeded);
  }
  return recordsByUser.get(userId);
};

export const listRecords = (userId) =>
  [...getOrCreateRecords(userId)].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

export const createRecord = (userId, payload) => {
  const record = {
    _id: `record_${counter++}`,
    user: userId,
    visitDate: payload.visitDate,
    hospital: payload.hospital,
    doctorName: payload.doctorName,
    specialty: payload.specialty,
    diagnosis: payload.diagnosis,
    summary: payload.summary || payload.diagnosis,
    symptoms: payload.symptoms || [],
    recommendations: payload.recommendations || [],
    files: payload.files || [],
    prescriptions: payload.prescriptions || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const records = getOrCreateRecords(userId);
  records.unshift(record);
  return record;
};

const clean = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const recordsToCsv = (records, options = {}) => {
  const includeSymptoms = options.includeSymptoms !== false;
  const includeRecommendations = options.includeRecommendations !== false;
  const includePrescriptions = options.includePrescriptions !== false;

  const header = ["visitDate", "hospital", "doctorName", "specialty", "diagnosis", "summary"];
  if (includeSymptoms) header.push("symptoms");
  if (includeRecommendations) header.push("recommendations");
  if (includePrescriptions) header.push("prescriptions");

  const lines = records.map((record) =>
    (() => {
      const row = [
      record.visitDate,
      record.hospital,
      record.doctorName,
      record.specialty,
      record.diagnosis,
      record.summary || "",
      ];

      if (includeSymptoms) row.push((record.symptoms || []).join(" | "));
      if (includeRecommendations) row.push((record.recommendations || []).join(" | "));
      if (includePrescriptions) {
        row.push(
          (record.prescriptions || [])
            .map((item) => `${item.medicine} - ${item.dosage} - ${item.usage}`)
            .join(" | ")
        );
      }

      return row.map(clean).join(",");
    })()
  );

  return [header.join(","), ...lines].join("\n");
};
