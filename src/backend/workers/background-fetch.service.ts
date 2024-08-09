/// <reference lib="ES2015" />
/// <reference types="@types/serviceworker" />
/// <reference types="./background-fetch.d.ts" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

import { DOWNLOADS_CACHE_NAME } from "@/common/constants";

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
  ({ request }) => request.destination === "video",
  new CacheFirst({
    cacheName: DOWNLOADS_CACHE_NAME,
    matchOptions: {
      ignoreSearch: true,
    },
    plugins: [new RangeRequestsPlugin()],
  }),
);

registerRoute(
  ({ request, url, sameOrigin }) => {
    if (sameOrigin) return isTopLevel(url) && import.meta.env.PROD;
    return request.destination !== "video";
  },
  new CacheFirst({
    cacheName: "offline-app-cache",
    plugins: [
      new ExpirationPlugin({
        purgeOnQuotaError: true,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
);

globalThis.addEventListener("backgroundfetchsuccess", (event) => {
  const bgFetch = event.registration;

  async function until() {
    const cache = await caches.open(DOWNLOADS_CACHE_NAME);
    const records = await bgFetch.matchAll();

    const promises = records.map(async (record) => {
      const proxiedURL = new URL(record.request.url);
      let request;
      if (proxiedURL.searchParams.has(PROXY_DESTINATION_QUERY_KEY))
        // decode and remove the query part;
        request = decodeURIComponent(
          proxiedURL.searchParams.get(PROXY_DESTINATION_QUERY_KEY)!,
        );
      else request = record.request;
      await cache.put(request, await record.responseReady);
    });

    await Promise.all(promises);

    new BroadcastChannel(bgFetch.id).postMessage({ stored: true });

    // check if any window is focused, if not set app badge
    clients.matchAll({ type: "window" }).then((clients) => {
      const hidden = clients.some(
        (client) => client.visibilityState === "hidden",
      );
      if (hidden) navigator.setAppBadge();
    });
  }

  event.waitUntil(until());
});

globalThis.addEventListener("backgroundfetchfail", (event) => {
  console.log("Background fetch failed", event);
});

globalThis.addEventListener("backgroundfetchabort", (event) => {
  console.log("Background fetch aborted", event);
});

globalThis.addEventListener("backgroundfetchclick", (event) => {
  clients
    .matchAll({
      type: "window",
    })
    .then(async (matchedClients) => {
      let client = matchedClients.at(0) ?? null;
      if (client) client = await client.navigate(event.registration.id);
      else client = await clients.openWindow(event.registration.id);
      if (!client?.focused) client?.focus();
    });
});
