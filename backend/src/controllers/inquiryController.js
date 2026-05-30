import { createLocalInquiry, listLocalInquiries } from "../utils/localPersistence.js";

const normalizeText = (value = "") => String(value || "").trim();

export const createInquiry = async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeText(req.body?.email);
  const message = normalizeText(req.body?.message);

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Name, email, and message are required." });
  }

  const record = createLocalInquiry({
    name,
    email,
    message,
    status: "new"
  });

  res.status(201).json({
    message: "Your message has been received. Support team will contact you soon.",
    inquiry: record
  });
};

export const listInquiriesAdmin = async (req, res) => {
  const items = listLocalInquiries().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(items);
};
