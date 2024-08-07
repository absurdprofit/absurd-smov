import { t } from "i18next";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { DownloadService } from "@/backend/services/download-service";
import { PlayerMeta } from "@/stores/player/slices/source";

export interface DownloadMediaItem {
  title: string;
  year?: number;
  poster?: string;
  type: "show" | "movie";
  updatedAt: number;
  downloadUrl: string;
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

export interface DownloadStore {
  downloads: Record<string, DownloadMediaItem>;
  updateQueue: DownloadUpdateItem[];
  addDownload(meta: PlayerMeta & { downloadUrl: string }): void;
  removeDownload(id: string): void;
  replaceDownloads(items: Record<string, DownloadMediaItem>): void;
  clear(): void;
  clearUpdateQueue(): void;
  removeUpdateItem(id: string): void;
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
          });
        });
      },
      replaceDownloads(items: Record<string, DownloadMediaItem>) {
        set((s) => {
          s.downloads = items;
        });
      },
      clear() {
        set((s) => {
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
