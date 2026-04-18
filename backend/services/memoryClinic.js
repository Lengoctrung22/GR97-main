import { doctorCatalog, hospitalCatalog } from "../data/doctorCatalog.js";

const defaultDoctors = doctorCatalog.map((doctor, index) => ({
  _id: `doc_${index + 1}`,
  ...doctor,
}));

const defaultHealthMetrics = {
  heartRate: 72,
  bloodPressure: "120/80",
  glucose: "5.6",
  glucoseStatus: "Bình thường",
};

const doctors = [...defaultDoctors];
export const appointments = [];
const metricsByUser = new Map();
let appointmentCounter = 1;
let doctorCounter = doctors.length + 1;

const normalize = (value) => (value || "").toString().trim().toLowerCase();

const computeGlucoseStatus = (value) => {
  if (value < 3.9) return "Thấp";
  if (value <= 7.8) return "Binh thuong";
  return "Can theo doi";
};

export const getHealthMetrics = (userId) =>
  metricsByUser.get(userId) || defaultHealthMetrics;

export const updateHealthMetrics = (userId, payload) => {
  const heartRate = Number(payload.heartRate);
  const glucose = Number(payload.glucose);
  const bloodPressure = payload.bloodPressure?.trim() || defaultHealthMetrics.bloodPressure;
  const safeGlucose = Number.isFinite(glucose) ? glucose : Number(defaultHealthMetrics.glucose);

  const next = {
    heartRate: Number.isFinite(heartRate) ? heartRate : defaultHealthMetrics.heartRate,
    bloodPressure,
    glucose: safeGlucose.toFixed(1),
    glucoseStatus: computeGlucoseStatus(safeGlucose),
  };
  metricsByUser.set(userId, next);
  return next;
};

