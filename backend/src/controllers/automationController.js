import { getDatabaseStatus } from "../config/db.js";
import { getPaymentDebugSummary } from "./paymentController.js";
import { isDatabaseConnected } from "../config/db.js";
import Course from "../models/Course.js";
import {
  approvePendingContentChange,
  createAutomationBackup,
  getAutomationSnapshot,
  getPendingAdminActions,
  getFeatureFlags,
  getPendingContentChanges,
  getPublishedSiteContent,
  getRecentActivityLogs,
  getRecentBackups,
  queuePendingAdminAction,
  queueContentChange,
  recordTelegramWebhookMeta,
  rejectPendingAdminAction,
  rejectPendingContentChange,
  takePendingAdminAction,
  undoLastAppliedContentChange,
  updateFeatureFlags,
  updateTelegramRuntime
} from "../utils/automationStorage.js";
import { getTelegramAdminConfig, parseTelegramUpdate, sendTelegramMessage } from "../utils/telegramAdminBot.js";
import { ensureConfiguredAdminAccount } from "../utils/adminBootstrap.js";
import { createLocalCourse, deleteLocalCourse, listLocalCourses, updateLocalCourse } from "../utils/localPersistence.js";
import { createOnlineMcqSet, formatTelegramMcqPayload, listPublishedOnlineMcqSets } from "../utils/onlineMcqService.js";

const supportedFlags = [
  "telegramBotEnabled",
  "contentPublishingEnabled",
  "approvalFlowEnabled",
  "undoEnabled",
  "backupsEnabled",
  "activityLogsEnabled",
  "healthDashboardEnabled",
  "telegramPreviewMode"
];

const resolveFrontendBaseUrl = () => {
  const configured = String(process.env.FRONTEND_URL || "").trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3001";
};

const formatActor = (user) => user?.email || user?.name || "admin";

const buildHealthMonitor = () => {
  const database = getDatabaseStatus();
  const payment = getPaymentDebugSummary();

  return {
    backend: "reachable",
    database: {
      status: database.connected ? "connected" : "disconnected",
      code: database.code,
      detail: database.detail
    },
    payment: {
      razorpayConfigured: Boolean(payment?.razorpay?.configured),
      mode: payment?.razorpay?.mode || "unknown"
    },
    runtime: {
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || "development"
    }
  };
};

const buildDashboardPayload = () => {
  const snapshot = getAutomationSnapshot();
  const combinedPending = [
    ...(snapshot.pendingChanges || []).map((item) => ({ ...item, pendingType: "content" })),
    ...(snapshot.pendingAdminActions || []).map((item) => ({ ...item, pendingType: "admin-action", target: item.actionType }))
  ];
  return {
    featureFlags: snapshot.featureFlags,
    siteContent: snapshot.siteContent,
    health: buildHealthMonitor(),
    pendingChanges: combinedPending.slice(0, 10),
    appliedChanges: snapshot.appliedChanges.slice(0, 10),
    backups: snapshot.backups.slice(0, 10),
    activityLogs: snapshot.activityLogs.slice(0, 20),
    telegram: {
      configured: Boolean(getTelegramAdminConfig()),
      authorizedChatId: snapshot.telegram.authorizedChatId ? "configured" : "missing",
      lastWebhookAt: snapshot.telegram.lastWebhookAt || "",
      lastPollAt: snapshot.telegram.lastPollAt || "",
      lastCommandAt: snapshot.telegram.lastCommandAt || "",
      lastCommandText: snapshot.telegram.lastCommandText || "",
      lastError: snapshot.telegram.lastError || "",
      lastUpdateId: Number(snapshot.telegram.lastUpdateId || 0)
    }
  };
};

const filterSupportedFlags = (patch = {}) =>
  Object.fromEntries(Object.entries(patch).filter(([key]) => supportedFlags.includes(key)));

const ensureEnabled = (flagName, res) => {
  const flags = getFeatureFlags();
  if (!flags[flagName]) {
    res.status(403).json({
      success: false,
      message: `Automation module is disabled: ${flagName}`
    });
    return false;
  }
  return true;
};

const normalizeContentTarget = (target = "") => {
  const normalized = String(target || "").trim();
  if (["banner", "notice", "offerBanner", "featuredBatches"].includes(normalized)) {
    return normalized;
  }
  return "";
};

