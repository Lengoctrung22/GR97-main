import { Router } from "express";
import { z } from "zod";
import { MedicalRecord } from "../models/MedicalRecord.js";
import { authRequired } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate.js";
import { createRecord, listRecords, recordsToCsv } from "../services/memoryRecords.js";
import { getMedicationSuggestions } from "../services/ai.service.js";
import pdfMakeLib from "pdfmake/build/pdfmake.js";
import pdfFonts from "pdfmake/build/vfs_fonts.js";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";

// Initialize pdfmake with fonts
const pdfMake = pdfMakeLib;
if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts.vfs) {
  pdfMake.vfs = pdfFonts.vfs;
}

const router = Router();
const useMemoryAuth = process.env.IN_MEMORY_AUTH === "1";

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === "1" || String(value).toLowerCase() === "true";
};

const filterRecords = (records, query) => {
  const timeFilter = String(query.timeFilter || "all");
  const specialty = String(query.specialty || "").trim();
  const fromDate = query.fromDate ? new Date(String(query.fromDate)) : null;
  const toDate = query.toDate ? new Date(String(query.toDate)) : null;
  const now = new Date();

  return records.filter((record) => {
    const visitDate = new Date(record.visitDate);

    if (specialty && record.specialty !== specialty) return false;

    if (timeFilter === "30d" && visitDate < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      return false;
    }
    if (timeFilter === "6m" && visitDate < new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000)) {
      return false;
    }
    if (timeFilter === "1y" && visitDate < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
      return false;
    }

    if (fromDate && !Number.isNaN(fromDate.getTime()) && visitDate < fromDate) return false;
    if (toDate && !Number.isNaN(toDate.getTime()) && visitDate > toDate) return false;

    return true;
  });
};

