const buildTelegramApiUrl = (botToken, method) => `https://api.telegram.org/bot${botToken}/${method}`;

export const getTelegramAdminConfig = () => {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const configuredChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim();
  const webhookSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();

  if (!botToken) {
    return null;
  }

  return {
    botToken,
    configuredChatId,
    webhookSecret
  };
};

export const sendTelegramMessage = async ({ chatId, text }) => {
  const config = getTelegramAdminConfig();
  if (!config?.botToken || !chatId || !text) {
    return { sent: false, reason: "telegram_not_configured" };
  }

  const response = await fetch(buildTelegramApiUrl(config.botToken, "sendMessage"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: String(text).slice(0, 3900),
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const failure = await response.text();
    throw new Error(`Telegram send failed: ${response.status} ${failure}`);
  }

  return { sent: true };
};

export const getTelegramUpdates = async ({ offset, timeout = 0 } = {}) => {
  const config = getTelegramAdminConfig();
  if (!config?.botToken) {
    return [];
  }

  const response = await fetch(buildTelegramApiUrl(config.botToken, "getUpdates"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...(offset ? { offset } : {}),
      timeout
    })
  });

  if (!response.ok) {
    const failure = await response.text();
    throw new Error(`Telegram getUpdates failed: ${response.status} ${failure}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.result) ? payload.result : [];
};

export const clearTelegramWebhook = async () => {
  const config = getTelegramAdminConfig();
  if (!config?.botToken) {
    return { cleared: false, reason: "telegram_not_configured" };
  }

  const response = await fetch(buildTelegramApiUrl(config.botToken, "deleteWebhook"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      drop_pending_updates: false
    })
  });

  if (!response.ok) {
    const failure = await response.text();
    throw new Error(`Telegram deleteWebhook failed: ${response.status} ${failure}`);
  }

  return { cleared: true };
};

export const parseTelegramUpdate = (update = {}) => {
  const message = update?.message || update?.edited_message || null;
  const text = String(message?.text || "").trim();
  const chatId = message?.chat?.id ? String(message.chat.id) : "";
  const fromName = [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(" ").trim();

  return {
    message,
    text,
    chatId,
    fromName: fromName || message?.from?.username || "telegram-admin"
  };
};
