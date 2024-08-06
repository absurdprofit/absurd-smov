/// <reference lib="ES2015" />
/// <reference lib="webworker" />
/// <reference types="@types/serviceworker" />
/// <reference types="./background-fetch.d.ts" />
import { clientsClaim } from 'workbox-core';

globalThis.skipWaiting();
clientsClaim();

console.log("Running Background Fetcher");
globalThis.addEventListener("install", () => {
  console.log("Installed Background Fetcher");
});

async function cacheOrFetch(event: FetchEvent) {
  // Offline first:
  const cachedResponse = await caches.match(event.request);

  return cachedResponse || fetch(event.request);
}

globalThis.addEventListener("fetch", (event) => {
  if (!event.request.headers.get("Content-Type")?.includes("video/")) return;

  event.respondWith(cacheOrFetch(event));
});

globalThis.addEventListener("backgroundfetchsuccess", (event) => {
  const bgFetch = event.registration;

  async function until() {
    const cache = await caches.open(bgFetch.id);
    const records = await bgFetch.matchAll();

    const promises = records.map(async (record) => {
      await cache.put(record.request, await record.responseReady);
    });

    await Promise.all(promises);

    new BroadcastChannel(bgFetch.id).postMessage({ stored: true });
  }

  event.waitUntil(until());
});

globalThis.addEventListener("backgroundfetchfail", (event) => {
  console.log("Background fetch failed", event);
});

globalThis.addEventListener("backgroundfetchclick", () => {
  clients.openWindow("/");
});