const normalizeTelegramFlagValue = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["on", "true", "1", "enable", "enabled"].includes(normalized);
};

const queueTelegramChange = ({ target, payload, actor, summary }) => {
  const flags = getFeatureFlags();
  if (!flags.contentPublishingEnabled) {
    return {
      ok: false,
      text: "Content publishing module is disabled in feature flags."
    };
  }

  const pending = queueContentChange({
    target,
    payload,
    actor,
    source: "telegram",
    summary
  });

  return {
    ok: true,
    text: flags.approvalFlowEnabled
      ? `Queued for approval: ${pending.id}`
      : `Queued change created: ${pending.id}. Approval flow is currently disabled, so please approve from admin immediately.`,
    pending
  };
};

const buildHelpText = () => {
  return [
    "BadamClasses Telegram Admin Bot",
    "/mode - show current bot mode",
    "/safe_mode - approval-first preview mode",
    "/advanced_mode - direct live execute mode",
    "/admin - show admin panel link and bot status",
    "/health - show backend and database status",
    "/status - show flags and pending counts",
    "/errors - show latest system issue summary",
    "/diagnose - show quick troubleshooting summary",
    "/flags - show current feature flags",
    "/flag <name> <on|off> - update one feature flag",
    "/list_batches - show latest managed batches",
    "/batch <id or title> - show one batch detail",
    "/add_batch <title> | <description> | <price> | <category> | <thumbnail>",
    "/update_batch <id> | <title> | <description> | <price> | <category> | <thumbnail>",
    "/delete_batch <id>",
    "/mcq <title> | <exam> | Q: ... A. ... B. ... C. ... D. ... Answer: A",
    "/list_mcq - show published Telegram MCQ sets",
    "/propose_notice <title> | <message>",
    "/propose_banner <title> | <subtitle> | <ctaLabel> | <ctaHref>",
    "/propose_offer <on|off> | <title> | <text> | <link> | <image>",
    "/pending - show pending approval ids",
    "/approve <pendingId>",
    "/reject <pendingId> [reason]",
    "/undo - revert last approved content change",
    "/backup - create a backup"
  ].join("\n");
};

const buildModeText = () => {
  const flags = getFeatureFlags();
  return [
    "Telegram Bot Mode",
    `Current mode: ${flags.telegramPreviewMode ? "safe-preview" : "advanced-live"}`,
    flags.telegramPreviewMode
      ? "Batch commands will create pending approval previews before any live change."
      : "Batch commands will apply directly on the website data."
  ].join("\n");
};

const buildErrorSummaryText = () => {
  const dashboard = buildDashboardPayload();
  return [
    "System Error Summary",
    `Database: ${dashboard.health.database.status}`,
    `Database Code: ${dashboard.health.database.code}`,
    `Database Detail: ${dashboard.health.database.detail}`,
    `Telegram Last Error: ${dashboard.telegram.lastError || "none"}`,
    `Pending approvals: ${dashboard.pendingChanges.length}`,
    `Last command: ${dashboard.telegram.lastCommandText || "none"}`
  ].join("\n");
};

const buildDiagnoseText = () => {
  const dashboard = buildDashboardPayload();
  const nextSteps = [];

  if (dashboard.health.database.status !== "connected") {
    nextSteps.push("Check MongoDB connection and whitelist.");
  }
  if (!dashboard.telegram.configured) {
    nextSteps.push("Configure Telegram bot token and admin chat id.");
  }
  if (!dashboard.featureFlags.telegramBotEnabled) {
    nextSteps.push("Turn ON telegramBotEnabled.");
  }
  if (!dashboard.featureFlags.contentPublishingEnabled) {
    nextSteps.push("Turn ON contentPublishingEnabled.");
  }

  return [
    "Quick Diagnose",
    `Backend: ${dashboard.health.backend}`,
    `Database: ${dashboard.health.database.status}`,
    `Payment Mode: ${dashboard.health.payment.mode}`,
    `Telegram Configured: ${dashboard.telegram.configured ? "Yes" : "No"}`,
    `Pending approvals: ${dashboard.pendingChanges.length}`,
    `Next steps: ${nextSteps.length ? nextSteps.join(" | ") : "No urgent issue detected."}`
  ].join("\n");
};

