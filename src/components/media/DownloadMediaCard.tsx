import { useMemo } from "react";

import { useOnline } from "@/hooks/useOnline";
import { DownloadProgressItem } from "@/stores/downloads";
import { useProgressStore } from "@/stores/progress";
import {
  ShowProgressResult,
  shouldShowProgress,
} from "@/stores/progress/utils";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaCard } from "./MediaCard";

function formatSeries(series?: ShowProgressResult | null) {
  if (!series || !series.episode || !series.season) return undefined;
  return {
    episode: series.episode?.number,
    season: series.season?.number,
    episodeId: series.episode?.id,
    seasonId: series.season?.id,
  };
}

export interface DownloadMediaCardProps {
  media: MediaItem & { progress: DownloadProgressItem };
  closable?: boolean;
  onClose?: () => void;
}

export function DownloadMediaCard(props: DownloadMediaCardProps) {
  const progressItems = useProgressStore((s) => s.items);
  const series = useMemo(() => {
    const data = progressItems[props.media.id];
    if (data) return shouldShowProgress(data);
    return null;
  }, [progressItems, props.media]);
  const online = useOnline();

  const percentage = useMemo(() => {
    return (
      (props.media.progress.downloaded / props.media.progress.downloadTotal) *
      100
    );
  }, [props.media.progress.downloaded, props.media.progress.downloadTotal]);

  return (
    <MediaCard
      media={props.media}
      series={formatSeries(series)}
      linkable={percentage === 100 || online}
      percentage={percentage === 100 ? undefined : percentage}
      onClose={props.onClose}
      closable={props.closable}
    />
  );
}
