/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT
    Source: https://github.com/gzuidhof/coi-serviceworker
    Enables Cross-Origin Isolation (required for WebGPU / SharedArrayBuffer)
    without needing server-level COOP/COEP headers. */

/* eslint-disable no-restricted-globals */
if (typeof window === "undefined") {
  // ── Service Worker context ──────────────────────────────────────────────────
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) =>
    event.waitUntil(self.clients.claim())
  );

  async function handleFetch(request) {
    if (
      request.cache === "only-if-cached" &&
      request.mode !== "same-origin"
    ) {
      return;
    }

    const r = await fetch(request).catch(() => null);
    if (!r) return;

    const headers = new Headers(r.headers);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(r.body, {
      status: r.status,
      statusText: r.statusText,
      headers,
    });
  }

  self.addEventListener("fetch", (event) => {
    event.respondWith(handleFetch(event.request));
  });
} else {
  // ── Main page context ───────────────────────────────────────────────────────
  (async function () {
    if (crossOriginIsolated) return; // Already isolated, nothing to do

    if (!("serviceWorker" in navigator)) {
      console.warn(
        "[coi-serviceworker] Service workers not supported – WebGPU may not work."
      );
      return;
    }

    const registration = await navigator.serviceWorker
      .register(window.coi ? window.coi.coepCredentialless ? "./coi-serviceworker.js?credentialless" : "./coi-serviceworker.js" : document.currentScript.src)
      .catch((err) =>
        console.error("[coi-serviceworker] Registration failed:", err)
      );

    if (!registration) return;

    const sw = registration.installing || registration.waiting;

    if (sw) {
      // Worker is installing – wait and reload
      sw.addEventListener("statechange", ({ target }) => {
        if (target.state === "activated") {
          console.log("[coi-serviceworker] Activated, reloading…");
          window.location.reload();
        }
      });
    } else if (registration.active) {
      // Already active but page wasn't isolated – reload
      console.log("[coi-serviceworker] Active, reloading to apply isolation…");
      window.location.reload();
    }
  })();
}