const getManagedCourses = async () => {
  if (!isDatabaseConnected()) {
    return listLocalCourses("", true);
  }

  return Course.find({}).sort({ createdAt: -1 }).limit(25);
};

const findManagedCourse = async (query = "") => {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const courses = await getManagedCourses();
  return (
    courses.find((course) => String(course._id || "").toLowerCase() === normalized) ||
    courses.find((course) => String(course.title || "").trim().toLowerCase() === normalized) ||
    courses.find((course) => String(course.title || "").trim().toLowerCase().includes(normalized)) ||
    null
  );
};

const buildCourseListText = async () => {
  const courses = await getManagedCourses();
  if (!courses.length) {
    return "No batches found.";
  }

  return [
    "Managed Batches",
    ...courses.slice(0, 12).map((course) => {
      const id = String(course._id || "").trim();
      return `${id} | ${course.title} | INR ${Number(course.price || 0)} | ${course.category || "General"}`;
    })
  ].join("\n");
};

const buildCourseDetailText = (course) => {
  if (!course) {
    return "Batch not found.";
  }

  return [
    "Batch Detail",
    `ID: ${course._id}`,
    `Title: ${course.title}`,
    `Price: INR ${Number(course.price || 0)}`,
    `Category: ${course.category || "General"}`,
    `Thumbnail: ${course.thumbnail || "none"}`,
    `Description: ${String(course.description || "").slice(0, 300) || "none"}`
  ].join("\n");
};

const getAutomationInstructor = async () => {
  const admin = await ensureConfiguredAdminAccount();
  if (!admin?._id) {
    throw new Error("Configured admin account is not available.");
  }
  return admin;
};

const parseBatchPayload = (raw = "", mode = "create") => {
  const parts = String(raw || "").split("|").map((item) => item.trim());
  if (mode === "create") {
    const [title = "", description = "", price = "", category = "", thumbnail = ""] = parts;
    return { title, description, price, category, thumbnail };
  }

  const [id = "", title = "", description = "", price = "", category = "", thumbnail = ""] = parts;
  return { id, title, description, price, category, thumbnail };
};

const createBatchFromTelegram = async (payload, actor) => {
  if (!payload.title || !payload.description || !payload.price) {
    return "Usage: /add_batch <title> | <description> | <price> | <category> | <thumbnail>";
  }

  const admin = await getAutomationInstructor();
  const coursePayload = {
    title: payload.title,
    description: payload.description,
    price: Number(payload.price || 0),
    category: payload.category || "General",
    thumbnail: payload.thumbnail || "",
    instructor: admin._id,
    curriculum: [],
    videos: [],
    pdfResources: []
  };

  let course;
  if (!isDatabaseConnected()) {
    course = createLocalCourse(coursePayload);
  } else {
    course = await Course.create(coursePayload);
  }

  updateTelegramRuntime({ lastError: "" });
  return `Batch created successfully.\nID: ${course._id}\nTitle: ${course.title}`;
};

const updateBatchFromTelegram = async (payload) => {
  if (!payload.id) {
    return "Usage: /update_batch <id> | <title> | <description> | <price> | <category> | <thumbnail>";
  }

  const patch = {
    ...(payload.title ? { title: payload.title } : {}),
    ...(payload.description ? { description: payload.description } : {}),
    ...(payload.price ? { price: Number(payload.price || 0) } : {}),
    ...(payload.category ? { category: payload.category } : {}),
    ...(payload.thumbnail ? { thumbnail: payload.thumbnail } : {})
  };

  let updated = null;
  if (!isDatabaseConnected()) {
    updated = updateLocalCourse(payload.id, patch);
  } else {
    const course = await Course.findById(payload.id);
    if (course) {
      Object.assign(course, patch);
      await course.save();
      updated = course;
    }
  }

  if (!updated) {
    return "Batch not found for update.";
  }

  return `Batch updated successfully.\nID: ${updated._id}\nTitle: ${updated.title}`;
};

const deleteBatchFromTelegram = async (id = "") => {
  const trimmedId = String(id || "").trim();
  if (!trimmedId) {
    return "Usage: /delete_batch <id>";
  }

  let deleted = false;
  if (!isDatabaseConnected()) {
    deleted = deleteLocalCourse(trimmedId);
  } else {
    const course = await Course.findById(trimmedId);
    if (course) {
      await course.deleteOne();
      deleted = true;
    }
  }

  return deleted ? `Batch deleted successfully: ${trimmedId}` : "Batch not found for delete.";
};

