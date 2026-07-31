"use client";

import { useEffect, useState } from "react";

export function OfflineBanner({
  offlineText,
  restoredText,
}: {
  offlineText: string;
  restoredText: string;
}) {
  const [status, setStatus] = useState<"online" | "offline" | "restored">(
    "online",
  );

  useEffect(() => {
    let restoredTimer: ReturnType<typeof setTimeout> | undefined;
    const onOffline = () => setStatus("offline");
    const onOnline = () => {
      setStatus((current) => (current === "offline" ? "restored" : "online"));
      restoredTimer = setTimeout(() => setStatus("online"), 3000);
    };
    if (!navigator.onLine) queueMicrotask(onOffline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (restoredTimer) clearTimeout(restoredTimer);
    };
  }, []);

  if (status === "online") return null;
  return (
    <div className={`offline-banner ${status}`} role="status">
      {status === "offline" ? offlineText : restoredText}
    </div>
  );
}
