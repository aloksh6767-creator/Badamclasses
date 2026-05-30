import Constants from "expo-constants";
import { clearExpiredAuth, getToken } from "./auth";

const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
const primaryApiUrl = envApiUrl || extraApiUrl || "http://127.0.0.1:5000/api";
const fallbackApiUrl = primaryApiUrl.includes("localhost")
  ? primaryApiUrl.replace("localhost", "127.0.0.1")
  : primaryApiUrl.replace("127.0.0.1", "localhost");
const REQUEST_TIMEOUT_MS = 10000;

const mapApiError = async (message) => {
  const normalized = String(message || "").trim();
  const lowered = normalized.toLowerCase();

  if (lowered.includes("token invalid or expired") || lowered.includes("not authorized") || lowered.includes("invalid token user")) {
    await clearExpiredAuth();
    return "Session expired. Please login again.";
  }

  if (lowered.includes("network request failed") || lowered.includes("failed to fetch") || lowered.includes("econnrefused")) {
    return "Server is temporarily unavailable. Please check backend/API URL.";
  }

  if (lowered.includes("aborted") || lowered.includes("timed out")) {
    return "Server response is taking too long. Please retry.";
  }

  return normalized || "Request failed. Please try again.";
};

const buildHeaders = async (options = {}) => {
  const token = await getToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  return {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const tryFetchJson = async (baseUrl, path, options, headers) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const msg = typeof data === "string" ? data : data?.message;
      throw new Error(msg || "Request failed");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

export const apiFetch = async (path, options = {}) => {
  const headers = await buildHeaders(options);

  try {
    return await tryFetchJson(primaryApiUrl, path, options, headers);
  } catch (error) {
    try {
      return await tryFetchJson(fallbackApiUrl, path, options, headers);
    } catch (fallbackError) {
      throw new Error(await mapApiError(fallbackError?.message || error?.message));
    }
  }
};

export const getApiUrl = (path = "") => `${primaryApiUrl}${path}`;
