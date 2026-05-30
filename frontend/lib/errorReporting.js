import { getFallbackApiUrl, getPrimaryApiUrl } from "@/lib/apiConfig";

const primaryApiUrl = getPrimaryApiUrl();
const fallbackApiUrl = getFallbackApiUrl(primaryApiUrl);
const FRONTEND_ALERT_KEY = "bsc_frontend_alerts";
const ALERT_TTL_MS = 60 * 1000;

const truncate = (value, maxLength = 1200) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
};

const getAlertFingerprint = (payload) => {
  return truncate([payload.source, payload.title, payload.message, payload.page].filter(Boolean).join("|"), 300);
};

const shouldSkipDuplicate = (fingerprint) => {
  if (typeof window === "undefined" || !fingerprint) return false;

  try {
    const now = Date.now();
    const raw = window.sessionStorage.getItem(FRONTEND_ALERT_KEY);
    const entries = raw ? JSON.parse(raw) : {};

    Object.keys(entries).forEach((key) => {
      if (now - entries[key] > ALERT_TTL_MS) {
        delete entries[key];
      }
    });

    if (entries[fingerprint] && now - entries[fingerprint] < ALERT_TTL_MS) {
      return true;
    }

    entries[fingerprint] = now;
    window.sessionStorage.setItem(FRONTEND_ALERT_KEY, JSON.stringify(entries));
  } catch {
    return false;
  }

  return false;
};

const postAlert = async (baseUrl, payload) => {
  const response = await fetch(`${baseUrl}/monitoring/frontend-error`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    keepalive: true
  });

  if (!response.ok) {
    throw new Error(`Frontend alert request failed with ${response.status}`);
  }
};

export const reportClientError = async ({ source, title, message, stack, page }) => {
  if (!primaryApiUrl) {
    return;
  }

  const payload = {
    source: truncate(source, 80) || "frontend",
    title: truncate(title, 120) || "Frontend runtime error",
    message: truncate(message, 800) || "Unknown frontend error",
    stack: truncate(stack, 2000),
    page: truncate(page || (typeof window !== "undefined" ? window.location.href : ""), 200)
  };

  const fingerprint = getAlertFingerprint(payload);
  if (shouldSkipDuplicate(fingerprint)) {
    return;
  }

  try {
    await postAlert(primaryApiUrl, payload);
  } catch {
    if (!fallbackApiUrl) {
      return;
    }

    try {
      await postAlert(fallbackApiUrl, payload);
    } catch {
      // Monitoring must never create a user-facing runtime error.
    }
  }
};
