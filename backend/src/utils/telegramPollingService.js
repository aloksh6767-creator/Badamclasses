import { processTelegramAdminMessage } from "../controllers/automationController.js";
import { getFeatureFlags, getAutomationSnapshot, updateTelegramRuntime } from "./automationStorage.js";
import { clearTelegramWebhook, getTelegramAdminConfig, getTelegramUpdates, parseTelegramUpdate } from "./telegramAdminBot.js";

let pollingTimer = null;
let pollingInFlight = false;

const POLL_INTERVAL_MS = 5000;

const pollTelegramOnce = async () => {
  if (pollingInFlight) {
    return;
  }

  const config = getTelegramAdminConfig();
  const flags = getFeatureFlags();
  if (!config?.botToken || !flags.telegramBotEnabled) {
    return;
  }

  pollingInFlight = true;
  try {
    const snapshot = getAutomationSnapshot();
    const offset = Number(snapshot.telegram?.lastUpdateId || 0) + 1;
    const updates = await getTelegramUpdates({ offset, timeout: 0 });

    if (!updates.length) {
      updateTelegramRuntime({
        lastPollAt: new Date().toISOString(),
        lastError: ""
      });
      return;
    }

    let lastUpdateId = Number(snapshot.telegram?.lastUpdateId || 0);
    for (const update of updates) {
      lastUpdateId = Math.max(lastUpdateId, Number(update?.update_id || 0));
      const { text, chatId, fromName } = parseTelegramUpdate(update);
      if (!text || !chatId) {
        continue;
      }
      await processTelegramAdminMessage({
        text,
        chatId,
        fromName,
        source: "polling"
      });
    }

    updateTelegramRuntime({
      lastUpdateId,
      lastPollAt: new Date().toISOString(),
      lastError: ""
    });
  } catch (error) {
    updateTelegramRuntime({
      lastPollAt: new Date().toISOString(),
      lastError: error.message || "telegram_poll_failed"
    });
    console.error("[telegram] polling failed:", error.message);
  } finally {
    pollingInFlight = false;
  }
};

export const startTelegramPollingService = async () => {
  const config = getTelegramAdminConfig();
  if (!config?.botToken) {
    return false;
  }

  try {
    await clearTelegramWebhook();
  } catch (error) {
    console.warn("[telegram] webhook clear failed:", error.message);
  }

  if (pollingTimer) {
    return true;
  }

  await pollTelegramOnce();
  pollingTimer = setInterval(() => {
    void pollTelegramOnce();
  }, POLL_INTERVAL_MS);

  console.log("[telegram] polling service started");
  return true;
};
