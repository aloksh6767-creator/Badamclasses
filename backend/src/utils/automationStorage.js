import crypto from "crypto";
import fs from "fs";
import path from "path";

const storageDir = path.resolve(process.cwd(), "storage");
const automationFile = path.join(storageDir, "automation-runtime.json");
const backupDir = path.join(storageDir, "automation-backups");
const MAX_ACTIVITY_LOGS = 200;
const MAX_BACKUP_META = 30;
const MAX_APPLIED_CHANGES = 50;

const defaultFeatureFlags = {
  telegramBotEnabled: false,
  contentPublishingEnabled: false,
  approvalFlowEnabled: false,
  undoEnabled: false,
  backupsEnabled: false,
  activityLogsEnabled: false,
  healthDashboardEnabled: false,
  telegramPreviewMode: true
};

const defaultSiteContent = {
  banner: {
    title: "Prepare Smarter with BadamClasses",
    subtitle: "Join India's growing learning platform for SSC, Railway, Banking and other competitive exams.",
    ctaLabel: "Start Learning",
    ctaHref: "/batches"
  },
  notice: {
    title: "",
    message: ""
  },
  offerBanner: {
    enabled: false,
    title: "",
    text: "",
    image: "",
    link: ""
  },
  featuredBatches: []
};

const defaultState = {
  featureFlags: { ...defaultFeatureFlags },
  siteContent: { ...defaultSiteContent },
  pendingChanges: [],
  pendingAdminActions: [],
  appliedChanges: [],
  backups: [],
  activityLogs: [],
  telegram: {
    authorizedChatId: String(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim(),
    lastWebhookAt: "",
    lastPollAt: "",
    lastCommandAt: "",
    lastCommandText: "",
    lastError: "",
    lastUpdateId: 0
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const createId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

const ensureStorage = () => {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  if (!fs.existsSync(automationFile)) {
    fs.writeFileSync(automationFile, JSON.stringify(defaultState, null, 2), "utf8");
  }
};

const normalizeFeatureFlags = (value = {}) => ({
  ...defaultFeatureFlags,
  ...(typeof value === "object" && value ? value : {})
});

const normalizeBanner = (value = {}) => ({
  ...defaultSiteContent.banner,
  ...(typeof value === "object" && value ? value : {})
});

const normalizeNotice = (value = {}) => ({
  ...defaultSiteContent.notice,
  ...(typeof value === "object" && value ? value : {})
});

const normalizeOfferBanner = (value = {}) => ({
  ...defaultSiteContent.offerBanner,
  ...(typeof value === "object" && value ? value : {}),
  enabled: Boolean(value?.enabled)
});

const normalizeSiteContent = (value = {}) => ({
  banner: normalizeBanner(value?.banner),
  notice: normalizeNotice(value?.notice),
  offerBanner: normalizeOfferBanner(value?.offerBanner),
  featuredBatches: Array.isArray(value?.featuredBatches) ? value.featuredBatches : []
});

const normalizeState = (parsed = {}) => ({
  featureFlags: normalizeFeatureFlags(parsed.featureFlags),
  siteContent: normalizeSiteContent(parsed.siteContent),
  pendingChanges: Array.isArray(parsed.pendingChanges) ? parsed.pendingChanges : [],
  pendingAdminActions: Array.isArray(parsed.pendingAdminActions) ? parsed.pendingAdminActions : [],
  appliedChanges: Array.isArray(parsed.appliedChanges) ? parsed.appliedChanges : [],
  backups: Array.isArray(parsed.backups) ? parsed.backups : [],
  activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
  telegram: {
    ...defaultState.telegram,
    ...(typeof parsed.telegram === "object" && parsed.telegram ? parsed.telegram : {}),
    authorizedChatId:
      String(parsed?.telegram?.authorizedChatId || "").trim() || defaultState.telegram.authorizedChatId,
    lastUpdateId: Number(parsed?.telegram?.lastUpdateId || 0)
  }
});

export const readAutomationState = () => {
  ensureStorage();
  try {
    const raw = fs.readFileSync(automationFile, "utf8");
    return normalizeState(JSON.parse(raw || "{}"));
  } catch {
    return clone(defaultState);
  }
};

const writeAutomationState = (nextState) => {
  ensureStorage();
  fs.writeFileSync(automationFile, JSON.stringify(normalizeState(nextState), null, 2), "utf8");
};

export const getAutomationSnapshot = () => clone(readAutomationState());

const appendActivityLogInternal = (state, entry) => {
  const logs = Array.isArray(state.activityLogs) ? [...state.activityLogs] : [];
  logs.unshift({
    id: createId("activity"),
    createdAt: nowIso(),
    actor: entry.actor || "system",
    action: entry.action || "automation.update",
    detail: entry.detail || "",
    metadata: entry.metadata || {}
  });
  state.activityLogs = logs.slice(0, MAX_ACTIVITY_LOGS);
  return state;
};

export const appendActivityLog = (entry) => {
  const state = readAutomationState();
  appendActivityLogInternal(state, entry);
  writeAutomationState(state);
  return clone(state.activityLogs[0]);
};

export const updateFeatureFlags = (patch = {}, actor = "admin") => {
  const state = readAutomationState();
  state.featureFlags = {
    ...state.featureFlags,
    ...Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, Boolean(value)]))
  };
  appendActivityLogInternal(state, {
    actor,
    action: "feature-flags.updated",
    detail: "Automation feature flags were updated.",
    metadata: { patch: clone(patch) }
  });
  writeAutomationState(state);
  return clone(state.featureFlags);
};