// Helper function to format date for PDF
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Generate PDF document using pdfmake (better Unicode/Vietnamese support)
const generatePdf = (records, options) => {
  return new Promise((resolve, reject) => {
    try {
      // Build content array
      const content = [];

      // Title
      content.push({
        text: "HỒ SƠ BỆNH ÁN",
        style: "title",
        alignment: "center"
      });

      content.push({
        text: "HealthyAI - Hệ thống quản lý sức khỏe",
        style: "subtitle",
        alignment: "center"
      });

      content.push({
        text: `Xuất ngày: ${formatDate(new Date())}`,
        style: "normal",
        alignment: "center",
        margin: [0, 0, 0, 10]
      });

      content.push({
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 1,
            lineColor: "#cccccc"
          }
        ],
        margin: [0, 0, 0, 10]
      });

      content.push({
        text: `Tổng số hồ sơ: ${records.length}`,
        style: "normal",
        margin: [0, 0, 0, 15]
      });

      // Process each record
      records.forEach((record, index) => {
        const source = typeof record.toObject === "function" ? record.toObject() : record;

        // Record header
        content.push({
          text: `Lần khám ${index + 1}: ${formatDate(source.visitDate)}`,
          style: "recordHeader",
          margin: [0, 10, 0, 5]
        });

        content.push({
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 0.5,
              lineColor: "#3b82f6"
            }
          ],
          margin: [0, 0, 0, 10]
        });

        // Hospital & Doctor Info
        const infoTable = {
          table: {
            widths: ["*"],
            body: []
          },
          layout: "noBorders",
          margin: [0, 0, 0, 5]
        };

        infoTable.table.body.push([
          { text: "Bệnh viện/Phòng khám: ", bold: true },
          source.hospital || "Không có thông tin"
        ].join(""));

        // Basic info as a formatted list
        content.push({
          stack: [
            {
              text: [
                { text: "Bệnh viện/Phòng khám: ", bold: true },
                source.hospital || "Không có thông tin"
              ],
              margin: [0, 0, 0, 3]
            },
            {
              text: [
                { text: "Bác sĩ: ", bold: true },
                source.doctorName || "Không có thông tin"
              ],
              margin: [0, 0, 0, 3]
            },
            {
              text: [
                { text: "Chuyên khoa: ", bold: true },
                source.specialty || "Không có thông tin"
              ],
              margin: [0, 0, 0, 3]
            },
            {
              text: [
                { text: "Chẩn đoán: ", bold: true },
                source.diagnosis || "Không có thông tin"
              ],
              margin: [0, 0, 0, 8]
            }
          ]
        });

        // Summary
        if (source.summary) {
          content.push({
            text: [
              { text: "Tóm tắt: ", bold: true },
              source.summary
            ],
            margin: [0, 0, 0, 8]
          });
        }

        // Symptoms
        if (options.includeSymptoms && source.symptoms && source.symptoms.length > 0) {
          content.push({
            text: "Triệu chứng:",
            bold: true,
            margin: [0, 0, 0, 3]
          });
          
          source.symptoms.forEach((symptom) => {
            content.push({
              text: `• ${symptom}`,
              margin: [10, 0, 0, 2]
            });
          });
          content.push({ text: "", margin: [0, 0, 0, 5] });
        }

        // Recommendations
        if (options.includeRecommendations && source.recommendations && source.recommendations.length > 0) {
          content.push({
            text: "Lời dặn của bác sĩ:",
            bold: true,
            margin: [0, 0, 0, 3]
          });
          
          source.recommendations.forEach((rec) => {
            content.push({
              text: `• ${rec}`,
              margin: [10, 0, 0, 2]
            });
          });
          content.push({ text: "", margin: [0, 0, 0, 5] });
        }

        // Prescriptions
        if (options.includePrescriptions && source.prescriptions && source.prescriptions.length > 0) {
          content.push({
            text: "Đơn thuốc:",
            bold: true,
            margin: [0, 0, 0, 5]
          });
          
          // Table for prescriptions
          const tableBody = [
            [
              { text: "Tên thuốc", bold: true, fillColor: "#f3f4f6" },
              { text: "Liều dùng", bold: true, fillColor: "#f3f4f6" },
              { text: "Cách dùng", bold: true, fillColor: "#f3f4f6" }
            ]
          ];
          
          source.prescriptions.forEach((prescription) => {
            tableBody.push([
              prescription.medicine || "",
              prescription.dosage || "",
              prescription.usage || ""
            ]);
          });
          
          content.push({
            table: {
              headerRows: 1,
              widths: ["*", "*", "*"],
              body: tableBody
            },
            layout: {
              hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
              vLineWidth: () => 0,
              hLineColor: () => "#cccccc",
              paddingLeft: () => 5,
              paddingRight: () => 5,
              paddingTop: () => 5,
              paddingBottom: () => 5
            },
            margin: [0, 0, 0, 10]
          });
        }

        // Files
        if (source.files && source.files.length > 0) {
          content.push({
            text: "Tệp đính kèm:",
            bold: true,
            margin: [0, 5, 0, 3]
          });
          
          source.files.forEach((file) => {
            content.push({
              text: `• ${file.name} (${file.size})`,
              margin: [10, 0, 0, 2]
            });
          });
        }

        // Separator between records
        content.push({
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 0.5,
              lineColor: "#e5e7eb"
            }
          ],
          margin: [0, 15, 0, 0]
        });
      });

      // Footer
      content.push({
        text: "--- Hết hồ sơ ---",
        alignment: "center",
        margin: [0, 20, 0, 5]
      });

      content.push({
        text: "Tạo bởi HealthyAI - Hệ thống quản lý sức khỏe điện tử",
        alignment: "center",
        fontSize: 8,
        color: "gray"
      });

      // Define styles
      const styles = {
        title: {
          fontSize: 18,
          bold: true,
          color: "#1e40af"
        },
        subtitle: {
          fontSize: 10,
          color: "#6b7280"
        },
        normal: {
          fontSize: 10
        },
        recordHeader: {
          fontSize: 12,
          bold: true,
          color: "#1e40af"
        }
      };

      // Create the PDF document
      const docDefinition = {
        content,
        styles,
        defaultStyle: {
          fontSize: 10,
          font: "Roboto"
        },
        pageMargins: [40, 40, 40, 60],
        footer: (currentPage, pageCount) => ({
          text: `Trang ${currentPage} / ${pageCount}`,
          alignment: "center",
          margin: [0, 10, 0, 0],
          fontSize: 8,
          color: "gray"
        })
      };

      // Generate PDF
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      pdfDocGenerator.getBuffer((buffer) => {
        resolve(buffer);
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      reject(error);
    }
  });
};

