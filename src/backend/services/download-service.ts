import { isSameOrigin } from "@/utils/proxyUrls";

import { PROXY_PATH } from "./constants";
import { PROXY_DESTINATION_QUERY_KEY } from "../common/constants";

export interface DownloadOptions {
  title: string;
  icons: BackgroundFetchIcon[];
}

export class DownloadService extends EventTarget {
  static #instance?: DownloadService;

  #worker?: ServiceWorkerRegistration;

  private constructor() {
    super();
    navigator.serviceWorker.getRegistration().then((worker) => {
      this.#worker = worker;
    });
  }

  static get instance() {
    if (!this.#instance) this.#instance = new DownloadService();

    return this.#instance;
  }

  public async download(resource: RequestInfo | URL, options: DownloadOptions) {
    let url;
    if (resource instanceof URL) url = resource.toString();
    else if (resource instanceof Request) url = resource.url;
    else url = resource;

    if (!isSameOrigin(url)) {
      const proxyURL = new URL(PROXY_PATH, window.location.origin);
      proxyURL.searchParams.set(
        PROXY_DESTINATION_QUERY_KEY,
        encodeURIComponent(url),
      );
      url = proxyURL.toString();
      if (resource instanceof Request) {
        resource = await this.#cloneRequestWithNewURL(
          proxyURL.toString(),
          resource,
        );
      } else {
        resource = url;
      }
    } else if (resource instanceof URL) resource = resource.toString();

    this.#worker?.backgroundFetch.fetch("downloads", [resource], {
      ...options,
      // downloadTotal: await this.#getDownloadSize(url),
    });
  }

  async #getDownloadSize(url: string) {
    // use GET since HEAD is sometimes not supported
    const controller = new AbortController();
    const response = await fetch(url, {
      mode: "no-cors",
      method: "GET",
      signal: controller.signal,
    });
    const contentLength = response.headers.get("Content-Length") ?? "0";
    controller.abort();
    return parseInt(contentLength, 10);
  }

  #cloneRequestWithNewURL(url: string, request: Request) {
    return request.blob().then(
      (body) =>
        new Request(url, {
          method: request.method,
          headers: request.headers,
          body,
          referrer: request.referrer,
          referrerPolicy: request.referrerPolicy,
          mode: request.mode,
          credentials: request.credentials,
          cache: request.cache,
          redirect: request.redirect,
          integrity: request.integrity,
        }),
    );
  }
}
