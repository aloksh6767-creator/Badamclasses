import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { isDatabaseConnected } from "../config/db.js";
import { ensureLocalAdminAccount } from "./localPersistence.js";

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const normalizeText = (value = "") => String(value || "").trim();

const getConfiguredAdmin = () => {
  const email = normalizeEmail(process.env.LOCAL_ADMIN_EMAIL);
  const password = normalizeText(process.env.LOCAL_ADMIN_PASSWORD);

  if (!email || !password) {
    return null;
  }

  return {
    email,
    password,
    name: normalizeText(process.env.LOCAL_ADMIN_NAME) || "Admin",
    phone: normalizeText(process.env.LOCAL_ADMIN_PHONE),
    role: "admin"
  };
};

export const ensureConfiguredAdminAccount = async () => {
  const configuredAdmin = getConfiguredAdmin();
  if (!configuredAdmin) {
    return null;
  }

  if (!isDatabaseConnected()) {
    return ensureLocalAdminAccount();
  }

  const existingUser = await User.findOne({ email: configuredAdmin.email });
  if (!existingUser) {
    const createdUser = await User.create({
      name: configuredAdmin.name,
      email: configuredAdmin.email,
      password: await bcrypt.hash(configuredAdmin.password, 10),
      role: "admin",
      phone: configuredAdmin.phone,
      phoneVerified: Boolean(configuredAdmin.phone),
      phoneVerifiedAt: configuredAdmin.phone ? new Date() : null
    });
    return createdUser;
  }

  let changed = false;

  if (existingUser.role !== "admin") {
    existingUser.role = "admin";
    changed = true;
  }

  if (!existingUser.name && configuredAdmin.name) {
    existingUser.name = configuredAdmin.name;
    changed = true;
  }

  if (!existingUser.phone && configuredAdmin.phone) {
    existingUser.phone = configuredAdmin.phone;
    existingUser.phoneVerified = true;
    existingUser.phoneVerifiedAt = existingUser.phoneVerifiedAt || new Date();
    changed = true;
  }

  const passwordMatches = await bcrypt.compare(configuredAdmin.password, existingUser.password);
  if (!passwordMatches) {
    existingUser.password = await bcrypt.hash(configuredAdmin.password, 10);
    changed = true;
  }

  if (changed) {
    await existingUser.save();
  }

  return existingUser;
};
