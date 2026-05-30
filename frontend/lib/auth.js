const TOKEN_KEY = "token";
const USER_KEY = "user";
const LEGACY_TOKEN_KEY = "bsc_token";
const LEGACY_USER_KEY = "bsc_user";

const readStorageValue = (primaryKey, legacyKey) => {
  if (typeof window === "undefined") return null;

  const primaryValue = localStorage.getItem(primaryKey);
  if (primaryValue !== null) {
    return primaryValue;
  }

  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    localStorage.setItem(primaryKey, legacyValue);
    return legacyValue;
  }

  return null;
};

export function saveAuth(token, user) {
  if (typeof window === "undefined") return;
  if (!token || !user) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function getToken() {
  return readStorageValue(TOKEN_KEY, LEGACY_TOKEN_KEY);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = readStorageValue(USER_KEY, LEGACY_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    return null;
  }
}

export const setStoredUser = (user) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const isAdminUser = (user) => {
  return user?.role === "admin" || user?.role === "instructor";
};

export const getDefaultRouteForUser = (user) => {
  return isAdminUser(user) ? "/admin" : "/dashboard";
};

export const getSafeRedirectPath = (value, fallback = "/dashboard") => {
  const redirect = String(value || "").trim();
  if (!redirect) return fallback;
  if (!redirect.startsWith("/")) return fallback;
  if (redirect.startsWith("//")) return fallback;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(redirect)) return fallback;
  return redirect;
};

export const logout = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const clearExpiredAuth = () => {
  if (typeof window === "undefined") return;
  logout();
};
