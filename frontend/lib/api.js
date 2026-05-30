import { clearExpiredAuth, getToken } from "@/lib/auth";
import { getFallbackApiUrl, getMissingApiUrlMessage, getPrimaryApiUrl, getPublicApiUrl } from "@/lib/apiConfig";

const primaryApiUrl = getPrimaryApiUrl();
const fallbackApiUrl = getFallbackApiUrl(primaryApiUrl);
const REQUEST_TIMEOUT_MS = 8000;

const mapApiError = (message) => {
  const normalized = String(message || "").trim();
  const lowered = normalized.toLowerCase();

  if (!normalized) {
    return "Server is temporarily unavailable. Please try again.";
  }

  if (lowered.includes("database temporarily unavailable") || lowered.includes("database_unavailable")) {
    return "Server database is temporarily unavailable. Please try again.";
  }

  if (lowered.includes("token invalid or expired") || lowered.includes("not authorized") || lowered.includes("invalid token user")) {
    clearExpiredAuth();
    return "Session expired. Please login again.";
  }

  if (lowered.includes("request timed out") || lowered.includes("aborted")) {
    return "Server response is taking too long. Please retry in a moment.";
  }

  if (
    lowered.includes("failed to fetch") ||
    lowered.includes("networkerror") ||
    lowered.includes("network error") ||
    lowered.includes("econnrefused")
  ) {
    return "Server is temporarily unavailable. Please try again.";
  }

  return normalized;
};

const tryFetchJson = async (baseUrl, path, options, headers) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Backend is taking too long to respond.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const msg = typeof data === "string" ? data : data?.message;
    throw new Error(msg || "Request failed");
  }

  return data;
};

const buildHeaders = (options = {}) => {
  const token = getToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const apiFetch = async (path, options = {}) => {
  if (!primaryApiUrl) {
    throw new Error(getMissingApiUrlMessage());
  }

  const headers = buildHeaders(options);

  try {
    return await tryFetchJson(primaryApiUrl, path, options, headers);
  } catch (error) {
    if (!fallbackApiUrl) {
      throw new Error(mapApiError(error?.message));
    }

    try {
      return await tryFetchJson(fallbackApiUrl, path, options, headers);
    } catch (fallbackError) {
      throw new Error(mapApiError(fallbackError?.message || error?.message));
    }
  }
};

export const getApiUrl = getPublicApiUrl;
