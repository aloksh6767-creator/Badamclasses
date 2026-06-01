const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const channelIdCache = new Map();

const jsonResponse = (res, payload) => res.json({
  provider: "youtube",
  status: "unknown",
  embeddable: false,
  videoId: "",
  embedUrl: "",
  watchUrl: "",
  title: "",
  message: "",
  checkedAt: new Date().toISOString(),
  ...payload
});

const parseYouTubeUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    const lowerPath = path.toLowerCase();

    if (host.includes("youtu.be")) {
      const videoId = path.split("/").filter(Boolean)[0];
      return videoId ? { type: "video", videoId } : null;
    }

    if (!host.includes("youtube.com")) return null;

    if (parsed.searchParams.get("v")) {
      return { type: "video", videoId: parsed.searchParams.get("v") };
    }

    if (lowerPath.startsWith("/shorts/")) {
      const videoId = path.split("/").filter(Boolean)[1];
      return videoId ? { type: "video", videoId } : null;
    }

    if (lowerPath.startsWith("/embed/") && lowerPath !== "/embed/live_stream") {
      const videoId = path.split("/").filter(Boolean)[1];
      return videoId ? { type: "video", videoId } : null;
    }

    if (lowerPath === "/embed/live_stream" && parsed.searchParams.get("channel")) {
      return { type: "channel", channelId: parsed.searchParams.get("channel") };
    }

    const channelMatch = path.match(/^\/channel\/([^/]+)\/live\/?$/i);
    if (channelMatch?.[1]) {
      return { type: "channel", channelId: channelMatch[1] };
    }

    const handleLiveMatch = path.match(/^\/(@[^/]+)\/live\/?$/i);
    if (handleLiveMatch?.[1]) {
      return { type: "handle", handle: handleLiveMatch[1], livePageUrl: raw };
    }

    const customLiveMatch = path.match(/^\/(c\/[^/]+|user\/[^/]+)\/live\/?$/i);
    if (customLiveMatch?.[1]) {
      return { type: "customLivePage", livePageUrl: raw };
    }
  } catch {
    return null;
  }

  return null;
};

const youtubeFetch = async (path, params) => {
  const url = new URL(`${YOUTUBE_API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || `YouTube API failed with ${response.status}`);
  }

  return data;
};

const resolveChannelIdByHandle = async (handle, apiKey) => {
  const normalizedHandle = String(handle || "").trim();
  if (!normalizedHandle) return "";

  const cacheKey = normalizedHandle.toLowerCase();
  const cached = channelIdCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.channelId;
  }

  const data = await youtubeFetch("/channels", {
    key: apiKey,
    part: "id",
    forHandle: normalizedHandle
  });
  const channelId = data?.items?.[0]?.id || "";
  channelIdCache.set(cacheKey, {
    channelId,
    expiresAt: Date.now() + 6 * 60 * 60 * 1000
  });
  return channelId;
};

const getVideoStatus = async (videoId, apiKey) => {
  const data = await youtubeFetch("/videos", {
    key: apiKey,
    id: videoId,
    part: "snippet,status,liveStreamingDetails"
  });
  const item = data?.items?.[0];

  if (!item) {
    return {
      status: "unavailable",
      embeddable: false,
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      message: "YouTube video is private, deleted, or unavailable."
    };
  }

  const privacyStatus = item.status?.privacyStatus || "unknown";
  const liveBroadcastContent = item.snippet?.liveBroadcastContent || "none";
  const isLive = liveBroadcastContent === "live" || Boolean(item.liveStreamingDetails?.actualStartTime && !item.liveStreamingDetails?.actualEndTime);
  const isUpcoming = liveBroadcastContent === "upcoming";
  const embeddable = Boolean(item.status?.embeddable);
  const visibleInsideSite = privacyStatus === "public" || privacyStatus === "unlisted";
  const status = !visibleInsideSite
    ? "private"
    : isLive
      ? "live"
      : isUpcoming
        ? "upcoming"
        : "offline";

  return {
    status,
    embeddable: status === "live" && embeddable,
    videoId,
    embedUrl: status === "live" && embeddable ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1` : "",
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title: item.snippet?.title || "",
    message: status === "private"
      ? "YouTube live stream is Private. Set visibility to Unlisted or Public and keep Allow embedding enabled."
      : embeddable
        ? ""
        : "YouTube live stream has embedding disabled. Enable embedding in YouTube Studio."
  };
};

const findChannelLiveVideo = async (channelId, apiKey) => {
  const data = await youtubeFetch("/search", {
    key: apiKey,
    channelId,
    eventType: "live",
    type: "video",
    part: "snippet",
    maxResults: "1"
  });
  const videoId = data?.items?.[0]?.id?.videoId;
  return videoId || "";
};

const getChannelLiveStandbyStatus = (channelId) => ({
  status: "offline",
  embeddable: false,
  embedUrl: "",
  watchUrl: `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`,
  message: "No public live stream is active on this channel. Use a direct video URL for unlisted streams, or make the stream Public for automatic channel live detection."
});

export const getLiveStatus = async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();
  const parsed = parseYouTubeUrl(rawUrl);
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "";

  if (!parsed) {
    return jsonResponse(res, {
      provider: rawUrl ? "external" : "unknown",
      status: rawUrl ? "external" : "unavailable",
      watchUrl: rawUrl,
      message: rawUrl ? "External live URL cannot be embedded safely." : "Live URL missing."
    });
  }

  if (!apiKey) {
    const watchUrl = parsed.videoId
      ? `https://www.youtube.com/watch?v=${parsed.videoId}`
      : parsed.channelId
        ? `https://www.youtube.com/channel/${encodeURIComponent(parsed.channelId)}/live`
        : parsed.livePageUrl || rawUrl;

    return jsonResponse(res, {
      status: "unknown",
      embeddable: false,
      videoId: parsed.videoId || "",
      watchUrl,
      message: "YouTube API key is not configured, so private/offline live status cannot be verified before loading the player."
    });
  }

  try {
    if (parsed.type === "video") {
      return jsonResponse(res, await getVideoStatus(parsed.videoId, apiKey));
    }

    if (parsed.type === "channel") {
      const videoId = await findChannelLiveVideo(parsed.channelId, apiKey);
      if (!videoId) {
        return jsonResponse(res, getChannelLiveStandbyStatus(parsed.channelId));
      }

      return jsonResponse(res, await getVideoStatus(videoId, apiKey));
    }

    if (parsed.type === "handle") {
      const channelId = await resolveChannelIdByHandle(parsed.handle, apiKey);
      if (!channelId) {
        return jsonResponse(res, {
          status: "unavailable",
          embeddable: false,
          watchUrl: parsed.livePageUrl || rawUrl,
          message: "YouTube handle se channel ID resolve nahi ho saka. Channel ID live URL save karein."
        });
      }

      const videoId = await findChannelLiveVideo(channelId, apiKey);
      if (!videoId) {
        return jsonResponse(res, {
          ...getChannelLiveStandbyStatus(channelId),
          watchUrl: parsed.livePageUrl || `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`
        });
      }

      return jsonResponse(res, await getVideoStatus(videoId, apiKey));
    }

    return jsonResponse(res, {
      status: "unknown",
      embeddable: false,
      watchUrl: parsed.livePageUrl,
      message: "Use a channel ID, @handle live URL, or direct video URL for automatic live verification."
    });
  } catch (error) {
    return jsonResponse(res, {
      status: "error",
      embeddable: false,
      watchUrl: rawUrl,
      message: error.message || "Unable to verify YouTube live status."
    });
  }
};
