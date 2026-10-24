"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Clean up any old caches that might still be stored in the browser
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) caches.delete(key);
      });
    }

    // Register service worker for push notifications and ensure it updates to latest sw.js
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update())
      .catch(() => {});
  }, []);

  return null;
}