const queueBatchAdminAction = ({ actionType, payload, actor, summary, preview }) => {
  const pending = queuePendingAdminAction({
    actionType,
    payload,
    actor,
    source: "telegram",
    summary,
    preview
  });

  return [
    `Preview created for approval: ${pending.id}`,
    pending.preview || summary,
    "Use /approve PENDING_ID to apply or /reject PENDING_ID to cancel."
  ].join("\n");
};

const executeApprovedAdminAction = async (record) => {
  if (!record?.actionType) {
    return null;
  }

  if (record.actionType === "course.create") {
    return createBatchFromTelegram(record.payload || {}, record.actor || "telegram");
  }

  if (record.actionType === "course.update") {
    return updateBatchFromTelegram(record.payload || {});
  }

  if (record.actionType === "course.delete") {
    return deleteBatchFromTelegram(record.payload?.id || "");
  }

  if (record.actionType === "mcq.create") {
    const created = await createOnlineMcqSet(record.payload || {});
    return `MCQ set published.\nID: ${created._id}\nTitle: ${created.title}\nQuestions: ${created.questions?.length || 0}`;
  }

  return null;
};

const buildAdminCommandText = () => {
  const dashboard = buildDashboardPayload();
  const frontendBaseUrl = resolveFrontendBaseUrl();

  return [
    "BadamClasses Admin Access",
    `Admin Panel: ${frontendBaseUrl}/admin`,
    `Login Page: ${frontendBaseUrl}/login?redirect=%2Fadmin`,
    `Bot Mode: ${dashboard.telegram.configured ? "connected" : "not configured"}`,
    `Telegram Mode: ${dashboard.featureFlags.telegramPreviewMode ? "safe-preview" : "advanced-live"}`,
    `Database: ${dashboard.health.database.status}`,
    `Pending approvals: ${dashboard.pendingChanges.length}`,
    "Quick commands:",
    "/health",
    "/status",
    "/pending"
  ].join("\n");
};

