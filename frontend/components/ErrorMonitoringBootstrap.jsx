"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errorReporting";

const getEventTargetLabel = (target) => {
  if (!target || target === window) return "";

  const tagName = target.tagName ? String(target.tagName).toLowerCase() : "event-target";
  const source = target.currentSrc || target.src || target.href || target.id || target.name || "";
  return source ? `${tagName}: ${source}` : tagName;
};

const getReasonMessage = (reason) => {
  if (reason?.message) return reason.message;
  if (reason instanceof Event) {
    return `Unhandled browser event: ${reason.type || "unknown"}`;
  }
  return String(reason || "Unhandled promise rejection");
};

const getReasonStack = (reason) => {
  if (reason?.stack) return reason.stack;
  if (reason instanceof Event) {
    return getEventTargetLabel(reason.target);
  }
  return "";
};

const isHydrationDiagnostic = (message = "", stack = "") => {
  const text = `${message} ${stack}`.toLowerCase();
  return (
    text.includes("hydration failed") ||
    text.includes("hydration-mismatch") ||
    text.includes("server rendered html didn't match") ||
    text.includes("server rendered html did not match")
  );
};

export default function ErrorMonitoringBootstrap() {
  useEffect(() => {
    const handleWindowError = (event) => {
      const isResourceEvent = !(event instanceof ErrorEvent) && event.target && event.target !== window;
      const targetLabel = getEventTargetLabel(event.target);
      const message = event.message || (targetLabel ? `Resource failed to load: ${targetLabel}` : "Unhandled browser error");
      const stack = event.error?.stack || event.filename || targetLabel;

      if (isResourceEvent && event.target?.tagName === "IMG") {
        event.preventDefault();
        return;
      }

      if (isHydrationDiagnostic(message, stack)) {
        event.preventDefault();
        return;
      }

      void reportClientError({
        source: "frontend-window",
        title: "Window error",
        message,
        stack,
        page: window.location.href
      }).catch(() => {});
    };

    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      if (reason instanceof Event) {
        event.preventDefault();
      }
      const message = getReasonMessage(reason);
      const stack = getReasonStack(reason);

      if (isHydrationDiagnostic(message, stack)) {
        event.preventDefault();
        return;
      }

      void reportClientError({
        source: "frontend-promise",
        title: "Unhandled promise rejection",
        message,
        stack,
        page: window.location.href
      }).catch(() => {});
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
