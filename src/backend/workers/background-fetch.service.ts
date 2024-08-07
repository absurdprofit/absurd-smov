/// <reference lib="ES2015" />
/// <reference types="@types/serviceworker" />
/// <reference types="./background-fetch.d.ts" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { createPartialResponse } from "workbox-range-requests";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

import { PROXY_DESTINATION_QUERY_KEY } from "../common/constants";

globalThis.skipWaiting();
clientsClaim();

function isTopLevel(url: URL) {
  const pathname = url.pathname;
  // Split the pathname by "/" and filter out empty segments
  const segments = pathname.split("/").filter((segment) => segment !== "");
  // It is top-level if there's 0 or 1 segment
  return segments.length <= 1;
}

registerRoute(
  ({ request, url, sameOrigin }) => {
    if (sameOrigin) return isTopLevel(url) && import.meta.env.PROD;
    return request.destination !== "video";
  },
  new StaleWhileRevalidate({
    cacheName: "offline-app-cache",
    plugins: [
      new ExpirationPlugin({
        purgeOnQuotaError: true,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
);

async function cacheOrFetch(event: FetchEvent) {
  // Offline first:
  const url = event.request.url.split("?")[0]; // remove the query part
  const cachedResponse = await caches.match(url);

  if (!cachedResponse) return fetch(event.request);

  if (event.request.headers.has("Range")) {
    return createPartialResponse(event.request, cachedResponse);
  }
  return cachedResponse;
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
        // decode and remove the query part;
        request = decodeURIComponent(
          proxiedURL.searchParams.get(PROXY_DESTINATION_QUERY_KEY)!,
        ).split("?")[0];
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
