import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { isDatabaseConnected } from "../config/db.js";
import { createLocalUser, findLocalUserByEmail, findLocalUserByPhone, updateLocalUser } from "../utils/localPersistence.js";
import { ensureConfiguredAdminAccount } from "../utils/adminBootstrap.js";

const otpStore = new Map();
const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

const normalizePhone = (phone = "") => phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();
const isValidPhone = (phone) => /^\+?\d{10,15}$/.test(phone);
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const toSmsPhone = (phone = "") => normalizePhone(phone).replace(/[^\d]/g, "");
const maskPhone = (phone = "") => {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length <= 4) {
    return normalizedPhone;
  }
  return `${"*".repeat(Math.max(normalizedPhone.length - 4, 0))}${normalizedPhone.slice(-4)}`;
};

const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  return isDatabaseConnected() ? User.findOne({ email: normalizedEmail }) : findLocalUserByEmail(normalizedEmail);
};

const getOtpRecord = (phone) => {
  const normalizedPhone = normalizePhone(phone);
  return normalizedPhone ? otpStore.get(normalizedPhone) : null;
};

const createOtpRecord = (phone) => {
  const normalizedPhone = normalizePhone(phone);
  const code = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  otpStore.set(normalizedPhone, { code, expiresAt, verified: false });
  console.log(`OTP for ${normalizedPhone}: ${code}`);
  return { code, expiresAt, phone: normalizedPhone };
};

