"use client";

import ClientOnly from "@/components/live/ClientOnly";
import { YOUTUBE_IFRAME_ALLOW, buildYouTubeEmbedUrl, normalizeLiveStatus } from "@/lib/youtubeEmbed";

function PlayerFallback({ status = "unknown", loading = false, message = "", onRefresh }) {
  const isOffline = status === "offline" || status === "upcoming";
  const isPrivate = status === "private" || status === "unavailable";
  const isError = status === "error";

  return (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#08111f_44%,#020617_100%)] p-6 text-center text-slate-200">
      <div className="max-w-xl">
        <span
          className={`inline-flex rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
            isPrivate || isError
              ? "border-orange-300/40 bg-orange-500/15 text-orange-100"
              : isOffline
                ? "border-slate-300/30 bg-white/10 text-slate-200"
                : "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
          }`}
        >
          {loading ? "Checking" : isOffline ? "Offline" : isPrivate ? "Embed Blocked" : isError ? "Check Failed" : "Live Class"}
        </span>
        <h4 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
          {isOffline
            ? "Live class abhi active nahi hai"
            : isPrivate
              ? "YouTube visibility update required"
              : isError
                ? "Live status verify nahi ho saka"
                : "Live player ready ho raha hai"}
        </h4>
        <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
          {message ||
            (isPrivate
              ? "YouTube Studio me stream ko Unlisted/Public karein aur Allow embedding enabled rakhein. Private streams website iframe me users ke liye play nahi hoti."
              : "Agar stream start ho chuki hai, player refresh karke dobara check karein. Status automatically refresh hota rahega.")}
        </p>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="btn-gradient btn-anim mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white"
          >
            Refresh Player
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SecureYouTubePlayer({
  sourceUrl,
  title = "Live Class",
  liveStatus = null,
  loading = false,
  playerKey = 0,
  onRefresh,
  className = "h-full w-full bg-black",
  fallbackClassName = ""
}) {
  const normalizedStatus = liveStatus ? normalizeLiveStatus(liveStatus, sourceUrl, typeof window !== "undefined" ? window.location.origin : "") : null;
  const embedUrl =
    normalizedStatus?.embeddable && normalizedStatus.embedUrl
      ? normalizedStatus.embedUrl
      : !normalizedStatus
        ? buildYouTubeEmbedUrl(sourceUrl, { origin: typeof window !== "undefined" ? window.location.origin : "" })
        : "";

  return (
    <ClientOnly
      fallback={
        <div className={`${fallbackClassName} flex h-full min-h-[320px] items-center justify-center bg-black p-6 text-slate-400`}>
          Loading secure player...
        </div>
      }
    >
      {embedUrl ? (
        <iframe
          key={`${embedUrl}-${playerKey}`}
          src={embedUrl}
          title={title}
          allow={YOUTUBE_IFRAME_ALLOW}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={className}
        />
      ) : (
        <PlayerFallback
          status={normalizedStatus?.status}
          loading={loading}
          message={normalizedStatus?.message}
          onRefresh={onRefresh}
        />
      )}
    </ClientOnly>
  );
}