const buildPatchFromTarget = (target = "", payload = {}) => {
  if (target === "banner") {
    return {
      banner: {
        ...defaultSiteContent.banner,
        ...payload
      }
    };
  }

  if (target === "notice") {
    return {
      notice: {
        ...defaultSiteContent.notice,
        ...payload
      }
    };
  }

  if (target === "offerBanner") {
    return {
      offerBanner: {
        ...defaultSiteContent.offerBanner,
        ...payload,
        enabled: Boolean(payload.enabled)
      }
    };
  }

  if (target === "featuredBatches") {
    return {
      featuredBatches: Array.isArray(payload) ? payload : []
    };
  }

  return {};
};

export const queueContentChange = ({
  target,
  payload,
  actor = "admin",
  source = "admin",
  summary = ""
}) => {
  const state = readAutomationState();
  const before = clone(state.siteContent);
  const patch = buildPatchFromTarget(target, payload);

  if (!Object.keys(patch).length) {
    throw new Error("Unsupported content target.");
  }

  const record = {
    id: createId("pending"),
    target,
    source,
    actor,
    summary: summary || `Update ${target}`,
    payload: clone(payload),
    patch,
    before,
    createdAt: nowIso(),
    status: "pending"
  };

  state.pendingChanges.unshift(record);
  appendActivityLogInternal(state, {
    actor,
    action: "content.queued",
    detail: `Queued ${target} content update for approval.`,
    metadata: { pendingId: record.id, source, target }
  });
  writeAutomationState(state);
  return clone(record);
};

export const queuePendingAdminAction = ({
  actionType,
  payload,
  actor = "admin",
  source = "telegram",
  summary = "",
  preview = ""
}) => {
  const state = readAutomationState();
  const record = {
    id: createId("pending_admin"),
    actionType,
    actor,
    source,
    summary: summary || actionType,
    payload: clone(payload),
    preview: String(preview || "").trim(),
    createdAt: nowIso(),
    status: "pending"
  };

  state.pendingAdminActions.unshift(record);
  appendActivityLogInternal(state, {
    actor,
    action: "admin-action.queued",
    detail: `Queued ${actionType} for approval.`,
    metadata: { pendingId: record.id, source, actionType }
  });
  writeAutomationState(state);
  return clone(record);
};

const applyPatchToSiteContent = (currentSiteContent, patch = {}) => normalizeSiteContent({
  ...currentSiteContent,
  ...patch,
  banner: patch.banner ? { ...currentSiteContent.banner, ...patch.banner } : currentSiteContent.banner,
  notice: patch.notice ? { ...currentSiteContent.notice, ...patch.notice } : currentSiteContent.notice,
  offerBanner: patch.offerBanner
    ? { ...currentSiteContent.offerBanner, ...patch.offerBanner }
    : currentSiteContent.offerBanner
});

export const approvePendingContentChange = (pendingId, actor = "admin") => {
  const state = readAutomationState();
  const index = state.pendingChanges.findIndex((item) => String(item.id) === String(pendingId));
  if (index === -1) {
    return null;
  }

  const pending = state.pendingChanges[index];
  const before = clone(state.siteContent);
  state.siteContent = applyPatchToSiteContent(state.siteContent, pending.patch);
  state.pendingChanges.splice(index, 1);

  const appliedRecord = {
    ...pending,
    approvedBy: actor,
    approvedAt: nowIso(),
    status: "approved",
    before,
    after: clone(state.siteContent)
  };

  state.appliedChanges.unshift(appliedRecord);
  state.appliedChanges = state.appliedChanges.slice(0, MAX_APPLIED_CHANGES);
  appendActivityLogInternal(state, {
    actor,
    action: "content.approved",
    detail: `Approved ${pending.target} content update.`,
    metadata: { pendingId: pending.id, target: pending.target, source: pending.source }
  });
  writeAutomationState(state);
  return clone(appliedRecord);
};

