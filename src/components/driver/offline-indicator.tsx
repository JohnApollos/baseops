"use client";

import { useEffect, useState } from "react";
import { subscribeSyncState, type SyncState } from "@/lib/sync-engine";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

// ============================================================
// Offline Indicator — shows sync status in the driver UI.
//
// States:
//   🟢 Green dot  — Online, everything synced
//   🟡 Amber dot  — Online, actively syncing X items
//   🔴 Red dot    — Offline, X items pending
// ============================================================

export function OfflineIndicator() {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastError: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState(setState);
    return unsubscribe;
  }, []);

  // Determine visual state
  const isFullySynced = state.isOnline && !state.isSyncing && state.pendingCount === 0;
  const isSyncing = state.isOnline && (state.isSyncing || state.pendingCount > 0);
  const isOffline = !state.isOnline;

  return (
    <div className="flex items-center gap-2">
      {/* Status dot */}
      <div
        className={cn(
          "w-2.5 h-2.5 rounded-full transition-colors",
          isFullySynced && "bg-success",
          isSyncing && "bg-warning animate-pulse-dot",
          isOffline && "bg-destructive animate-pulse-dot"
        )}
      />

      {/* Status text + icon */}
      <div className="flex items-center gap-1.5">
        {isOffline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs text-destructive font-medium">
              Offline{state.pendingCount > 0 && ` · ${state.pendingCount} pending`}
            </span>
          </>
        ) : isSyncing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 text-warning animate-spin" />
            <span className="text-xs text-warning font-medium">
              Syncing{state.pendingCount > 0 && ` ${state.pendingCount}`}…
            </span>
          </>
        ) : (
          <>
            <Wifi className="h-3.5 w-3.5 text-success" />
            <span className="text-xs text-muted-foreground">Online</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Offline banner — shown at the top of the driver layout when offline.
 * This is a more prominent indicator than the small dot.
 */
export function OfflineBanner() {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastError: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState(setState);
    return unsubscribe;
  }, []);

  if (state.isOnline && state.pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "px-4 py-2 text-center text-xs font-medium transition-all",
        !state.isOnline
          ? "bg-destructive/20 text-destructive"
          : "bg-warning/20 text-warning"
      )}
    >
      {!state.isOnline ? (
        <>
          <WifiOff className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          You&apos;re offline. Changes are saved locally and will sync when you reconnect.
          {state.pendingCount > 0 && ` (${state.pendingCount} pending)`}
        </>
      ) : (
        <>
          <Loader2 className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 animate-spin" />
          Syncing {state.pendingCount} item{state.pendingCount !== 1 ? "s" : ""}…
        </>
      )}
    </div>
  );
}
