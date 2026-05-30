"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { YOUTUBE_LIVE_STATUS_REFRESH_MS, getYouTubeWatchUrl, normalizeLiveStatus } from "@/lib/youtubeEmbed";

export default function LiveStatusChecker({
  sourceUrl,
  enabled = true,
  children,
  refreshMs = YOUTUBE_LIVE_STATUS_REFRESH_MS
}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !sourceUrl) {
      setStatus(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const checkStatus = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/live-status?url=${encodeURIComponent(sourceUrl)}`);
        if (!cancelled) {
          setStatus(normalizeLiveStatus(data, sourceUrl, window.location.origin));
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            provider: "youtube",
            status: "error",
            embeddable: false,
            videoId: "",
            embedUrl: "",
            watchUrl: getYouTubeWatchUrl(sourceUrl),
            title: "",
            message: error?.message || "Live status check failed.",
            checkedAt: new Date().toISOString()
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkStatus();
    const intervalId = window.setInterval(checkStatus, refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshKey, refreshMs, sourceUrl]);

  return children({ status, loading, refresh });
}
