import { isSameOrigin } from "@/utils/proxyUrls";

import { PROXY_PATH } from "./constants";
import { PROXY_DESTINATION_QUERY_KEY } from "../common/constants";

export interface DownloadOptions {
  title: string;
  icons: BackgroundFetchIcon[];
  id?: string;
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
      proxyURL.searchParams.set(PROXY_DESTINATION_QUERY_KEY, encodeURI(url));
      url = proxyURL.toString();
      if (resource instanceof Request) {
        resource = await this.#cloneRequestWithNewURL(url, resource);
      } else {
        resource = url;
      }
    } else if (resource instanceof URL) resource = resource.toString();

    const { id = crypto.randomUUID() } = options;
    return this.#worker?.backgroundFetch.fetch(id, [resource], {
      ...options,
      downloadTotal: await this.#getDownloadSize(resource),
    });
  }

  async #getDownloadSize(request: RequestInfo) {
    const response = await fetch(request, {
      method: "GET",
      cache: "no-store",
      headers: {
        Range: "bytes=-1", // get last byte
      },
    });
    const contentRange = response.headers.get("Content-Range");
    const contentLength = contentRange?.split("/").at(1);
    if (contentLength) return parseInt(contentLength, 10);
    return undefined;
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