export const getDoctors = ({ q = "", specialty = "", hospital = "", minRating = "" } = {}) => {
  const keyword = normalize(q);
  const specialtyFilter = normalize(specialty);
  const hospitalFilter = normalize(hospital);
  const min = Number(minRating) || 0;

  return doctors
    .filter((doctor) => {
      if (keyword) {
        const text = `${doctor.fullName} ${doctor.specialty} ${doctor.hospital}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      if (specialtyFilter && !normalize(doctor.specialty).includes(specialtyFilter)) return false;
      if (hospitalFilter && !normalize(doctor.hospital).includes(hospitalFilter)) return false;
      if (min && Number(doctor.rating) < min) return false;
      return true;
    })
    .sort((a, b) => b.rating - a.rating);
};

export const findDoctorById = (id) => doctors.find((doctor) => doctor._id === id) || null;
export const listHospitals = () => [...hospitalCatalog];

export const listAppointmentsByUser = (userId) =>
  appointments
    .filter((item) => item.user === userId)
    .sort((a, b) => new Date(b.appointmentAt) - new Date(a.appointmentAt))
    .map((item) => ({ ...item }));

const normalizeAdminAppointment = (item) => {
  const doctorId =
    typeof item.doctor === "string"
      ? item.doctor
      : item.doctor?._id || item.doctor?.id || null;
  const doctor = doctorId ? findDoctorById(doctorId) : null;

  return {
    ...item,
    user:
      typeof item.user === "string"
        ? { _id: item.user, fullName: `Khách hàng ${item.user}` }
        : item.user,
    doctor: doctor
      ? {
          _id: doctor._id,
          fullName: doctor.fullName,
          specialty: doctor.specialty,
        }
      : item.doctor || null,
  };
};

export const adminListDoctors = () => doctors.map((item) => ({ ...item }));

// Find doctor by account credentials (email / username / phone)
export const findDoctorByCredential = (identifier) => {
  const id = (identifier || "").trim().toLowerCase();
  return doctors.find((d) => {
    const acc = d.account || {};
    return (
      (acc.email || "").toLowerCase() === id ||
      (acc.username || "").toLowerCase() === id ||
      (acc.phone || "").trim() === id
    );
  }) || null;
};

// List appointments for a specific doctor
export const listDoctorAppointments = ({ doctorId, status } = {}) => {
  return appointments.filter((item) => {
    const itemDoctorId = typeof item.doctor === "string" ? item.doctor : item.doctor?._id || "";
    if (itemDoctorId !== doctorId) return false;
    if (status && item.status !== status) return false;
    return true;
  }).map((item) => ({ ...item }));
};

// Update appointment status (by doctor)
export const doctorUpdateAppointmentStatus = ({ appointmentId, doctorId, status }) => {
  const appointment = appointments.find((item) => {
    const itemDoctorId = typeof item.doctor === "string" ? item.doctor : item.doctor?._id || "";
    return item._id === appointmentId && itemDoctorId === doctorId;
  });
  if (!appointment) return { error: "Appointment not found", status: 404 };
  if (appointment.status === "completed" || appointment.status === "cancelled") {
    return { error: "Cannot update a completed or cancelled appointment", status: 400 };
  }
  appointment.status = status;
  return { appointment: { ...appointment } };
};

export const adminGetDoctorById = (doctorId) => {
  const doctor = findDoctorById(doctorId);
  return doctor ? { ...doctor } : null;
};

export const adminCreateDoctor = (payload) => {
  const doctor = {
    _id: `doc_${doctorCounter++}`,
    fullName: payload.fullName,
    title: payload.title,
    specialty: payload.specialty,
    hospital: payload.hospital,
    experienceYears: payload.experienceYears ?? 5,
    rating: payload.rating ?? 4.7,
    bio: payload.bio || "",
    avatarColor: payload.avatarColor || "#2b7edb",
    avatarUrl: payload.avatarUrl || "",
    timeSlots: payload.timeSlots?.length ? payload.timeSlots : ["08:00", "09:30", "14:00"],
    account: {
      username: payload.account?.username || "",
      email: payload.account?.email || "",
      phone: payload.account?.phone || "",
      tempPassword: payload.account?.tempPassword || "",
      isActive: payload.account?.isActive ?? true,
      updatedAt: new Date().toISOString(),
    },
    isAvailable: true,
  };
  doctors.unshift(doctor);
  return { ...doctor };
};

export const adminUpdateDoctorAccount = ({ doctorId, account }) => {
  const doctor = findDoctorById(doctorId);
  if (!doctor) return { error: "Doctor not found", status: 404 };

  const current = doctor.account || {};
  doctor.account = {
    username: account.username ?? current.username ?? "",
    email: account.email ?? current.email ?? "",
    phone: account.phone ?? current.phone ?? "",
    tempPassword: account.tempPassword ?? current.tempPassword ?? "",
    isActive: account.isActive ?? current.isActive ?? true,
    updatedAt: new Date().toISOString(),
  };

  return {
    account: { ...doctor.account },
  };
};

export const adminListAppointments = ({
  status = "",
  q = "",
  doctorId = "",
  dateFrom = "",
  dateTo = "",
} = {}) => {
  const keyword = normalize(q);
  const fromDate = dateFrom ? new Date(dateFrom) : null;
  const toDate = dateTo ? new Date(dateTo) : null;

  return appointments
    .filter((item) => {
      if (status && item.status !== status) return false;

      const itemDoctorId =
        typeof item.doctor === "string" ? item.doctor : item.doctor?._id || "";
      if (doctorId && itemDoctorId !== doctorId) return false;

      const apptDate = new Date(item.appointmentAt);
      if (fromDate && apptDate < fromDate) return false;
      if (toDate && apptDate > toDate) return false;

      if (keyword) {
        const text = `${item.bookingCode || ""} ${item.doctorName || ""} ${item.hospital || ""}`;
        if (!normalize(text).includes(keyword)) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.appointmentAt) - new Date(a.appointmentAt))
    .map(normalizeAdminAppointment);
};

export const adminUpdateAppointmentStatus = ({ appointmentId, status }) => {
  const appointment = appointments.find((item) => item._id === appointmentId);
  if (!appointment) return { error: "Appointment not found", status: 404 };

  appointment.status = status;
  if (status === "confirmed" && appointment.paymentStatus === "pending") {
    appointment.paymentStatus = "paid";
  }

  return { appointment: normalizeAdminAppointment(appointment) };
};

export const adminGetDoctorStats = (doctorId) => {
  const doctorAppointments = appointments.filter((item) => {
    const itemDoctorId =
      typeof item.doctor === "string" ? item.doctor : item.doctor?._id || "";
    return itemDoctorId === doctorId;
  });

  const totalAppointments = doctorAppointments.length;
  const completedCount = doctorAppointments.filter((item) => item.status === "completed").length;

  return {
    totalAppointments,
    completedCount,
    completionRate: totalAppointments ? Math.round((completedCount / totalAppointments) * 100) : 0,
  };
};

export const createDoctorBooking = ({ userId, doctorId, slotLabel, appointmentAt, notes }) => {
  const doctor = findDoctorById(doctorId);
  if (!doctor) return { error: "Doctor not found", status: 404 };

  if (!doctor.timeSlots.includes(slotLabel)) {
    return { error: "Selected timeslot is not available", status: 400 };
  }

  const date = new Date(appointmentAt);
  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    return { error: "appointmentAt must be in the future", status: 400 };
  }

  const bookingCode = `HC-${String(Date.now()).slice(-6)}`;
  const appointment = {
    _id: `appt_${appointmentCounter++}`,
    user: userId,
    service: {
      _id: "service_gc",
      title: "General Consultation",
      price: 500000,
    },
    doctor: {
      _id: doctor._id,
      fullName: doctor.fullName,
      specialty: doctor.specialty,
    },
    doctorName: doctor.fullName,
    hospital: doctor.hospital,
    slotLabel,
    appointmentAt: date.toISOString(),
    notes: notes || "",
    amount: 500000,
    bookingCode,
    paymentStatus: "pending",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  appointments.push(appointment);
  return {
    appointment: { ...appointment },
    payment: {
      bookingCode,
      amount: appointment.amount,
      qrData: `PAY|${bookingCode}|${appointment.amount}`,
    },
  };
};

export const markBookingPaid = ({ userId, bookingId }) => {
  const appointment = appointments.find((item) => item._id === bookingId && item.user === userId);
  if (!appointment) return { error: "Appointment not found", status: 404 };

  appointment.paymentStatus = "paid";
  appointment.status = "confirmed";
  return { appointment: { ...appointment } };
};

export const adminDeleteDoctor = (doctorId) => {
  const index = doctors.findIndex((d) => d._id === doctorId);
  if (index === -1) return { error: "Doctor not found", status: 404 };
  
  const deleted = doctors.splice(index, 1)[0];
  return { doctor: deleted };
};

export const adminDeleteDoctorAccount = (doctorId) => {
  const doctor = findDoctorById(doctorId);
  if (!doctor) return { error: "Doctor not found", status: 404 };
  
  doctor.account = {
    username: "",
    email: "",
    phone: "",
    tempPassword: "",
    isActive: false,
    updatedAt: new Date().toISOString(),
  };
  
  return { account: doctor.account };
};

export const cancelBooking = ({ userId, bookingId }) => {
  const appointment = appointments.find((item) => item._id === bookingId && item.user === userId);
  if (!appointment) return { error: "Appointment not found", status: 404 };

  if (appointment.status === "completed") {
    return { error: "Completed appointment cannot be cancelled", status: 400 };
  }

  appointment.status = "cancelled";
  return { appointment: { ...appointment } };
};

export const getUserDashboard = (userId) => {
  const userAppointments = listAppointmentsByUser(userId);
  const now = new Date();

  const upcomingItems = userAppointments.filter(
    (item) =>
      new Date(item.appointmentAt) > now &&
      ["pending", "confirmed"].includes(item.status)
  );

  const upcomingAppointment = [...upcomingItems].sort(
    (a, b) => new Date(a.appointmentAt) - new Date(b.appointmentAt)
  )[0];

  return {
    stats: {
      appointmentsCount: userAppointments.length,
      upcomingCount: upcomingItems.length,
      chatCount: 0,
    },
    upcomingAppointment: upcomingAppointment || null,
    healthMetrics: getHealthMetrics(userId),
  };
};
