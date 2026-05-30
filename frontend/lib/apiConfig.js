const LOCAL_API_URL = "http://localhost:5000/api";

const trimTrailingSlash = (value = "") => String(value || "").trim().replace(/\/+$/, "");

export const getPrimaryApiUrl = () => {
  const configuredUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  return process.env.NODE_ENV === "production" ? "" : LOCAL_API_URL;
};

export const getFallbackApiUrl = (primaryApiUrl = getPrimaryApiUrl()) => {
  if (!primaryApiUrl || process.env.NODE_ENV === "production") {
    return "";
  }

  if (primaryApiUrl.includes("localhost")) {
    return primaryApiUrl.replace("localhost", "127.0.0.1");
  }

  if (primaryApiUrl.includes("127.0.0.1")) {
    return primaryApiUrl.replace("127.0.0.1", "localhost");
  }

  return "";
};

export const getPublicApiUrl = (path = "") => {
  const primaryApiUrl = getPrimaryApiUrl();
  return primaryApiUrl ? `${primaryApiUrl}${path}` : "";
};

export const getMissingApiUrlMessage = () =>
  "Production API URL is not configured. Set NEXT_PUBLIC_API_URL to your deployed backend /api URL.";
