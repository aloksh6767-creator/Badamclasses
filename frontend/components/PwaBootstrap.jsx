"use client";

import { useEffect, useState } from "react";

export default function PwaBootstrap() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("[pwa] service worker registration failed", error);
      }
    };

    registerWorker();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <div className="app-logo-splash" aria-label="Badam Singh Classes loading">
      <div className="app-logo-splash-card">
        <span className="app-logo-splash-ring" />
        <img src="/new-logo.png" alt="Badam Singh Classes" />
        <span className="app-logo-splash-shine" />
      </div>
    </div>
  );
}
