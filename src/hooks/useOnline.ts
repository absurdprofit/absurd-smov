import { useEffect, useState } from "react";

import { useBannerStore } from "@/stores/banner";

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  const updateOnline = useBannerStore((s) => s.updateOnline);

  useEffect(() => {
    const listener = () => {
      setOnline(navigator.onLine);
      updateOnline(navigator.onLine);
    };
    window.addEventListener("online", listener);
    window.addEventListener("offline", listener);

    return () => {
      window.removeEventListener("online", listener);
      window.removeEventListener("offline", listener);
    };
  }, [updateOnline]);

  return online;
}