export const executeTelegramCommand = async ({ text, actor }) => {
  const flags = getFeatureFlags();
  const normalizedText = String(text || "").trim();
  const [rawCommand, ...rest] = normalizedText.split(" ");
  const normalizedCommand = String(rawCommand || "").trim().toLowerCase();
  const command = normalizedCommand.startsWith("/")
    ? normalizedCommand.replace(/@[\w_]+$/, "")
    : normalizedCommand;
  const remainder = rest.join(" ").trim();

  if (!command) {
    return "Empty command received.";
  }

  if (command === "/start" || command === "/help" || command === "start" || command === "help") {
    return buildHelpText();
  }

  if (command === "/mode") {
    return buildModeText();
  }

  if (command === "/safe_mode") {
    updateFeatureFlags({ telegramPreviewMode: true }, actor);
    return buildModeText();
  }

  if (command === "/advanced_mode") {
    updateFeatureFlags({ telegramPreviewMode: false }, actor);
    return buildModeText();
  }

  if (command === "/admin" || command === "/panel" || command === "/dashboard") {
    return buildAdminCommandText();
  }

  if (command === "/health" || command === "/db") {
    const health = buildHealthMonitor();
    return [
      "Health Snapshot",
      `Backend: ${health.backend}`,
      `Database: ${health.database.status}`,
      `Database Code: ${health.database.code}`,
      `Razorpay Configured: ${health.payment.razorpayConfigured ? "Yes" : "No"}`,
      `Mode: ${health.payment.mode}`
    ].join("\n");
  }

  if (command === "/status" || command === "/summary") {
    const pending = getPendingContentChanges();
    const pendingAdmin = getPendingAdminActions();
    const backups = getRecentBackups();
    return [
      "Automation Status",
      `Pending approvals: ${pending.length + pendingAdmin.length}`,
      `Recent backups: ${backups.length}`,
      `Telegram bot: ${flags.telegramBotEnabled ? "ON" : "OFF"}`,
      `Publishing: ${flags.contentPublishingEnabled ? "ON" : "OFF"}`,
      `Approval flow: ${flags.approvalFlowEnabled ? "ON" : "OFF"}`,
      `Mode: ${flags.telegramPreviewMode ? "safe-preview" : "advanced-live"}`
    ].join("\n");
  }

  if (command === "/errors") {
    return buildErrorSummaryText();
  }

  if (command === "/diagnose") {
    return buildDiagnoseText();
  }

  if (command === "/flags") {
    return supportedFlags.map((name) => `${name}: ${flags[name] ? "ON" : "OFF"}`).join("\n");
  }

  if (command === "/flag") {
    const [flagName = "", flagValue = ""] = remainder.split(/\s+/, 2);
    if (!supportedFlags.includes(flagName)) {
      return `Unknown flag. Supported: ${supportedFlags.join(", ")}`;
    }

    updateFeatureFlags({ [flagName]: normalizeTelegramFlagValue(flagValue) }, actor);
    return `Updated ${flagName} to ${normalizeTelegramFlagValue(flagValue) ? "ON" : "OFF"}.`;
  }

  if (command === "/list_batches" || command === "/list_courses") {
    return buildCourseListText();
  }

  if (command === "/batch" || command === "/course") {
    if (!remainder) {
      return "Usage: /batch <id or title>";
    }
    const course = await findManagedCourse(remainder);
    return buildCourseDetailText(course);
  }

  if (command === "/add_batch" || command === "/add_course") {
    const payload = parseBatchPayload(remainder, "create");
    if (flags.telegramPreviewMode) {
      return queueBatchAdminAction({
        actionType: "course.create",
        payload,
        actor,
        summary: `Create batch: ${payload.title || "Untitled Batch"}`,
        preview: `Create batch "${payload.title}" | INR ${payload.price || 0} | ${payload.category || "General"}`
      });
    }
    return createBatchFromTelegram(payload, actor);
  }

  if (command === "/update_batch" || command === "/update_course") {
    const payload = parseBatchPayload(remainder, "update");
    if (flags.telegramPreviewMode) {
      return queueBatchAdminAction({
        actionType: "course.update",
        payload,
        actor,
        summary: `Update batch: ${payload.id || "unknown"}`,
        preview: `Update ${payload.id} -> ${payload.title || "keep title"} | INR ${payload.price || "keep"}`
      });
    }
    return updateBatchFromTelegram(payload);
  }

  if (command === "/delete_batch" || command === "/delete_course") {
    if (flags.telegramPreviewMode) {
      const trimmedId = String(remainder || "").trim();
      return queueBatchAdminAction({
        actionType: "course.delete",
        payload: { id: trimmedId },
        actor,
        summary: `Delete batch: ${trimmedId}`,
        preview: `Delete batch "${trimmedId}".`
      });
    }
    return deleteBatchFromTelegram(remainder);
  }

  if (command === "/mcq" || command === "/add_mcq") {
    if (!remainder) {
      return [
        "Usage:",
        "/mcq <title> | <exam> |",
        "Q: Question text",
        "A. Option 1",
        "B. Option 2",
        "C. Option 3",
        "D. Option 4",
        "Answer: A"
      ].join("\n");
    }

    const payload = await formatTelegramMcqPayload(remainder, actor);
    if (flags.telegramPreviewMode) {
      return queueBatchAdminAction({
        actionType: "mcq.create",
        payload,
        actor,
        summary: `Publish MCQ set: ${payload.title}`,
        preview: `Publish "${payload.title}" for ${payload.examName} with ${payload.questions.length} question(s).`
      });
    }

    const created = await createOnlineMcqSet(payload);
    return `MCQ set published.\nID: ${created._id}\nTitle: ${created.title}\nQuestions: ${created.questions?.length || 0}`;
  }

  if (command === "/list_mcq" || command === "/list_mcqs") {
    const sets = await listPublishedOnlineMcqSets(10);
    if (!sets.length) {
      return "No published MCQ sets found.";
    }
    return [
      "Published MCQ Sets",
      ...sets.map((item) => `${item._id} | ${item.title} | ${item.examName} | ${item.questions?.length || 0} questions`)
    ].join("\n");
  }

  if (command === "/propose_notice") {
    const [title = "", message = ""] = remainder.split("|").map((item) => item.trim());
    if (!title || !message) {
      return "Usage: /propose_notice <title> | <message>";
    }
    return queueTelegramChange({
      target: "notice",
      payload: { title, message },
      actor,
      summary: `Notice update: ${title}`
    }).text;
  }

  if (command === "/propose_banner") {
    const [title = "", subtitle = "", ctaLabel = "", ctaHref = ""] = remainder.split("|").map((item) => item.trim());
    if (!title) {
      return "Usage: /propose_banner <title> | <subtitle> | <ctaLabel> | <ctaHref>";
    }
    return queueTelegramChange({
      target: "banner",
      payload: { title, subtitle, ctaLabel, ctaHref },
      actor,
      summary: `Banner update: ${title}`
    }).text;
  }

  if (command === "/propose_offer") {
    const [enabled = "", title = "", offerText = "", link = "", image = ""] = remainder.split("|").map((item) => item.trim());
    return queueTelegramChange({
      target: "offerBanner",
      payload: {
        enabled: normalizeTelegramFlagValue(enabled),
        title,
        text: offerText,
        link,
        image
      },
      actor,
      summary: `Offer banner update: ${title || "Untitled"}`
    }).text;
  }

  if (command === "/pending") {
    const pending = getPendingContentChanges();
    const pendingAdmin = getPendingAdminActions();
    const combined = [
      ...pending.map((item) => `${item.id} | content | ${item.target} | ${item.summary}`),
      ...pendingAdmin.map((item) => `${item.id} | admin-action | ${item.actionType} | ${item.summary}`)
    ];
    if (!combined.length) {
      return "No pending approvals.";
    }
    return combined.slice(0, 12).join("\n");
  }

  if (command === "/approve") {
    const pendingId = remainder.trim();
    if (!pendingId) {
      return "Usage: /approve <pendingId>";
    }
    const applied = approvePendingContentChange(pendingId, actor);
    if (applied) {
      return `Approved ${pendingId}.`;
    }
    const adminAction = takePendingAdminAction(pendingId);
    if (!adminAction) {
      return `Pending change not found: ${pendingId}`;
    }
    const result = await executeApprovedAdminAction(adminAction);
    return result
      ? `Approved ${pendingId} and executed ${adminAction.actionType}.`
      : `Pending action found but execution failed: ${pendingId}`;
  }

  if (command === "/reject") {
    const [pendingId = "", ...reasonParts] = remainder.split(" ");
    if (!pendingId) {
      return "Usage: /reject <pendingId> [reason]";
    }
    const rejected = rejectPendingContentChange(pendingId, actor, reasonParts.join(" ").trim());
    if (rejected) {
      return `Rejected ${pendingId}.`;
    }
    const rejectedAdmin = rejectPendingAdminAction(pendingId, actor, reasonParts.join(" ").trim());
    return rejectedAdmin ? `Rejected ${pendingId}.` : `Pending change not found: ${pendingId}`;
  }

  if (command === "/undo") {
    if (!flags.undoEnabled) {
      return "Undo module is disabled in feature flags.";
    }
    const result = undoLastAppliedContentChange(actor);
    return result ? `Undid last applied change: ${result.revertedChange.id}` : "No approved change available to undo.";
  }

  if (command === "/backup") {
    if (!flags.backupsEnabled) {
      return "Backups module is disabled in feature flags.";
    }
    const backup = createAutomationBackup("telegram", actor);
    return `Backup created: ${backup.id}`;
  }

  return "Unknown command. Send /help to view supported commands.";
};

