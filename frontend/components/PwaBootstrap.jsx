"use client";

import { useEffect } from "react";

export default function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

    if (process.env.NODE_ENV !== "production" || isLocalHost) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith("badamclasses-")).map((key) => caches.delete(key))))
          .catch(() => undefined);
      }
      return;
    }

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
