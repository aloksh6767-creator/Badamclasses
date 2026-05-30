export const YOUTUBE_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

export const YOUTUBE_LIVE_STATUS_REFRESH_MS = 30000;

const YOUTUBE_NOCOOKIE_HOST = "www.youtube-nocookie.com";
const YOUTUBE_WATCH_HOST = "www.youtube.com";

const safeUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;

  try {
    return new URL(raw);
  } catch {
    return null;
  }
};

const isYouTubeHost = (host = "") => {
  const normalized = String(host || "").toLowerCase();
  return (
    normalized === "youtu.be" ||
    normalized.endsWith(".youtu.be") ||
    normalized === "youtube.com" ||
    normalized.endsWith(".youtube.com") ||
    normalized === "youtube-nocookie.com" ||
    normalized.endsWith(".youtube-nocookie.com")
  );
};

export function parseYouTubeUrl(value = "") {
  const parsed = safeUrl(value);
  if (!parsed || !isYouTubeHost(parsed.hostname)) return null;

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;
  const lowerPath = pathname.toLowerCase();

  if (host.includes("youtu.be")) {
    const videoId = pathname.split("/").filter(Boolean)[0];
    return videoId ? { type: "video", videoId } : null;
  }

  const videoId = parsed.searchParams.get("v");
  if (videoId) return { type: "video", videoId };

  if (lowerPath.startsWith("/shorts/")) {
    const shortsId = pathname.split("/").filter(Boolean)[1];
    return shortsId ? { type: "video", videoId: shortsId } : null;
  }

  if (lowerPath.startsWith("/embed/") && lowerPath !== "/embed/live_stream") {
    const embeddedId = pathname.split("/").filter(Boolean)[1];
    return embeddedId ? { type: "video", videoId: embeddedId } : null;
  }

  if (lowerPath === "/embed/live_stream" && parsed.searchParams.get("channel")) {
    return { type: "channel", channelId: parsed.searchParams.get("channel") };
  }

  const channelMatch = pathname.match(/^\/channel\/([^/]+)\/live\/?$/i);
  if (channelMatch?.[1]) {
    return { type: "channel", channelId: channelMatch[1] };
  }

  const livePageMatch = pathname.match(/^\/(@[^/]+|c\/[^/]+|user\/[^/]+)\/live\/?$/i);
  if (livePageMatch?.[1]) {
    return { type: "livePage", livePageUrl: parsed.toString() };
  }

  if (lowerPath === "/live") {
    return { type: "livePage", livePageUrl: parsed.toString() };
  }

  return null;
}

export function isYouTubeLiveUrl(value = "") {
  const parsed = parseYouTubeUrl(value);
  return Boolean(parsed && parsed.type !== "video");
}

export function getYouTubeWatchUrl(value = "") {
  const parsed = parseYouTubeUrl(value);
  if (!parsed) return String(value || "").trim();

  if (parsed.type === "video") {
    return `https://${YOUTUBE_WATCH_HOST}/watch?v=${encodeURIComponent(parsed.videoId)}`;
  }

  if (parsed.type === "channel") {
    return `https://${YOUTUBE_WATCH_HOST}/channel/${encodeURIComponent(parsed.channelId)}/live`;
  }

  return parsed.livePageUrl || String(value || "").trim();
}

export function buildYouTubeEmbedUrl(value = "", options = {}) {
  const parsed = parseYouTubeUrl(value);
  if (!parsed) return "";
  if (parsed.type === "livePage") return "";

  const embedUrl = new URL(
    parsed.type === "video"
      ? `https://${YOUTUBE_NOCOOKIE_HOST}/embed/${encodeURIComponent(parsed.videoId)}`
      : `https://${YOUTUBE_NOCOOKIE_HOST}/embed/live_stream`
  );

  if (!embedUrl.pathname || embedUrl.pathname === "/") return "";

  if (parsed.type === "channel") {
    embedUrl.searchParams.set("channel", parsed.channelId);
  }

  embedUrl.searchParams.set("autoplay", options.autoplay === false ? "0" : "1");
  embedUrl.searchParams.set("rel", "0");
  embedUrl.searchParams.set("modestbranding", "1");
  embedUrl.searchParams.set("playsinline", "1");

  if (options.origin) {
    embedUrl.searchParams.set("origin", options.origin);
  }

  return embedUrl.toString();
}

export function normalizeLiveStatus(status = {}, sourceUrl = "", origin = "") {
  const localEmbedUrl = buildYouTubeEmbedUrl(status.embedUrl || sourceUrl, { origin });
  const watchUrl = status.watchUrl || getYouTubeWatchUrl(sourceUrl);

  return {
    provider: status.provider || "youtube",
    status: status.status || "unknown",
    embeddable: Boolean(status.embeddable && (status.embedUrl || localEmbedUrl)),
    videoId: status.videoId || "",
    embedUrl: status.embeddable ? buildYouTubeEmbedUrl(status.embedUrl || localEmbedUrl || sourceUrl, { origin }) : "",
    watchUrl,
    title: status.title || "",
    message: status.message || "",
    checkedAt: status.checkedAt || ""
  };
}
