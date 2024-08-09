import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditButton } from "@/components/buttons/EditButton";
import { Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { DownloadMediaCard } from "@/components/media/DownloadMediaCard";
import { MediaGrid } from "@/components/media/MediaGrid";
import { DownloadMediaItem, useDownloadStore } from "@/stores/downloads";

export function DownloadsPart({
  onItemsChange,
}: {
  onItemsChange: (hasItems: boolean) => void;
}) {
  const { t } = useTranslation();
  const downloads = useDownloadStore((s) => s.downloads);
  const removeDownload = useDownloadStore((s) => s.removeDownload);
  const [editing, setEditing] = useState(false);
  const [gridRef] = useAutoAnimate<HTMLDivElement>();

  const items = useMemo(() => {
    const output: (DownloadMediaItem & { id: string })[] = [];
    Object.entries(downloads).forEach((entry) => {
      output.push({
        id: entry[0],
        ...entry[1],
      });
    });
    return output;
  }, [downloads]);

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
          <DownloadMediaCard
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
