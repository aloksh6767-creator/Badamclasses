import jwt from "jsonwebtoken";
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
