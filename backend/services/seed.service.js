import { Service } from "../models/Service.js";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import { doctorCatalog } from "../data/doctorCatalog.js";

const defaultServices = [
  {
    title: "AI Health Screening",
    description:
      "Sàng lọc triệu chứng ban đầu bằng AI, đưa ra gợi ý chăm sóc và mức độ ưu tiên khám.",
    durationMinutes: 30,
    price: 199000,
    icon: "Stethoscope",
  },
  {
    title: "Nutrition Consultation",
    description:
      "Tư vấn dinh dưỡng cá nhân hóa theo mục tiêu giảm cân, tăng cơ hoặc kiểm soát đường huyết.",
    durationMinutes: 45,
    price: 349000,
    icon: "Apple",
  },
  {
    title: "Mental Wellness Session",
    description:
      "Hỗ trợ sức khỏe tinh thần với chuyên gia, theo dõi stress và thói quen ngủ.",
    durationMinutes: 50,
    price: 399000,
    icon: "Brain",
  },
  {
    title: "General Consultation",
    description:
      "Khám tổng quát với bác sĩ để tư vấn lộ trình điều trị và theo dõi sức khỏe.",
    durationMinutes: 30,
    price: 500000,
    icon: "Stethoscope",
  },
];

const seedServicesIfNeeded = async () => {
  try {
    const count = await Service.countDocuments();
    console.log("Current services count:", count);
    if (count === 0) {
      await Service.insertMany(defaultServices);
      console.log("Default services seeded");
    }
  } catch (error) {
    console.error("Error seeding services:", error.message);
  }
};

const seedDoctorsIfNeeded = async () => {
  let added = 0;
  let updated = 0;
  for (const doctor of doctorCatalog) {
    const exists = await Doctor.findOne({
      fullName: doctor.fullName,
      hospital: doctor.hospital,
    });
    if (!exists) {
      await Doctor.create(doctor);
      added += 1;
      continue;
    }

    const needsUpdate =
      !exists.avatarUrl ||
      exists.avatarUrl !== doctor.avatarUrl ||
      exists.avatarColor !== doctor.avatarColor ||
      exists.specialty !== doctor.specialty ||
      exists.title !== doctor.title ||
      exists.hospital !== doctor.hospital ||
      exists.bio !== doctor.bio ||
      Number(exists.experienceYears) !== Number(doctor.experienceYears) ||
      Number(exists.rating) !== Number(doctor.rating);

    if (needsUpdate) {
      exists.title = doctor.title;
      exists.specialty = doctor.specialty;
      exists.experienceYears = doctor.experienceYears;
      exists.rating = doctor.rating;
      exists.bio = doctor.bio;
      exists.avatarColor = doctor.avatarColor;
      exists.avatarUrl = doctor.avatarUrl || exists.avatarUrl || "";
      exists.timeSlots = doctor.timeSlots;
      await exists.save();
      updated += 1;
    }
  }
  if (added > 0) {
    console.log(`Default doctors seeded: +${added}`);
  }
  if (updated > 0) {
    console.log(`Default doctors updated: ${updated}`);
  }
};

const seedAdminIfNeeded = async () => {
  try {
    const adminEmail = "admin@booking.com";
    
    // Delete ALL admin accounts first (both old and new email)
    const deleted = await User.deleteMany({ email: { $in: [adminEmail, "admin@healthyai.vn"] } });
    console.log("Deleted admin accounts:", deleted.deletedCount);
    
    // Create fresh admin account
    const admin = await User.create({
      fullName: "Admin",
      email: adminEmail,
      password: "12345sau",
      role: "admin",
    });
    console.log("Admin created with ID:", admin._id);
    console.log("Admin account recreated with new credentials");
  } catch (error) {
    console.error("Error seeding admin:", error.message);
  }
};

export const runSeeders = async () => {
  await seedServicesIfNeeded();
  await seedDoctorsIfNeeded();
  await seedAdminIfNeeded();
};
