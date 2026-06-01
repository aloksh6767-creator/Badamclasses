"use client";

import { useEffect } from "react";

export default function PwaBootstrap() {
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

  return null;
}