// Generate Word document using docx
const generateDocx = async (records, options) => {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: {
              ascii: "Arial",
              hAnsi: "Arial",
              eastAsia: "Arial",
              cs: "Arial",
            },
            language: {
              value: "vi-VN",
              eastAsia: "vi-VN",
              bidirectional: "vi-VN",
            },
          },
        },
        title: {
          run: {
            font: "Arial",
          },
        },
        heading1: {
          run: {
            font: "Arial",
          },
        },
        heading2: {
          run: {
            font: "Arial",
          },
        },
        heading3: {
          run: {
            font: "Arial",
          },
        },
      },
    },
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: "HỒ SƠ BỆNH ÁN",
          heading: HeadingLevel.TITLE,
          alignment: "center",
          spacing: {
            after: 200
          }
        }),
        
        // Subtitle
        new Paragraph({
          text: "HealthyAI - Hệ thống quản lý sức khỏe",
          alignment: "center",
          spacing: {
            after: 100
          }
        }),
        
        // Export date
        new Paragraph({
          text: `Xuất ngày: ${formatDate(new Date())}`,
          alignment: "center",
          spacing: {
            after: 300
          }
        }),
        
        // Separator line
        new Paragraph({
          children: [
            new TextRun({
              text: "─".repeat(50),
              size: 20,
              color: "cccccc"
            })
          ],
          alignment: "center",
          spacing: {
            after: 200
          }
        }),
        
        // Total records
        new Paragraph({
          text: `Tổng số hồ sơ: ${records.length}`,
          spacing: {
            after: 200
          }
        }),
        
        // Process each record
        ...records.flatMap((record, index) => {
          const source = typeof record.toObject === "function" ? record.toObject() : record;
          const elements = [];
          
          // Record header
          elements.push(
            new Paragraph({
              text: `Lần khám ${index + 1}: ${formatDate(source.visitDate)}`,
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 200,
                after: 100
              }
            })
          );
          
          // Separator line
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "─".repeat(30),
                  size: 16,
                  color: "3b82f6"
                })
              ],
              spacing: {
                after: 100
              }
            })
          );
          
          // Hospital & Doctor Info
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Bệnh viện/Phòng khám: ", bold: true }),
                new TextRun({ text: source.hospital || "Không có thông tin" })
              ],
              spacing: {
                after: 50
              }
            })
          );
          
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Bác sĩ: ", bold: true }),
                new TextRun({ text: source.doctorName || "Không có thông tin" })
              ],
              spacing: {
                after: 50
              }
            })
          );
          
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Chuyên khoa: ", bold: true }),
                new TextRun({ text: source.specialty || "Không có thông tin" })
              ],
              spacing: {
                after: 50
              }
            })
          );
          
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Chẩn đoán: ", bold: true }),
                new TextRun({ text: source.diagnosis || "Không có thông tin" })
              ],
              spacing: {
                after: 100
              }
            })
          );
          
          // Summary
          if (source.summary) {
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "Tóm tắt: ", bold: true }),
                  new TextRun({ text: source.summary })
                ],
                spacing: {
                  after: 100
                }
              })
            );
          }
          
          // Symptoms
          if (options.includeSymptoms && source.symptoms && source.symptoms.length > 0) {
            elements.push(
              new Paragraph({
                text: "Triệu chứng:",
                heading: HeadingLevel.HEADING_3,
                spacing: {
                  before: 100,
                  after: 50
                }
              })
            );
            
            source.symptoms.forEach((symptom) => {
              elements.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: "• " }),
                    new TextRun({ text: symptom })
                  ],
                  indentation: {
                    start: 400
                  },
                  spacing: {
                    after: 50
                  }
                })
              );
            });
            
            elements.push(
              new Paragraph({
                spacing: {
                  after: 100
                }
              })
            );
          }
          
          // Recommendations
          if (options.includeRecommendations && source.recommendations && source.recommendations.length > 0) {
            elements.push(
              new Paragraph({
                text: "Lời dặn của bác sĩ:",
                heading: HeadingLevel.HEADING_3,
                spacing: {
                  before: 100,
                  after: 50
                }
              })
            );
            
            source.recommendations.forEach((rec) => {
              elements.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: "• " }),
                    new TextRun({ text: rec })
                  ],
                  indentation: {
                    start: 400
                  },
                  spacing: {
                    after: 50
                  }
                })
              );
            });
            
            elements.push(
              new Paragraph({
                spacing: {
                  after: 100
                }
              })
            );
          }
          
          // Prescriptions
          if (options.includePrescriptions && source.prescriptions && source.prescriptions.length > 0) {
            elements.push(
              new Paragraph({
                text: "Đơn thuốc:",
                heading: HeadingLevel.HEADING_3,
                spacing: {
                  before: 100,
                  after: 50
                }
              })
            );
            
            // Table for prescriptions
            const table = new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Tên thuốc", bold: true })],
                          shading: { fill: "f3f4f6" }
                        })
                      ]
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Liều dùng", bold: true })],
                          shading: { fill: "f3f4f6" }
                        })
                      ]
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Cách dùng", bold: true })],
                          shading: { fill: "f3f4f6" }
                        })
                      ]
                    })
                  ]
                }),
                ...source.prescriptions.map(prescription => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: prescription.medicine || "" })]
                          })
                        ]
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: prescription.dosage || "" })]
                          })
                        ]
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: prescription.usage || "" })]
                          })
                        ]
                      })
                    ]
                  })
                )
              ]
            });
            
            elements.push(
              new Paragraph({
                children: [table],
                spacing: {
                  after: 100
                }
              })
            );
          }
          
          // Files
          if (source.files && source.files.length > 0) {
            elements.push(
              new Paragraph({
                text: "Tệp đính kèm:",
                heading: HeadingLevel.HEADING_3,
                spacing: {
                  before: 100,
                  after: 50
                }
              })
            );
            
            source.files.forEach((file) => {
              elements.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: "• " }),
                    new TextRun({ text: `${file.name} (${file.size})` })
                  ],
                  indentation: {
                    start: 400
                  },
                  spacing: {
                    after: 50
                  }
                })
              );
            });
            
            elements.push(
              new Paragraph({
                spacing: {
                  after: 200
                }
              })
            );
          }
          
          return elements;
        }),
        
        // Footer separator
        new Paragraph({
          children: [
            new TextRun({
              text: "─".repeat(50),
              size: 20,
              color: "e5e7eb"
            })
          ],
          alignment: "center",
          spacing: {
            before: 200,
            after: 100
          }
        }),
        
        // End marker
        new Paragraph({
          text: "--- Hết hồ sơ ---",
          alignment: "center",
          spacing: {
            after: 100
          }
        }),
        
        // Generator info
        new Paragraph({
          text: "Tạo bởi HealthyAI - Hệ thống quản lý sức khỏe điện tử",
          alignment: "center",
          spacing: {
            after: 50
          }
        })
      ]
    }]
  });

  return await Packer.toBuffer(doc);
};

