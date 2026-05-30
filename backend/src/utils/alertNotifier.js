const ALERT_DEDUP_WINDOW_MS = 5 * 60 * 1000;
const recentAlerts = new Map();

const getTelegramConfig = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
};

const truncate = (value, maxLength = 500) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
};

const cleanupRecentAlerts = (now) => {
  for (const [key, timestamp] of recentAlerts.entries()) {
    if (now - timestamp > ALERT_DEDUP_WINDOW_MS) {
      recentAlerts.delete(key);
    }
  }
};

const shouldSkipDuplicateAlert = (fingerprint) => {
  const now = Date.now();
  cleanupRecentAlerts(now);

  const previous = recentAlerts.get(fingerprint);
  if (previous && now - previous < ALERT_DEDUP_WINDOW_MS) {
    return true;
  }

  recentAlerts.set(fingerprint, now);
  return false;
};

const buildAlertText = ({
  severity = "high",
  source = "backend",
  title = "Website error detected",
  message,
  statusCode,
  method,
  path,
  page,
  environment,
  stack,
  userAgent
}) => {
  const lines = [
    "BadamClasses error alert",
    `Severity: ${truncate(severity, 40)}`,
    `Source: ${truncate(source, 60)}`,
    `Title: ${truncate(title, 120)}`
  ];

  if (statusCode) lines.push(`Status: ${statusCode}`);
  if (method || path) lines.push(`Route: ${truncate([method, path].filter(Boolean).join(" "), 180)}`);
  if (page) lines.push(`Page: ${truncate(page, 180)}`);
  if (environment) lines.push(`Env: ${truncate(environment, 80)}`);
  if (message) lines.push(`Message: ${truncate(message, 800)}`);
  if (userAgent) lines.push(`Browser: ${truncate(userAgent, 180)}`);
  if (stack) lines.push(`Stack: ${truncate(stack, 1200)}`);

  return lines.join("\n");
};

export const notifyErrorAlert = async (payload) => {
  const telegramConfig = getTelegramConfig();
  if (!telegramConfig) {
    return { sent: false, reason: "telegram_not_configured" };
  }

  const fingerprint = truncate(
    [
      payload.source,
      payload.title,
      payload.message,
      payload.statusCode,
      payload.method,
      payload.path,
      payload.page
    ]
      .filter(Boolean)
      .join("|"),
    400
  );

  if (fingerprint && shouldSkipDuplicateAlert(fingerprint)) {
    return { sent: false, reason: "duplicate_suppressed" };
  }

  const text = buildAlertText({
    ...payload,
    environment: process.env.NODE_ENV || "development"
  });

  const response = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: telegramConfig.chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const failureText = await response.text();
    throw new Error(`Telegram alert failed: ${response.status} ${truncate(failureText, 200)}`);
  }

  return { sent: true };
};
