"use client";

import { useEffect, useRef } from "react";
import { initSyncEngine } from "@/lib/sync-engine";

// ============================================================
// SyncProvider — initializes the offline sync engine once
// when the app mounts. Place this in any layout that needs
// offline capabilities (currently the driver layout).
//
// The sync engine sets up:
//   - online/offline event listeners
//   - Initial pending count from Dexie
//   - Auto-flush when connectivity returns
// ============================================================

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initSyncEngine();
  }, []);

  return <>{children}</>;
}