const fileSchema = z.object({
  name: z.string().min(1).max(120),
  size: z.string().min(1).max(30),
  uploadedAtLabel: z.string().max(20).optional().default(""),
});

const prescriptionSchema = z.object({
  medicine: z.string().min(1).max(120),
  dosage: z.string().min(1).max(120),
  usage: z.string().min(1).max(120),
});

const createRecordSchema = z.object({
  visitDate: z.string().datetime(),
  hospital: z.string().min(2).max(120),
  doctorName: z.string().min(2).max(120),
  specialty: z.string().min(2).max(80),
  diagnosis: z.string().min(2).max(240),
  summary: z.string().max(600).optional().default(""),
  symptoms: z.array(z.string().min(1).max(160)).optional().default([]),
  recommendations: z.array(z.string().min(1).max(160)).optional().default([]),
  files: z.array(fileSchema).optional().default([]),
  prescriptions: z.array(prescriptionSchema).optional().default([]),
});

const buildDefaultRecords = (userId) => [
  {
    user: userId,
    visitDate: new Date("2023-10-15T09:00:00.000Z"),
    hospital: "Bệnh viện Vinmec Đà Nẵng",
    doctorName: "BS. Trần Hoàng Nam",
    specialty: "Nội khoa",
    diagnosis: "Viêm họng cấp tính",
    summary: "Viêm họng cấp tính do vi khuẩn.",
    symptoms: ["Đau họng, khó nuốt kéo dài 3 ngày", "Sốt nhẹ 38°C", "Amidan sưng đỏ"],
    recommendations: ["Nghỉ ngơi tại chỗ", "Súc miệng nước muối thường xuyên", "Tránh đồ lạnh"],
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
    user: userId,
    visitDate: new Date("2023-08-28T09:00:00.000Z"),
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

router.use(authRequired);

router.get("/me", async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (useMemoryAuth) {
      return res.json({ records: listRecords(userId) });
    }

    let records = await MedicalRecord.find({ user: userId }).sort({ visitDate: -1 });

    if (records.length === 0) {
      await MedicalRecord.insertMany(buildDefaultRecords(userId));
      records = await MedicalRecord.find({ user: userId }).sort({ visitDate: -1 });
    }

    return res.json({ records });
  } catch (error) {
    return next(error);
  }
});

