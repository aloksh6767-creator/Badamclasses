"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const isHlsUrl = (url = "") => /\.m3u8(?:$|\?)/i.test(String(url || ""));

export default function CustomLivePlayer({ sourceUrl = "", streamType = "hls", title = "Live Class", className = "" }) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const usesHls = useMemo(() => streamType === "hls" || isHlsUrl(sourceUrl), [sourceUrl, streamType]);
  const isLiveDuration = !Number.isFinite(duration) || duration <= 0 || duration > 100000;
  const progress = isLiveDuration ? 100 : Math.min((currentTime / duration) * 100, 100);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceUrl) return undefined;

    let hls;
    let cancelled = false;
    setError("");
    setReady(false);

    const attach = async () => {
      if (usesHls && video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
      } else if (usesHls) {
        try {
          const Hls = (await import("hls.js")).default;
          if (cancelled) return;
          if (!Hls.isSupported()) {
            setError("This browser does not support HLS playback.");
            return;
          }
          hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
        } catch {
          setError("HLS player could not load.");
        }
      } else {
        video.src = sourceUrl;
      }
    };

    attach();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [sourceUrl, usesHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setError("Playback could not start. Tap play again.");
      }
    } else {
      video.pause();
    }
  };

  const seek = (event) => {
    const video = videoRef.current;
    if (!video || isLiveDuration) return;
    video.currentTime = (Number(event.target.value || 0) / 100) * duration;
  };

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await shell.requestFullscreen();
    }
  };

  return (
    <div ref={shellRef} className={`${className} group relative overflow-hidden bg-black`}>
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
        onCanPlay={() => setReady(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onError={() => setError("Video stream could not be loaded.")}
      />

      {!ready || error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 p-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">{usesHls ? "HLS Live Stream" : "MP4 Video"}</p>
            <h3 className="mt-3 font-display text-2xl text-white">{error || "Player ready ho raha hai"}</h3>
            <p className="mt-2 text-sm text-slate-300">{title}</p>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-12">
        <input
          type="range"
          min="0"
          max="100"
          value={progress || 0}
          onChange={seek}
          disabled={isLiveDuration}
          className="h-1 w-full accent-cyan-300 disabled:opacity-70"
          aria-label="Video progress"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-white">
          <button type="button" onClick={togglePlay} className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => setMuted((value) => !value)} className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            {muted ? "Unmute" : "Mute"}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => {
              setMuted(false);
              setVolume(Number(event.target.value || 0));
            }}
            className="w-24 accent-cyan-300"
            aria-label="Volume"
          />
          <span className="text-xs text-slate-300">
            {isLiveDuration ? "LIVE" : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>
          <button type="button" onClick={toggleFullscreen} className="ml-auto rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
}
