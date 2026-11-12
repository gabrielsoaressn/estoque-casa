"use client";

import { useEffect } from "react";

/**
 * Registra o service worker só na versão web (PWA instalável e offline).
 * Dentro do APK (Capacitor) os arquivos já são locais, então não precisa.
 */
export function ServiceWorker() {
  useEffect(() => {
    const isNative = "Capacitor" in window && (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (isNative || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