router.post("/", validateBody(createRecordSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const payload = req.body;

    if (useMemoryAuth) {
      const record = createRecord(userId, payload);
      return res.status(201).json({ record });
    }

    const record = await MedicalRecord.create({
      user: userId,
      visitDate: new Date(payload.visitDate),
      hospital: payload.hospital,
      doctorName: payload.doctorName,
      specialty: payload.specialty,
      diagnosis: payload.diagnosis,
      summary: payload.summary || payload.diagnosis,
      symptoms: payload.symptoms || [],
      recommendations: payload.recommendations || [],
      files: payload.files || [],
      prescriptions: payload.prescriptions || [],
    });

    return res.status(201).json({ record });
  } catch (error) {
    return next(error);
  }
});

router.get("/export", async (req, res, next) => {
  try {
    const format = String(req.query.format || "json").toLowerCase();
    const userId = req.user.userId;
    const includeSymptoms = parseBoolean(req.query.includeSymptoms, true);
    const includeRecommendations = parseBoolean(req.query.includeRecommendations, true);
    const includePrescriptions = parseBoolean(req.query.includePrescriptions, true);

    const recordsSource = useMemoryAuth
      ? listRecords(userId)
      : await MedicalRecord.find({ user: userId }).sort({ visitDate: -1 });
    const records = filterRecords(recordsSource, req.query);
    
    // Apply limit to prevent slow PDF generation with large datasets
    const limit = parseInt(req.query.limit, 10) || 50;
    const limitedRecords = records.slice(0, limit);
    
    const exportOptions = {
      includeSymptoms,
      includeRecommendations,
      includePrescriptions,
    };

     // Handle PDF export
     if (format === "pdf") {
       try {
         const pdfBuffer = await generatePdf(limitedRecords, exportOptions);
         res.setHeader("Content-Type", "application/pdf");
         res.setHeader(
           "Content-Disposition",
           `attachment; filename="ho-so-benh-an-${Date.now()}.pdf"`
         );
         return res.send(pdfBuffer);
       } catch (pdfError) {
         console.error("PDF generation error:", pdfError);
         return res.status(500).json({ message: "Không thể tạo file PDF" });
       }
     }

     // Handle DOCX export
     if (format === "docx") {
       try {
         const docxBuffer = await generateDocx(limitedRecords, exportOptions);
         res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
         res.setHeader(
           "Content-Disposition",
           `attachment; filename="ho-so-benh-an-${Date.now()}.docx"`
         );
         return res.send(docxBuffer);
       } catch (docxError) {
         console.error("DOCX generation error:", docxError);
         return res.status(500).json({ message: "Không thể tạo file Word" });
       }
     }

     if (format === "csv") {
       const csv = recordsToCsv(limitedRecords, exportOptions);
       res.setHeader("Content-Type", "text/csv; charset=utf-8");
       res.setHeader(
         "Content-Disposition",
         `attachment; filename="medical-records-${Date.now()}.csv"`
       );
       return res.send(csv);
     }

     res.setHeader("Content-Type", "application/json; charset=utf-8");
     res.setHeader(
       "Content-Disposition",
       `attachment; filename="medical-records-${Date.now()}.json"`
     );

    const jsonRecords = limitedRecords.map((record) => {
      const source = typeof record.toObject === "function" ? record.toObject() : record;
      const item = { ...source };
      if (!includeSymptoms) delete item.symptoms;
      if (!includeRecommendations) delete item.recommendations;
      if (!includePrescriptions) delete item.prescriptions;
      return item;
    });

    return res.send(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          filters: {
            timeFilter: req.query.timeFilter || "all",
            specialty: req.query.specialty || "",
            fromDate: req.query.fromDate || "",
            toDate: req.query.toDate || "",
          },
          records: jsonRecords,
        },
        null,
        2
      )
    );
  } catch (error) {
    return next(error);
  }
});

