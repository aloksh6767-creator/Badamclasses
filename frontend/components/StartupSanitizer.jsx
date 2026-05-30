"use client";

import { useEffect } from "react";
import { cleanupInvalidStoredUrls } from "@/lib/storageSanitizer";

export default function StartupSanitizer() {
  useEffect(() => {
    cleanupInvalidStoredUrls();
  }, []);

  return null;
}
