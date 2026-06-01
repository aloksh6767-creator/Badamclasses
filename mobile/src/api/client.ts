import Constants from "expo-constants";
import { getToken } from "./authStore";

const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://127.0.0.1:5000/api";

export const API_URL = configuredUrl.replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10000;

export type ApiError = Error & { status?: number };

const normalizeError = (message: string) => {
  const lowered = message.toLowerCase();
  if (lowered.includes("network") || lowered.includes("failed to fetch")) {
    return "Server is temporarily unavailable. Please try again.";
  }
  if (lowered.includes("token") || lowered.includes("not authorized")) {
    return "Session expired. Please login again.";
  }
  return message || "Request failed. Please try again.";
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = await getToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(typeof payload === "string" ? payload : payload?.message || "Request failed") as ApiError;
      error.status = response.status;
      throw error;
    }

    return payload as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    throw new Error(normalizeError(message));
  } finally {
    clearTimeout(timeout);
  }
}
