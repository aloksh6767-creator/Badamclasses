import { isDatabaseConnected } from "../config/db.js";
import LiveChatMessage from "../models/LiveChatMessage.js";
import { createLocalLiveChatMessage, listLocalLiveChatMessages } from "../utils/localPersistence.js";

const normalizeBatchId = (value = "") => String(value || "default").trim().toLowerCase() || "default";
const normalizeMode = (value = "") => (value === "Group Chat" ? "Group Chat" : "Private Chat");
const normalizeText = (value = "") => String(value || "").trim();

const serializeMessage = (message) => ({
  _id: String(message._id || message.id || ""),
  batchId: message.batchId || "default",
  batchTitle: message.batchTitle || "",
  mode: normalizeMode(message.mode),
  text: message.text || "",
  senderName: message.senderName || "Student",
  senderEmail: message.senderEmail || "",
  senderRole: message.senderRole || "student",
  createdAt: message.createdAt || new Date().toISOString()
});

export const createLiveChatMessage = async (req, res) => {
  const text = normalizeText(req.body?.text);
  const batchId = normalizeBatchId(req.body?.batchId || req.params?.batchId);

  if (!text) {
    return res.status(400).json({ message: "Message is required." });
  }

  const payload = {
    batchId,
    batchTitle: normalizeText(req.body?.batchTitle),
    mode: normalizeMode(req.body?.mode),
    text: text.slice(0, 1000),
    senderName: req.user?.name || req.user?.email || "Student",
    senderEmail: req.user?.email || "",
    senderRole: req.user?.role || "student"
  };

  const record = isDatabaseConnected()
    ? await LiveChatMessage.create(payload)
    : createLocalLiveChatMessage(payload);

  res.status(201).json(serializeMessage(record));
};

export const listLiveChatMessages = async (req, res) => {
  const requestedBatchId = String(req.query?.batchId || req.params?.batchId || "").trim();
  const batchId = requestedBatchId ? normalizeBatchId(requestedBatchId) : "";
  const limit = Math.min(Number(req.query?.limit || 120), 300);

  const records = isDatabaseConnected()
    ? await LiveChatMessage.find(batchId ? { batchId } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    : listLocalLiveChatMessages(batchId)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, limit);

  res.json(records.reverse().map(serializeMessage));
};
