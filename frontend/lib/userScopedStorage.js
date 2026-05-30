"use client";

const USER_STORAGE_KEY = "user";
const LEGACY_USER_STORAGE_KEY = "bsc_user";
const USER_STORAGE_EVENT = "bsc:user-storage-updated";

const normalizeStorageSegment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function readCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    if (raw && !window.localStorage.getItem(USER_STORAGE_KEY)) {
      window.localStorage.setItem(USER_STORAGE_KEY, raw);
    }
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUserStorageId(user = readCurrentUser()) {
  if (!user || typeof user !== "object") return "";
  return normalizeStorageSegment(user._id || user.id || user.email || user.phone || user.mobile || user.name);
}

function emitStorageUpdate(baseKey, scopedKey) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_STORAGE_EVENT, {
      detail: { baseKey, scopedKey }
    })
  );
}

function migrateLegacyValue(baseKey, scopedKey) {
  if (typeof window === "undefined" || scopedKey === baseKey) return null;

  const scopedValue = window.localStorage.getItem(scopedKey);
  if (scopedValue !== null) return scopedValue;

  const legacyValue = window.localStorage.getItem(baseKey);
  if (legacyValue !== null) {
    window.localStorage.setItem(scopedKey, legacyValue);
    return legacyValue;
  }

  return null;
}

function isEmptyJsonValue(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export function getUserScopedStorageEventName() {
  return USER_STORAGE_EVENT;
}

export function getUserScopedStorageKey(baseKey, user) {
  const userId = getUserStorageId(user);
  return userId ? `${baseKey}::${userId}` : baseKey;
}

export function readUserScopedString(baseKey, fallback = "") {
  if (typeof window === "undefined") return fallback;
  const scopedKey = getUserScopedStorageKey(baseKey);

  try {
    const migratedValue = migrateLegacyValue(baseKey, scopedKey);
    const raw = migratedValue ?? window.localStorage.getItem(scopedKey);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeUserScopedString(baseKey, value) {
  if (typeof window === "undefined") return;
  const scopedKey = getUserScopedStorageKey(baseKey);
  const nextValue = String(value || "");

  if (!nextValue) {
    window.localStorage.removeItem(scopedKey);
    emitStorageUpdate(baseKey, scopedKey);
    return;
  }

  window.localStorage.setItem(scopedKey, nextValue);
  emitStorageUpdate(baseKey, scopedKey);
}

export function readUserScopedJson(baseKey, fallback) {
  if (typeof window === "undefined") return fallback;
  const scopedKey = getUserScopedStorageKey(baseKey);

  try {
    const migratedValue = migrateLegacyValue(baseKey, scopedKey);
    const raw = migratedValue ?? window.localStorage.getItem(scopedKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeUserScopedJson(baseKey, value) {
  if (typeof window === "undefined") return;
  const scopedKey = getUserScopedStorageKey(baseKey);

  if (isEmptyJsonValue(value)) {
    window.localStorage.removeItem(scopedKey);
    emitStorageUpdate(baseKey, scopedKey);
    return;
  }

  window.localStorage.setItem(scopedKey, JSON.stringify(value));
  emitStorageUpdate(baseKey, scopedKey);
}

export function removeUserScopedValue(baseKey) {
  if (typeof window === "undefined") return;
  const scopedKey = getUserScopedStorageKey(baseKey);
  window.localStorage.removeItem(scopedKey);
  emitStorageUpdate(baseKey, scopedKey);
}
