import { t } from "i18next";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { DownloadService } from "@/backend/services/download-service";
import { DOWNLOADS_CACHE_NAME } from "@/common/constants";
import { PlayerMeta } from "@/stores/player/slices/source";

export interface DownloadMediaItem {
  title: string;
  year?: number;
  poster?: string;
  type: "show" | "movie";
  updatedAt: number;
  downloadUrl: string;
  playerUrl: string;
}

export interface DownloadUpdateItem {
  tmdbId: string;
  title?: string;
  year?: number;
  id: string;
  poster?: string;
  type?: "show" | "movie";
  action: "delete" | "add";
}

export interface DownloadMeta extends PlayerMeta {
  downloadUrl: string;
  playerUrl: string;
}
export interface DownloadStore {
  downloads: Record<string, DownloadMediaItem>;
  updateQueue: DownloadUpdateItem[];
  addDownload(meta: DownloadMeta): void;
  removeDownload(id: string): void;
  replaceDownloads(items: Record<string, DownloadMediaItem>): void;
  clear(): void;
  clearUpdateQueue(): void;
  removeUpdateItem(id: string): void;
}

function removeFromCache(download: DownloadMediaItem) {
  const { downloadUrl } = download;
  queueMicrotask(async () => {
    const cache = await caches.open(DOWNLOADS_CACHE_NAME);
    cache.delete(downloadUrl, { ignoreSearch: true });
  });
}

let updateId = 0;

export const useDownloadStore = create(
  persist(
    immer<DownloadStore>((set) => ({
      downloads: {},
      updateQueue: [],
      removeDownload(id) {
        set((s) => {
          updateId += 1;
          s.updateQueue.push({
            id: updateId.toString(),
            action: "delete",
            tmdbId: id,
          });

          removeFromCache(s.downloads[id]);
          delete s.downloads[id];
        });
      },
      addDownload(meta) {
        set((s) => {
          updateId += 1;
          s.updateQueue.push({
            id: updateId.toString(),
            action: "add",
            tmdbId: meta.tmdbId,
            type: meta.type,
            title: meta.title,
            year: meta.releaseYear,
            poster: meta.poster,
          });

          s.downloads[meta.tmdbId] = {
            type: meta.type,
            title: meta.title,
            year: meta.releaseYear,
            poster: meta.poster,
            downloadUrl: meta.downloadUrl,
            playerUrl: meta.playerUrl,
            updatedAt: Date.now(),
          };

          let title = meta.title;
          if (meta.type === "show") {
            const humanizedEpisodeId = t("media.episodeDisplay", {
              season: meta.season?.number,
              episode: meta.episode?.number,
            });
            title += ` - ${humanizedEpisodeId}`;
          }
          const icon = {
            src: meta.poster ?? "/android-chrome-512x512.png",
          };
          DownloadService.instance.download(meta.downloadUrl, {
            title,
            icons: [icon],
            id: meta.playerUrl,
          });
        });
      },
      replaceDownloads(items: Record<string, DownloadMediaItem>) {
        set((s) => {
          Object.values(s.downloads).forEach(removeFromCache);
          s.downloads = items;
        });
      },
      clear() {
        set((s) => {
          Object.values(s.downloads).forEach(removeFromCache);
          s.downloads = {};
        });
      },
      clearUpdateQueue() {
        set((s) => {
          s.updateQueue = [];
        });
      },
      removeUpdateItem(id: string) {
        set((s) => {
          s.updateQueue = [...s.updateQueue.filter((v) => v.id !== id)];
        });
      },
    })),
    {
      name: "__MW::downloads",
    },
  ),
);
