import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditButton } from "@/components/buttons/EditButton";
import { Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MediaGrid } from "@/components/media/MediaGrid";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { useDownloadStore } from "@/stores/downloads";
import { useProgressStore } from "@/stores/progress";
import { MediaItem } from "@/utils/mediaTypes";

export function DownloadsPart({
  onItemsChange,
}: {
  onItemsChange: (hasItems: boolean) => void;
}) {
  const { t } = useTranslation();
  const progressItems = useProgressStore((s) => s.items);
  const downloads = useDownloadStore((s) => s.downloads);
  const removeDownload = useDownloadStore((s) => s.removeDownload);
  const [editing, setEditing] = useState(false);
  const [gridRef] = useAutoAnimate<HTMLDivElement>();

  const items = useMemo(() => {
    let output: MediaItem[] = [];
    Object.entries(downloads).forEach((entry) => {
      output.push({
        id: entry[0],
        ...entry[1],
      });
    });
    output = output.sort((a, b) => {
      const downloadA = downloads[a.id];
      const downloadB = downloads[b.id];
      const progressA = progressItems[a.id];
      const progressB = progressItems[b.id];

      const dateA = Math.max(downloadA.updatedAt, progressA?.updatedAt ?? 0);
      const dateB = Math.max(downloadB.updatedAt, progressB?.updatedAt ?? 0);

      return dateB - dateA;
    });
    return output;
  }, [downloads, progressItems]);

  useEffect(() => {
    // clear downloads badge set in service worker
    if (document.hasFocus()) navigator.clearAppBadge();
    else {
      document.addEventListener("focus", () => navigator.clearAppBadge(), {
        once: true,
      });
    }
    onItemsChange(items.length > 0);
  }, [items, onItemsChange]);

  if (items.length === 0) return null;

  return (
    <div>
      <SectionHeading
        title={t("home.downloads.sectionTitle") || "Downloads"}
        icon={Icons.DOWNLOAD}
      >
        <EditButton editing={editing} onEdit={setEditing} />
      </SectionHeading>
      <MediaGrid ref={gridRef}>
        {items.map((v) => (
          <WatchedMediaCard
            key={v.id}
            media={v}
            closable={editing}
            onClose={() => removeDownload(v.id)}
          />
        ))}
      </MediaGrid>
    </div>
  );
}