export const processTelegramAdminMessage = async ({ text, chatId, fromName, source = "webhook" }) => {
  recordTelegramWebhookMeta({ chatId, text, error: "" });

  const config = getTelegramAdminConfig();
  const flags = getFeatureFlags();
  if (!flags.telegramBotEnabled) {
    return { success: true, ignored: true, reason: "telegram_bot_disabled" };
  }

  if (!chatId || !text) {
    return { success: true, ignored: true, reason: "no_text_message" };
  }

  if (config?.configuredChatId && chatId !== config.configuredChatId) {
    await sendTelegramMessage({
      chatId,
      text: "This Telegram chat is not authorized for BadamClasses admin automation."
    });
    return { success: true, ignored: true, reason: "unauthorized_chat" };
  }

  try {
    const reply = await executeTelegramCommand({
      text,
      actor: fromName
    });

    await sendTelegramMessage({
      chatId,
      text: reply
    });

    updateTelegramRuntime({
      lastCommandAt: new Date().toISOString(),
      lastCommandText: text,
      lastError: "",
      ...(source === "polling" ? { lastPollAt: new Date().toISOString() } : {})
    });

    return { success: true, reply };
  } catch (error) {
    updateTelegramRuntime({
      lastError: error.message || "telegram_processing_failed",
      ...(source === "polling" ? { lastPollAt: new Date().toISOString() } : {})
    });
    await sendTelegramMessage({
      chatId,
      text: `Telegram automation failed: ${error.message}`
    }).catch(() => {});
    throw error;
  }
};