export default router;

// API endpoint for medication suggestions
router.get("/medication-suggestions", async (req, res, next) => {
  try {
    const { symptoms, diagnosis } = req.query;
    
    if (!symptoms && !diagnosis) {
      return res.status(400).json({ 
        message: "Cần cung cấp triệu chứng hoặc chẩn đoán để được gợi ý thuốc." 
      });
    }
    
    const result = getMedicationSuggestions(symptoms, diagnosis);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// API endpoint for disease-specific drug recommendations
router.get("/drugs-by-disease", async (req, res, next) => {
  try {
    const { disease } = req.query;
    
    if (!disease) {
      return res.status(400).json({ 
        message: "Cần cung cấp tên bệnh để được gợi ý thuốc." 
      });
    }
    
    const result = getDrugsByDisease(disease);
    
    if (!result) {
      // Nếu không tìm thấy theo bệnh cụ thể, thử tìm theo triệu chứng
      const symptomResults = getMedicationBySymptoms(disease);
      if (symptomResults && symptomResults.length > 0) {
        return res.json({
          type: "symptom-based",
          results: symptomResults
        });
      }
      return res.status(404).json({ 
        message: "Chưa có gợi ý thuốc cho bệnh này. Vui lòng tham khảo ý kiến bác sĩ." 
      });
    }
    
    return res.json({
      type: "disease-specific",
      disease,
      ...result
    });
  } catch (error) {
    return next(error);
  }
});

// API endpoint for drug recommendations by symptoms (extended version)
router.get("/drugs-by-symptoms", async (req, res, next) => {
  try {
    const { symptoms } = req.query;
    
    if (!symptoms) {
      return res.status(400).json({ 
        message: "Cần cung cấp triệu chứng để được gợi ý thuốc." 
      });
    }
    
    const results = getMedicationBySymptoms(symptoms);
    
    if (!results || results.length === 0) {
      return res.status(404).json({ 
        message: "Chưa tìm thấy gợi ý thuốc phù hợp với triệu chứng." 
      });
    }
    
    return res.json({
      type: "symptom-based",
      results
    });
  } catch (error) {
    return next(error);
  }
});
