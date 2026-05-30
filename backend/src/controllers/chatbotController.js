import OpenAI from "openai";
import Course from "../models/Course.js";
import { getDatabaseStatus } from "../config/db.js";
import { getPaymentDebugSummary } from "./paymentController.js";
import { getKnowledgeReply } from "../utils/knowledgeBase.js";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const curatedBatches = [
  { title: "Maths Special Batch", instructor: "Badam Sir", duration: "1 Year", price: "INR 999" },
  { title: "Recorded Batch", instructor: "Badam Sir", duration: "12 Months Access", price: "INR 999" },
  { title: "SSC Complete Batch", instructor: "Amit Sir", duration: "12 Months", price: "INR 4,999" },
  { title: "Railway NTPC Batch", instructor: "Rohit Sir", duration: "10 Months", price: "INR 3,999" },
  { title: "SSC CHSL Batch", instructor: "Neha Ma'am", duration: "8 Months", price: "INR 3,499" },
  { title: "Banking Foundation Batch", instructor: "Vikas Sir", duration: "9 Months", price: "INR 4,299" },
  { title: "MP Police Batch", instructor: "Ankit Sir", duration: "8 Months", price: "INR 2,499" }
];

const curatedCatalogText = curatedBatches
  .map((item) => `- ${item.title} | instructor: ${item.instructor} | duration: ${item.duration} | price: ${item.price}`)
  .join("\n");

const replyForBatch = (normalized) => {
  const hit = curatedBatches.find((item) => normalized.includes(item.title.toLowerCase().split(" batch")[0]));
  if (!hit) return null;

  return `${hit.title}: Instructor ${hit.instructor}, Duration ${hit.duration}, Price ${hit.price}. You can open Batches on homepage and click Enroll Now.`;
};

const fallbackReply = (message, catalogText) => {
  const normalized = (message || "").toLowerCase();

  const knowledgeReply = getKnowledgeReply(message);
  if (knowledgeReply) return knowledgeReply;

  if (normalized.includes("batch") || normalized.includes("course") || normalized.includes("ssc") || normalized.includes("railway") || normalized.includes("banking") || normalized.includes("math")) {
    const batchAnswer = replyForBatch(normalized);
    if (batchAnswer) return batchAnswer;
    return `Available highlighted batches:\n${catalogText}`;
  }

  if (normalized.includes("login") || normalized.includes("password")) {
    return "For login issues: open Login, verify email/password, then retry. If still blocked, use reset flow or contact support with your registered email.";
  }

  if (normalized.includes("payment") || normalized.includes("buy") || normalized.includes("purchase")) {
    return "To purchase: open Batches/Courses, choose your batch, click Enroll Now, complete payment, then access content in Dashboard.";
  }

  if (normalized.includes("purchased") || normalized.includes("dashboard")) {
    return "Purchased courses are shown in Student Dashboard, where you can watch videos, download PDFs, and track progress.";
  }

  if (normalized.includes("doubt") || normalized.includes("question")) {
    return "Ask your exam doubt with topic and question number. I can help with concept direction and practice plan.";
  }

  return `I can help with batches, purchases, login/payment support, dashboard access, and study doubts.\n\nCurrent catalog:\n${catalogText}`;
};