export const rejectPendingContentChange = (pendingId, actor = "admin", reason = "") => {
  const state = readAutomationState();
  const index = state.pendingChanges.findIndex((item) => String(item.id) === String(pendingId));
  if (index === -1) {
    return null;
  }

  const [pending] = state.pendingChanges.splice(index, 1);
  appendActivityLogInternal(state, {
    actor,
    action: "content.rejected",
    detail: `Rejected ${pending.target} content update.`,
    metadata: { pendingId: pending.id, target: pending.target, reason }
  });
  writeAutomationState(state);
  return clone({
    ...pending,
    rejectedBy: actor,
    rejectedAt: nowIso(),
    rejectReason: reason || ""
  });
};

export const getPendingAdminActions = () => clone(readAutomationState().pendingAdminActions || []);

export const takePendingAdminAction = (pendingId) => {
  const state = readAutomationState();
  const index = state.pendingAdminActions.findIndex((item) => String(item.id) === String(pendingId));
  if (index === -1) {
    return null;
  }

  const [record] = state.pendingAdminActions.splice(index, 1);
  writeAutomationState(state);
  return clone(record);
};

export const rejectPendingAdminAction = (pendingId, actor = "admin", reason = "") => {
  const state = readAutomationState();
  const index = state.pendingAdminActions.findIndex((item) => String(item.id) === String(pendingId));
  if (index === -1) {
    return null;
  }

  const [record] = state.pendingAdminActions.splice(index, 1);
  appendActivityLogInternal(state, {
    actor,
    action: "admin-action.rejected",
    detail: `Rejected ${record.actionType}.`,
    metadata: { pendingId: record.id, actionType: record.actionType, reason }
  });
  writeAutomationState(state);
  return clone({
    ...record,
    rejectedBy: actor,
    rejectedAt: nowIso(),
    rejectReason: reason || ""
  });
};

export const undoLastAppliedContentChange = (actor = "admin") => {
  const state = readAutomationState();
  const lastApplied = state.appliedChanges[0];
  if (!lastApplied) {
    return null;
  }

  state.siteContent = normalizeSiteContent(lastApplied.before || defaultSiteContent);

  const undoRecord = {
    id: createId("undo"),
    actor,
    action: "content.undo",
    detail: `Undid ${lastApplied.target} content update.`,
    metadata: { appliedId: lastApplied.id, target: lastApplied.target }
  };

  appendActivityLogInternal(state, undoRecord);
  state.appliedChanges.shift();
  writeAutomationState(state);
  return {
    restoredSiteContent: clone(state.siteContent),
    revertedChange: clone(lastApplied)
  };
};

export const createAutomationBackup = (reason = "manual", actor = "system") => {
  const state = readAutomationState();
  const backupId = createId("backup");
  const snapshot = {
    id: backupId,
    reason,
    actor,
    createdAt: nowIso(),
    featureFlags: clone(state.featureFlags),
    siteContent: clone(state.siteContent),
    pendingChanges: clone(state.pendingChanges),
    appliedChanges: clone(state.appliedChanges.slice(0, 10))
  };
  const fileName = `${backupId}.json`;
  const filePath = path.join(backupDir, fileName);

  ensureStorage();
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf8");

  state.backups.unshift({
    id: backupId,
    reason,
    actor,
    createdAt: snapshot.createdAt,
    fileName
  });
  state.backups = state.backups.slice(0, MAX_BACKUP_META);
  appendActivityLogInternal(state, {
    actor,
    action: "backup.created",
    detail: `Created ${reason} backup.`,
    metadata: { backupId, fileName }
  });
  writeAutomationState(state);

  return {
    id: backupId,
    reason,
    actor,
    createdAt: snapshot.createdAt,
    fileName,
    filePath
  };
};

export const recordTelegramWebhookMeta = ({ chatId = "", text = "", error = "" } = {}) => {
  const state = readAutomationState();
  state.telegram = {
    ...state.telegram,
    lastWebhookAt: nowIso(),
    lastCommandAt: text ? nowIso() : state.telegram.lastCommandAt,
    lastCommandText: text || state.telegram.lastCommandText || "",
    lastError: error || ""
  };
  writeAutomationState(state);
  return clone(state.telegram);
};

export const updateTelegramRuntime = (patch = {}) => {
  const state = readAutomationState();
  state.telegram = {
    ...state.telegram,
    ...patch
  };
  writeAutomationState(state);
  return clone(state.telegram);
};

export const getPublishedSiteContent = () => clone(readAutomationState().siteContent);
export const getFeatureFlags = () => clone(readAutomationState().featureFlags);
export const getRecentActivityLogs = () => clone(readAutomationState().activityLogs);
export const getPendingContentChanges = () => clone(readAutomationState().pendingChanges);
export const getPendingAdminActionsSnapshot = () => clone(readAutomationState().pendingAdminActions || []);
export const getRecentBackups = () => clone(readAutomationState().backups);