export const getAutomationDashboard = async (req, res) => {
  return res.json({
    success: true,
    dashboard: buildDashboardPayload()
  });
};

export const getAutomationPublicContent = async (req, res) => {
  return res.json({
    success: true,
    content: getPublishedSiteContent()
  });
};

export const getAutomationPublicMcqSets = async (req, res) => {
  const mcqSets = await listPublishedOnlineMcqSets(req.query?.limit || 12);
  return res.json({
    success: true,
    mcqSets
  });
};

export const patchAutomationFeatureFlags = async (req, res) => {
  const patch = filterSupportedFlags(req.body || {});
  const nextFlags = updateFeatureFlags(patch, formatActor(req.user));

  return res.json({
    success: true,
    featureFlags: nextFlags
  });
};

export const createAutomationContentProposal = async (req, res) => {
  if (!ensureEnabled("contentPublishingEnabled", res)) {
    return;
  }

  const target = normalizeContentTarget(req.body?.target);
  if (!target) {
    return res.status(400).json({ success: false, message: "Unsupported content target." });
  }

  const pending = queueContentChange({
    target,
    payload: req.body?.payload || {},
    actor: formatActor(req.user),
    source: "admin",
    summary: String(req.body?.summary || "").trim()
  });

  return res.status(201).json({
    success: true,
    pendingChange: pending
  });
};

export const approveAutomationContentProposal = async (req, res) => {
  if (!ensureEnabled("approvalFlowEnabled", res)) {
    return;
  }

  const applied = approvePendingContentChange(req.params.pendingId, formatActor(req.user));
  if (!applied) {
    return res.status(404).json({ success: false, message: "Pending change not found." });
  }

  return res.json({
    success: true,
    appliedChange: applied,
    content: getPublishedSiteContent()
  });
};

export const rejectAutomationContentProposal = async (req, res) => {
  if (!ensureEnabled("approvalFlowEnabled", res)) {
    return;
  }

  const rejected = rejectPendingContentChange(
    req.params.pendingId,
    formatActor(req.user),
    String(req.body?.reason || "").trim()
  );

  if (!rejected) {
    return res.status(404).json({ success: false, message: "Pending change not found." });
  }

  return res.json({
    success: true,
    rejectedChange: rejected
  });
};

export const undoAutomationContentChange = async (req, res) => {
  if (!ensureEnabled("undoEnabled", res)) {
    return;
  }

  const result = undoLastAppliedContentChange(formatActor(req.user));
  if (!result) {
    return res.status(404).json({ success: false, message: "No approved content change available to undo." });
  }

  return res.json({
    success: true,
    ...result
  });
};

export const runAutomationBackup = async (req, res) => {
  if (!ensureEnabled("backupsEnabled", res)) {
    return;
  }

  const backup = createAutomationBackup("manual", formatActor(req.user));
  return res.json({
    success: true,
    backup
  });
};

export const handleTelegramAdminWebhook = async (req, res) => {
  const config = getTelegramAdminConfig();
  if (!config?.botToken) {
    return res.status(503).json({
      success: false,
      message: "Telegram bot is not configured."
    });
  }

  if (config.webhookSecret) {
    const incomingSecret = String(req.headers["x-telegram-bot-api-secret-token"] || "").trim();
    if (incomingSecret !== config.webhookSecret) {
      recordTelegramWebhookMeta({ error: "telegram_secret_mismatch" });
      return res.status(403).json({ success: false, message: "Invalid Telegram webhook secret." });
    }
  }

  const { text, chatId, fromName } = parseTelegramUpdate(req.body || {});

  try {
    const result = await processTelegramAdminMessage({
      text,
      chatId,
      fromName,
      source: "webhook"
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Telegram automation failed." });
  }
};
