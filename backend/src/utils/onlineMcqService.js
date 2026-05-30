import OpenAI from "openai";
import { isDatabaseConnected } from "../config/db.js";
import OnlineMcqSet from "../models/OnlineMcqSet.js";
import { createLocalOnlineMcqSet, listLocalOnlineMcqSets } from "./localPersistence.js";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const answerLetters = ["a", "b", "c", "d"];

const clamp = (value = "", max = 240) => String(value || "").trim().slice(0, max);

const normalizeAnswer = (value) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (/^[0-3]$/.test(raw)) return Number(raw);
  if (/^[1-4]$/.test(raw)) return Number(raw) - 1;
  const letterIndex = answerLetters.indexOf(raw.replace(/[^a-d]/g, ""));
  return letterIndex >= 0 ? letterIndex : -1;
};

const normalizeQuestion = (item = {}) => {
  const options = Array.isArray(item.options)
    ? item.options.map((option) => clamp(option, 160)).filter(Boolean).slice(0, 4)
    : [];
  const answer = normalizeAnswer(item.answer);

  return {
    question: clamp(item.question, 300),
    options,
    answer,
    explanation: clamp(item.explanation, 280)
  };
};

export const validateMcqSetPayload = (payload = {}) => {
  const title = clamp(payload.title, 120);
  const examName = clamp(payload.examName || "Online MCQ", 80);
  const questions = (Array.isArray(payload.questions) ? payload.questions : [])
    .map(normalizeQuestion)
    .filter((item) => item.question && item.options.length === 4 && item.answer >= 0 && item.answer <= 3);

  if (!title) {
    throw new Error("MCQ title is required.");
  }

  if (!questions.length) {
    throw new Error("At least one valid MCQ is required with 4 options and an answer.");
  }

  return {
    title,
    examName,
    source: clamp(payload.source || "telegram", 40),
    status: payload.status === "draft" ? "draft" : "published",
    questions: questions.slice(0, 50),
    createdBy: clamp(payload.createdBy || "telegram-admin", 80)
  };
};

const parseJsonPayload = (raw = "") => {
  const text = String(raw || "").trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return null;
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) {
    return { title: "Telegram MCQ Set", questions: parsed };
  }
  return parsed;
};

const parseLinePayload = (raw = "") => {
  const [title = "", examName = "", ...questionParts] = String(raw || "").split("|").map((item) => item.trim());
  const body = questionParts.join("|").trim();
  const chunks = body
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const questions = chunks.map((chunk) => {
    const lines = chunk.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const questionLine = lines.find((line) => /^q(?:uestion)?\s*[:.)-]/i.test(line)) || lines[0] || "";
    const optionLines = lines.filter((line) => /^[a-d][\).:\-]\s*/i.test(line));
    const answerLine = lines.find((line) => /^(ans|answer)\s*[:.)-]/i.test(line)) || "";
    const explanationLine = lines.find((line) => /^(exp|explanation)\s*[:.)-]/i.test(line)) || "";

    return {
      question: questionLine.replace(/^q(?:uestion)?\s*[:.)-]\s*/i, ""),
      options: optionLines.map((line) => line.replace(/^[a-d][\).:\-]\s*/i, "")),
      answer: answerLine.replace(/^(ans|answer)\s*[:.)-]\s*/i, ""),
      explanation: explanationLine.replace(/^(exp|explanation)\s*[:.)-]\s*/i, "")
    };
  });

  return { title, examName, questions };
};

const formatWithOpenAI = async (raw = "") => {
  if (!openai) return null;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Format teacher-provided exam content into strict JSON for online MCQs. Do not invent answers."
      },
      {
        role: "user",
        content:
          "Return JSON with title, examName, questions. Each question has question, options array of exactly 4, answer index 0-3, optional explanation.\n\n" +
          String(raw || "").slice(0, 6000)
      }
    ]
  });

  const text = completion.choices?.[0]?.message?.content;
  return text ? JSON.parse(text) : null;
};

export const formatTelegramMcqPayload = async (raw = "", actor = "telegram-admin") => {
  let payload = null;
  try {
    payload = parseJsonPayload(raw);
  } catch {
    payload = null;
  }

  if (!payload) {
    try {
      payload = await formatWithOpenAI(raw);
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    payload = parseLinePayload(raw);
  }

  return validateMcqSetPayload({
    ...payload,
    source: "telegram",
    status: "published",
    createdBy: actor
  });
};

export const createOnlineMcqSet = async (payload = {}) => {
  const validated = validateMcqSetPayload(payload);
  if (!isDatabaseConnected()) {
    return createLocalOnlineMcqSet(validated);
  }
  const record = await OnlineMcqSet.create(validated);
  return record.toObject();
};

export const listPublishedOnlineMcqSets = async (limit = 12) => {
  const safeLimit = Math.min(Math.max(Number(limit || 12), 1), 50);
  if (!isDatabaseConnected()) {
    return listLocalOnlineMcqSets()
      .filter((item) => item.status === "published")
      .slice(0, safeLimit);
  }
  return OnlineMcqSet.find({ status: "published" }).sort({ createdAt: -1 }).limit(safeLimit).lean();
};