const sendOtpViaFast2Sms = async (phone, code) => {
  const apiKey = String(process.env.SMS_API_KEY || "").trim();
  if (!apiKey) {
    return { skipped: true, reason: "SMS_API_KEY is not configured" };
  }

  const smsPhone = toSmsPhone(phone);
  const params = new URLSearchParams({
    authorization: apiKey,
    route: "otp",
    variables_values: String(code || "").trim(),
    numbers: smsPhone
  });

  const response = await fetch(`${FAST2SMS_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || "SMS gateway request failed";
    throw new Error(message);
  }

  if (payload?.return === false) {
    throw new Error(payload?.message || "SMS gateway rejected the OTP request");
  }

  return { skipped: false, payload };
};

export const sendOtp = async (req, res) => {
  const rawPhone = req.body?.phone || "";
  const phone = normalizePhone(rawPhone);

  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: "Valid phone number is required" });
  }

  const { code } = createOtpRecord(phone);
  const smsResult = await sendOtpViaFast2Sms(phone, code);

  const response = { message: "OTP sent", phone };
  if (process.env.NODE_ENV !== "production") {
    response.devCode = code;
  }
  if (smsResult.skipped && process.env.NODE_ENV !== "production") {
    response.smsMode = "skipped";
    response.smsReason = smsResult.reason;
  }

  res.json(response);
};

export const verifyOtp = async (req, res) => {
  const rawPhone = req.body?.phone || "";
  const phone = normalizePhone(rawPhone);
  const code = String(req.body?.code || "").trim();

  if (!isValidPhone(phone) || !code) {
    return res.status(400).json({ message: "Phone and OTP code are required" });
  }

  const record = getOtpRecord(phone);
  if (!record) {
    return res.status(400).json({ message: "OTP not found. Please request again." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ message: "OTP expired. Please request again." });
  }

  if (record.code !== code) {
    return res.status(400).json({ message: "Invalid OTP code" });
  }

  otpStore.set(phone, { ...record, verified: true });

  res.json({ message: "Phone verified" });
};

export const signup = async (req, res) => {
  const { name, email, password, role, phone, otpCode } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || "").trim();
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedName || !normalizedEmail || !password || !normalizedPhone || !otpCode) {
    return res.status(400).json({ message: "All fields including phone and OTP are required" });
  }

  if (!isValidPhone(normalizedPhone)) {
    return res.status(400).json({ message: "Enter a valid phone number" });
  }

  const otpRecord = otpStore.get(normalizedPhone);
  if (!otpRecord || !otpRecord.verified || otpRecord.code !== String(otpCode).trim()) {
    return res.status(400).json({ message: "Phone verification is required" });
  }

  if (Date.now() > otpRecord.expiresAt) {
    otpStore.delete(normalizedPhone);
    return res.status(400).json({ message: "OTP expired. Please verify again." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let user;

  if (isDatabaseConnected()) {
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
    if (existing) {
      return res.status(400).json({ message: "Email or phone already in use" });
    }

    user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "student",
      phoneVerified: true,
      phoneVerifiedAt: new Date()
    });
  } else {
    const existing = findLocalUserByEmail(normalizedEmail) || findLocalUserByPhone(normalizedPhone);
    if (existing) {
      return res.status(400).json({ message: "Email or phone already in use" });
    }

    user = createLocalUser({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: role === "admin" ? "admin" : "student",
      phoneVerified: true,
      phoneVerifiedAt: new Date().toISOString()
    });
  }

  otpStore.delete(normalizedPhone);

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || normalizedPhone,
      role: user.role
    }
  });
};

export const login = async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    await ensureConfiguredAdminAccount();
  } catch (error) {
    console.warn("[Auth] admin bootstrap skipped:", error.message);
  }

  const user = isDatabaseConnected() ? await User.findOne({ email: normalizedEmail }) : findLocalUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user._id, user.role);

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
};

export const forgotPassword = async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    await ensureConfiguredAdminAccount();
  } catch (error) {
    console.warn("[Auth] admin bootstrap skipped during password reset:", error.message);
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(404).json({ message: "Account not found for this email." });
  }

  const phone = normalizePhone(user.phone);
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: "No verified phone number is linked to this account." });
  }

  const { code } = createOtpRecord(phone);
  const smsResult = await sendOtpViaFast2Sms(phone, code);
  const response = {
    message: "OTP sent to your registered phone number.",
    phone,
    maskedPhone: maskPhone(phone)
  };

  if (process.env.NODE_ENV !== "production") {
    response.devCode = code;
  }
  if (smsResult.skipped && process.env.NODE_ENV !== "production") {
    response.smsMode = "skipped";
    response.smsReason = smsResult.reason;
  }

  res.json(response);
};

export const resetPassword = async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  const otpCode = String(req.body?.otpCode || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (!normalizedEmail || !otpCode || !newPassword) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters long" });
  }

  try {
    await ensureConfiguredAdminAccount();
  } catch (error) {
    console.warn("[Auth] admin bootstrap skipped during password update:", error.message);
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(404).json({ message: "Account not found for this email." });
  }

  const phone = normalizePhone(user.phone);
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: "No verified phone number is linked to this account." });
  }

  const record = getOtpRecord(phone);
  if (!record) {
    return res.status(400).json({ message: "OTP not found. Please request a new code." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ message: "OTP expired. Please request a new code." });
  }

  if (record.code !== otpCode) {
    return res.status(400).json({ message: "Invalid OTP code" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (isDatabaseConnected()) {
    user.password = hashedPassword;
    user.phoneVerified = true;
    user.phoneVerifiedAt = user.phoneVerifiedAt || new Date();
    await user.save();
  } else {
    const updatedUser = updateLocalUser(user._id, {
      password: hashedPassword,
      phoneVerified: true,
      phoneVerifiedAt: user.phoneVerifiedAt || new Date().toISOString()
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
  }

  otpStore.delete(phone);

  res.json({ message: "Password reset successful. Please login." });
};

export const profile = async (req, res) => {
  res.json(req.user);
};

export const updateProfile = async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  let user = req.user;
  const normalizedEmail = email ? normalizeEmail(email) : "";
  const normalizedName = name ? String(name).trim() : "";

  if (isDatabaseConnected()) {
    user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (normalizedEmail && normalizedEmail !== user.email) {
      const exists = await User.findOne({ email: normalizedEmail });
      if (exists && String(exists._id) !== String(user._id)) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = normalizedEmail;
    }

    if (normalizedName) {
      user.name = normalizedName;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
  } else {
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
    }

    user = updateLocalUser(req.user._id, {
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(newPassword ? { password: await bcrypt.hash(newPassword, 10) } : {})
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
  }

  res.json({
    message: "Profile updated successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
};
