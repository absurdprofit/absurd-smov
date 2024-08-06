/// <reference lib="ES2015" />
/// <reference types="@types/serviceworker" />
/// <reference types="./background-fetch.d.ts" />
import { clientsClaim } from "workbox-core";

import { PROXY_DESTINATION_QUERY_KEY } from "../common/constants";

globalThis.skipWaiting();
clientsClaim();

async function cacheOrFetch(event: FetchEvent) {
  // Offline first:
  const cachedResponse = await caches.match(event.request);

  return cachedResponse || fetch(event.request);
}

globalThis.addEventListener("fetch", (event) => {
  if (event.request.destination !== "video") return;

  event.respondWith(cacheOrFetch(event));
});

globalThis.addEventListener("backgroundfetchsuccess", (event) => {
  const bgFetch = event.registration;

  async function until() {
    const cache = await caches.open(bgFetch.id);
    const records = await bgFetch.matchAll();

    const promises = records.map(async (record) => {
      const proxiedURL = new URL(record.request.url);
      let request;
      if (proxiedURL.searchParams.has(PROXY_DESTINATION_QUERY_KEY))
        request = decodeURIComponent(
          proxiedURL.searchParams.get(PROXY_DESTINATION_QUERY_KEY)!,
        );
      else request = record.request;
      await cache.put(request, await record.responseReady);
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