export const chatWithAssistant = async (req, res) => {
  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  let catalogText = curatedCatalogText;

  try {
    const courses = await Course.find({})
      .select("title description price category ratingAverage ratingCount")
      .populate("instructor", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    if (courses.length) {
      catalogText = courses
        .map((course) => {
          return `- ${course.title} | instructor: ${course.instructor?.name || "N/A"} | category: ${course.category} | price: ${course.price} | rating: ${course.ratingAverage || 0} (${course.ratingCount || 0})`;
        })
        .join("\n");
    }
  } catch (dbError) {
    console.warn("Chatbot DB fallback:", dbError.message);
  }

  if (!openai) {
    return res.json({ reply: fallbackReply(message, catalogText) });
  }

  try {
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((item) => item && typeof item.role === "string" && typeof item.content === "string")
          .map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content }))
      : [];

    const systemPrompt = `You are the AI assistant for BadamClasses.
Be concise, practical, and helpful for: batch info, buying guidance, login issues, payment help, dashboard access, and study doubts.
If user asks about batch details, prioritize this catalog data:\n${catalogText}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || fallbackReply(message, catalogText);

    return res.json({ reply });
  } catch (aiError) {
    console.error("Chatbot AI fallback:", aiError.message);
    return res.json({ reply: fallbackReply(message, catalogText) });
  }
};

const buildAdminHealthSummary = () => {
  const database = getDatabaseStatus();
  const payment = getPaymentDebugSummary();

  return {
    backend: "reachable",
    database: {
      status: database.connected ? "connected" : "disconnected",
      detail: database.detail
    },
    payment: {
      razorpayConfigured: Boolean(payment?.razorpay?.configured),
      mode: payment?.razorpay?.mode || "unknown"
    }
  };
};

const buildWorkspaceSummaryText = (workspace = {}) => {
  const settings = workspace.settings || {};
  const metrics = workspace.metrics || {};
  const notice = workspace.notice || {};

  return [
    `Banner title: ${settings.bannerTitle || "N/A"}`,
    `SEO title: ${settings.seoTitle || "N/A"}`,
    `SEO description: ${settings.seoDescription || "N/A"}`,
    `Support email: ${settings.supportEmail || "N/A"}`,
    `Notice title: ${notice.title || "N/A"}`,
    `Notice message: ${notice.message || "N/A"}`,
    `Total batches: ${metrics.totalBatches || 0}`,
    `Total users: ${metrics.totalUsers || 0}`,
    `Total orders: ${metrics.totalOrders || 0}`,
    `Active batches: ${metrics.activeBatchCount || 0}`,
    `Support messages: ${metrics.supportCount || 0}`
  ].join("\n");
};

const buildFallbackAdminAssistant = (message = "", workspace = {}, health = buildAdminHealthSummary()) => {
  const normalized = String(message || "").trim().toLowerCase();
  const settings = workspace.settings || {};
  const currentBannerTitle = settings.bannerTitle || "Prepare Smarter with BadamClasses";

  let reply =
    "I reviewed website health and admin workspace. Core systems look stable. I can suggest safer homepage copy, notice updates, and operational improvements.";

  const suggestedUpdates = {
    settings: {},
    notice: {}
  };

  if (normalized.includes("seo") || normalized.includes("homepage") || normalized.includes("website")) {
    suggestedUpdates.settings = {
      bannerTitle: currentBannerTitle,
      seoTitle: "BadamClasses | Live Batches, Courses, Mock Tests",
      seoDescription:
        "Explore live classes, recorded batches, mock tests, study materials, and guided exam preparation with BadamClasses.",
      supportEmail: settings.supportEmail || "support@badamclasses.com"
    };
    reply =
      "I prepared a safe website-content refresh for homepage and SEO fields without changing branding or structure.";
  }

  if (normalized.includes("notice") || normalized.includes("announcement") || normalized.includes("update")) {
    suggestedUpdates.notice = {
      title: "New Batches & Support Updates",
      message: "Fresh batches, updated study material, and support improvements are now live on the website."
    };
    reply =
      "I prepared a homepage notice update that can be applied from the admin panel.";
  }

  if (normalized.includes("error") || normalized.includes("bug") || normalized.includes("health")) {
    reply =
      `Health summary: backend is ${health.backend}, database is ${health.database.status}, Razorpay configured: ${
        health.payment.razorpayConfigured ? "yes" : "no"
      }. I can also suggest homepage/admin updates alongside this health review.`;
  }

  return {
    reply,
    health,
    suggestedUpdates
  };
};

export const chatWithAdminAssistant = async (req, res) => {
  const { message, workspace = {}, history = [] } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  const health = buildAdminHealthSummary();
  const workspaceSummaryText = buildWorkspaceSummaryText(workspace);

  if (!openai) {
    return res.json(buildFallbackAdminAssistant(message, workspace, health));
  }

  try {
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((item) => item && typeof item.role === "string" && typeof item.content === "string")
          .map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content }))
      : [];

    const systemPrompt = `You are the Website Maintenance AI Assistant for BadamClasses admin.
You must help with website health review, safe admin updates, banner/SEO/notice improvements, and operational guidance.
Do not promise autonomous code changes. Only suggest safe admin-side updates.
Return strict JSON with keys: reply, suggestedUpdates.
suggestedUpdates must contain:
{
  "settings": {
    "bannerTitle": string,
    "seoTitle": string,
    "seoDescription": string,
    "supportEmail": string
  },
  "notice": {
    "title": string,
    "message": string
  }
}
If you do not want to change a field, return an empty string for that field.

Current health:
- backend: ${health.backend}
- database: ${health.database.status}
- database detail: ${health.database.detail}
- razorpay configured: ${health.payment.razorpayConfigured}
- razorpay mode: ${health.payment.mode}

Current workspace summary:
${workspaceSummaryText}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: message }
      ]
    });

    const content = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return res.json({
      reply: String(parsed.reply || "I reviewed the website admin workspace."),
      health,
      suggestedUpdates: {
        settings: {
          bannerTitle: String(parsed?.suggestedUpdates?.settings?.bannerTitle || ""),
          seoTitle: String(parsed?.suggestedUpdates?.settings?.seoTitle || ""),
          seoDescription: String(parsed?.suggestedUpdates?.settings?.seoDescription || ""),
          supportEmail: String(parsed?.suggestedUpdates?.settings?.supportEmail || "")
        },
        notice: {
          title: String(parsed?.suggestedUpdates?.notice?.title || ""),
          message: String(parsed?.suggestedUpdates?.notice?.message || "")
        }
      }
    });
  } catch (error) {
    console.error("Admin assistant AI fallback:", error.message);
    return res.json(buildFallbackAdminAssistant(message, workspace, health));
  }
};
