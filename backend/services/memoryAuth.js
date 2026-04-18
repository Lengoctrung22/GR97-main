import bcrypt from "bcryptjs";

const users = [];
let counter = 1;

const defaultNotificationPrefs = {
  appointmentReminders: true,
  labResults: true,
  healthNews: false,
};

const defaultPrivacyPrefs = {
  shareRecords: true,
  hideContactInDocs: true,
};

const normalize = (value) => (value ? value.toLowerCase().trim() : "");

const seedMemoryUsers = () => {
  const defaults = [
    {
      fullName: "Admin",
      email: "admin@booking.com",
      phone: "0900000001",
      role: "admin",
      password: "12345sau",
    },
    {
      fullName: "Le Duc Vinh",
      email: "leducvinh188@gmail.com",
      phone: "0901234567",
      role: "customer",
      password: "123456Aa!",
    },
  ];

  defaults.forEach((item) => {
    const exists = users.find((user) => normalize(user.email) === normalize(item.email));
    if (exists) return;
    users.push({
      _id: String(counter++),
      fullName: item.fullName,
      email: item.email.toLowerCase(),
      phone: item.phone,
      role: item.role,
      birthDate: null,
      citizenId: "",
      passwordHash: bcrypt.hashSync(item.password, 10),
      notificationPrefs: { ...defaultNotificationPrefs },
      privacyPrefs: { ...defaultPrivacyPrefs },
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  });
};

const ensurePrefs = (user) => {
  user.notificationPrefs = {
    ...defaultNotificationPrefs,
    ...(user.notificationPrefs || {}),
  };
  user.privacyPrefs = {
    ...defaultPrivacyPrefs,
    ...(user.privacyPrefs || {}),
  };
  return user;
};

export const findByEmail = (email) => {
  const normalized = normalize(email);
  return users.find((u) => normalize(u.email) === normalized) || null;
};

export const findByPhone = (phone) => {
  const normalized = normalize(phone);
  return users.find((u) => normalize(u.phone) === normalized) || null;
};

export const findByCitizenId = (citizenId) => {
  const normalized = normalize(citizenId);
  return users.find((u) => normalize(u.citizenId) === normalized) || null;
};

export const findByIdentifier = (identifier) => {
  const normalized = normalize(identifier);
  if (normalized.includes("@")) {
    return findByEmail(normalized);
  }
  return findByPhone(identifier);
};

export const findById = (id) => users.find((u) => u._id === id) || null;

export const createUser = async ({
  fullName,
  email,
  password,
  phone,
  birthDate,
  citizenId,
  role = "customer",
}) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    _id: String(counter++),
    fullName,
    email,
    phone,
    role,
    birthDate,
    citizenId,
    passwordHash,
    notificationPrefs: { ...defaultNotificationPrefs },
    privacyPrefs: { ...defaultPrivacyPrefs },
    resetPasswordToken: null,
    resetPasswordExpires: null,
  };
  users.push(user);
  return user;
};

export const comparePassword = (user, password) => {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
};

export const mapUserResponse = (user) => {
  ensurePrefs(user);
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    notificationPrefs: user.notificationPrefs,
    privacyPrefs: user.privacyPrefs,
  };
};

export const getUserSettings = (userId) => {
  const user = findById(userId);
  if (!user) return null;
  ensurePrefs(user);
  return {
    profile: mapUserResponse(user),
    notifications: user.notificationPrefs,
    privacy: user.privacyPrefs,
  };
};

export const updateUserProfile = ({ userId, fullName, email, phone }) => {
  const user = findById(userId);
  if (!user) return { error: "User not found", status: 404 };

  const normalizedEmail = normalize(email);
  const normalizedPhone = normalize(phone);

  const emailOwner = users.find((item) => normalize(item.email) === normalizedEmail);
  if (emailOwner && emailOwner._id !== user._id) {
    return { error: "Email already exists", status: 409 };
  }

  const phoneOwner = users.find((item) => normalize(item.phone) === normalizedPhone);
  if (phoneOwner && phoneOwner._id !== user._id) {
    return { error: "Phone already exists", status: 409 };
  }

  user.fullName = fullName;
  user.email = email.trim().toLowerCase();
  user.phone = phone.trim();

  return { user: mapUserResponse(user) };
};

export const updateUserPassword = async ({ userId, currentPassword, newPassword }) => {
  const user = findById(userId);
  if (!user) return { error: "User not found", status: 404 };

  const isValid = await comparePassword(user, currentPassword);
  if (!isValid) return { error: "Current password is incorrect", status: 400 };

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  return { success: true };
};

export const updateUserPreferences = ({ userId, notifications, privacy }) => {
  const user = findById(userId);
  if (!user) return { error: "User not found", status: 404 };

  ensurePrefs(user);

  if (notifications) {
    user.notificationPrefs = { ...user.notificationPrefs, ...notifications };
  }

  if (privacy) {
    user.privacyPrefs = { ...user.privacyPrefs, ...privacy };
  }

  return {
    notifications: user.notificationPrefs,
    privacy: user.privacyPrefs,
  };
};

export const generatePasswordResetToken = (email) => {
  const user = findByEmail(email);
  if (!user) return null;
  
  // Generate a simple token (in production, use crypto.randomBytes)
  const token = Buffer.from(`${user._id}:${Date.now()}:${Math.random()}`).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  user.resetPasswordToken = token;
  user.resetPasswordExpires = expires;
  
  return { token, expires, user };
};

export const findUserByResetToken = (token) => {
  const user = users.find(u => u.resetPasswordToken === token && u.resetPasswordExpires > new Date());
  return user || null;
};

export const resetUserPassword = async (token, newPassword) => {
  const user = findUserByResetToken(token);
  if (!user) return { error: "Invalid or expired reset token", status: 400 };
  
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  
  return { success: true };
};

export const clearResetToken = (email) => {
  const user = findByEmail(email);
  if (user) {
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
  }
};

seedMemoryUsers();
