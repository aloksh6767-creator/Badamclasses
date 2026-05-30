const SLIDER_KEY = "badamclasses_slider_config";

export const makeBatchKey = (batch) => {
  return String(batch?.id || batch?._id || batch?.title || "");
};

export const getSliderConfig = () => {
  if (typeof window === "undefined") {
    return { order: [], hidden: [], pinned: null, liveNow: [], liveUntil: {}, autoLive: [], autoWindowMinutes: 120, manualLiveMinutes: 120 };
  }
  try {
    const raw = window.localStorage.getItem(SLIDER_KEY);
    return raw ? JSON.parse(raw) : { order: [], hidden: [], pinned: null, liveNow: [], liveUntil: {}, autoLive: [], autoWindowMinutes: 120, manualLiveMinutes: 120 };
  } catch {
    return { order: [], hidden: [], pinned: null, liveNow: [], liveUntil: {}, autoLive: [], autoWindowMinutes: 120, manualLiveMinutes: 120 };
  }
};

export const saveSliderConfig = (config) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SLIDER_KEY, JSON.stringify(config));
};

export const getLiveNowSet = (config) => new Set(config?.liveNow || []);
export const getAutoLiveSet = (config) => new Set(config?.autoLive || []);
export const getAutoWindowMinutes = (config) => Number(config?.autoWindowMinutes || 120);
export const getManualLiveMinutes = (config) => Number(config?.manualLiveMinutes || 120);
export const getLiveUntilMap = (config) => config?.liveUntil || {};

const parseTimeToMinutes = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const rangeStart = raw.split(/\s+(?:to|-|–)\s+/i)[0]?.trim();
  if (rangeStart && rangeStart !== raw) {
    return parseTimeToMinutes(rangeStart);
  }

  const ampmMatch = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2] || 0);
    const meridian = ampmMatch[3].toUpperCase();
    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFour = raw.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (twentyFour) {
    const hours = Number(twentyFour[1]);
    const minutes = Number(twentyFour[2] || 0);
    return hours * 60 + minutes;
  }

  return null;
};

const getBatchStartMinutes = (batch) => {
  return parseTimeToMinutes(batch?.startTime || batch?.batchTime);
};

const parseStartDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const alt = raw.replace(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/, "$2 $1 $3");
  const parsedAlt = new Date(alt);
  return Number.isNaN(parsedAlt.getTime()) ? null : parsedAlt;
};

export const isBatchLiveNowAuto = (batch, config, now = new Date()) => {
  const autoSet = getAutoLiveSet(config);
  if (!autoSet.has(makeBatchKey(batch))) return false;

  const startDate = parseStartDate(batch?.startDate);
  if (startDate) {
    const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (now < startOfDay) return false;
  }

  const batchMinutes = getBatchStartMinutes(batch);
  if (batchMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const windowMinutes = getAutoWindowMinutes(config);

  return currentMinutes >= batchMinutes && currentMinutes <= batchMinutes + windowMinutes;
};

export const isBatchLiveNowManual = (batch, config, now = new Date()) => {
  const key = makeBatchKey(batch);
  const liveUntil = getLiveUntilMap(config)[key];
  if (liveUntil) {
    const until = new Date(liveUntil);
    return now <= until;
  }
  const liveNow = getLiveNowSet(config);
  return liveNow.has(key);
};

export const isBatchLiveNow = (batch, config, now = new Date()) => {
  return isBatchLiveNowManual(batch, config, now) || isBatchLiveNowAuto(batch, config, now);
};

export const getLiveCountdown = (batch, config, now = new Date()) => {
  const key = makeBatchKey(batch);
  const liveUntil = getLiveUntilMap(config)[key];
  if (liveUntil) {
    const until = new Date(liveUntil);
    const remainingMs = Math.max(until.getTime() - now.getTime(), 0);
    const remaining = Math.ceil(remainingMs / 60000);
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return { remainingMinutes: remaining, label: `${hours ? `${hours}h ` : ""}${minutes}m left`, source: "manual" };
  }
  if (!isBatchLiveNowAuto(batch, config, now)) return null;
  const batchMinutes = getBatchStartMinutes(batch);
  if (batchMinutes === null) return null;
  const windowMinutes = getAutoWindowMinutes(config);
  const endMinutes = batchMinutes + windowMinutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const remaining = Math.max(endMinutes - currentMinutes, 0);
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return { remainingMinutes: remaining, label: `${hours ? `${hours}h ` : ""}${minutes}m left`, source: "auto" };
};

export const pruneExpiredLiveNow = (config, now = new Date()) => {
  if (!config?.liveUntil) return config;
  const liveUntil = { ...config.liveUntil };
  const liveNow = new Set(config.liveNow || []);
  let changed = false;
  Object.entries(liveUntil).forEach(([key, value]) => {
    const until = new Date(value);
    if (Number.isNaN(until.getTime()) || now > until) {
      delete liveUntil[key];
      if (liveNow.has(key)) liveNow.delete(key);
      changed = true;
    }
  });
  return changed ? { ...config, liveUntil, liveNow: Array.from(liveNow) } : config;
};

export const applySliderConfig = (batches, config) => {
  if (!Array.isArray(batches)) return [];
  const cfg = config || { order: [], hidden: [], pinned: null };
  const hiddenSet = new Set(cfg.hidden || []);
  const filtered = batches.filter((b) => !hiddenSet.has(makeBatchKey(b)));

  if (!cfg.order?.length) {
    return cfg.pinned
      ? [
          ...filtered.filter((b) => makeBatchKey(b) === cfg.pinned),
          ...filtered.filter((b) => makeBatchKey(b) !== cfg.pinned)
        ]
      : filtered;
  }

  const orderMap = new Map(cfg.order.map((key, idx) => [key, idx]));
  const sorted = [...filtered].sort((a, b) => {
    const ka = makeBatchKey(a);
    const kb = makeBatchKey(b);
    const ia = orderMap.has(ka) ? orderMap.get(ka) : Number.MAX_SAFE_INTEGER;
    const ib = orderMap.has(kb) ? orderMap.get(kb) : Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });

  if (cfg.pinned) {
    return [
      ...sorted.filter((b) => makeBatchKey(b) === cfg.pinned),
      ...sorted.filter((b) => makeBatchKey(b) !== cfg.pinned)
    ];
  }

  return sorted;
};

// Offer banner helpers
const OFFER_KEY = "badamclasses_offer_banner";

export const getOfferBanner = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OFFER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveOfferBanner = (banner) => {
  if (typeof window === "undefined") return;
  if (!banner) {
    window.localStorage.removeItem(OFFER_KEY);
    return;
  }
  window.localStorage.setItem(OFFER_KEY, JSON.stringify(banner));
};
