import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { isDatabaseConnected } from "../config/db.js";
import { findLocalUserById } from "../utils/localPersistence.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = isDatabaseConnected()
      ? await User.findById(decoded.userId).select("-password")
      : findLocalUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    if (isDatabaseConnected()) {
      req.user = user;
    } else {
      const { password, ...safeUser } = user;
      req.user = safeUser;
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

export const optionalProtect = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? protect(req, res, next) : next();
};

export const requireStudentSession = (req, res, next) => {
  if (req.user?._id) {
    req.studentId = String(req.user._id);
    req.isGuestStudent = false;
    return next();
  }
  const guestSession = String(req.headers["x-guest-session"] || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guestSession)) {
    return res.status(401).json({ message: "A browser guest session is required." });
  }
  req.studentId = crypto.createHash("sha256").update(`badam-guest:${guestSession}`).digest("hex").slice(0, 24);
  req.isGuestStudent = true;
  return next();
};

export const getStudentSessionId = (req) => String(req.user?._id || req.studentId || "");

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const staffOnly = (req, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "instructor") {
    return res.status(403).json({ message: "Admin or instructor access required" });
  }
  next();
};
