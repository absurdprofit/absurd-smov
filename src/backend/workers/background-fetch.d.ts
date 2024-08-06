interface BackgroundFetchRecord {
  readonly request: Request;
  readonly responseReady: Promise<Response>;
  readonly responseWritten: Promise<void>;
}

interface BackgroundFetchIcon {
  src: string;
  sizes: string;
  type: string;
}

interface BackgroundFetchOptions {
  title?: string;
  icons?: BackgroundFetchIcon[];
  downloadTotal?: number;
}

type BackgroundFetchResult = "success" | "failure";
type BackgroundFetchFailureReason =
  | "aborted"
  | "bad-status"
  | "fetch-error"
  | "quota-exceeded";

interface BackgroundFetchRegistration extends EventTarget {
  readonly id: string;
  readonly uploadTotal: number;
  readonly uploaded: number;
  readonly downloadTotal: number;
  readonly downloaded: number;
  readonly result: BackgroundFetchResult;
  readonly failureReason: BackgroundFetchFailureReason | "";
  readonly recordsAvailable: boolean;

  match(
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<BackgroundFetchRecord | undefined>;
  matchAll(
    request?: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<BackgroundFetchRecord[]>;

  abort(): Promise<void>;

  addEventListener(
    type: "progress",
    listener: (
      this: BackgroundFetchRegistration,
      ev: ProgressEvent<BackgroundFetchRegistration>,
    ) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

interface BackgroundFetchManager {
  fetch(
    id: string,
    requests: RequestInfo | RequestInfo[],
    options?: BackgroundFetchOptions,
  ): Promise<BackgroundFetchRegistration>;

  get(id: string): Promise<BackgroundFetchRegistration | undefined>;
  getIds(): Promise<string[]>;
}

interface BackgroundFetchEvent extends ExtendableEvent {
  readonly registration: BackgroundFetchRegistration;
}

interface BackgroundFetchSuccessEvent extends BackgroundFetchEvent {
  readonly fetches: ReadonlyArray<BackgroundFetchRecord>;
}

interface BackgroundFetchFailEvent extends BackgroundFetchEvent {
  readonly fetches: ReadonlyArray<BackgroundFetchRecord>;
}

interface BackgroundFetchAbortEvent extends BackgroundFetchEvent {}

interface BackgroundFetchClickEvent extends BackgroundFetchEvent {}

interface BackgroundFetchEventMap {
  [`backgroundfetchsuccess`]: BackgroundFetchSuccessEvent;
  [`backgroundfetchfail`]: BackgroundFetchFailEvent;
  [`backgroundfetchabort`]: BackgroundFetchAbortEvent;
  [`backgroundfetchclick`]: BackgroundFetchClickEvent;
}

interface ServiceWorkerRegistration {
  readonly backgroundFetch: BackgroundFetchManager;
}

interface WorkerGlobalScopeEventMap extends BackgroundFetchEventMap {}
