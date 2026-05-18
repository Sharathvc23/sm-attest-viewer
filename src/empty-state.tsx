"use client";

import type { ConnectionStatus } from "./types";

/**
 * EmptyState — what the timeline renders when there are no rows visible.
 *
 * Branches on:
 *   - connection status (idle/connecting/open/reconnecting/closed/error)
 *   - whether the buffer is empty vs. all events filtered out
 *
 * Connection messages stay substrate-neutral so consumers wiring up
 * AG-UI, MCP, A2A, or a JSONL file source see appropriate copy.
 */
export function EmptyState({
  status,
  isFilteredOut,
}: {
  status: ConnectionStatus;
  isFilteredOut: boolean;
}) {
  if (isFilteredOut) {
    return (
      <p
        data-testid="empty-state-filtered"
        className="text-muted-foreground py-12 text-center text-[12px] italic"
      >
        No attestations match the current filters. Try widening the time window or clearing
        trust/classification toggles.
      </p>
    );
  }
  const message = MESSAGES[status];
  return (
    <p
      data-testid={`empty-state-${status}`}
      className="text-muted-foreground py-12 text-center text-[12px] italic"
    >
      {message}
    </p>
  );
}

const MESSAGES: Record<ConnectionStatus, string> = {
  idle: "Initializing stream…",
  connecting: "Establishing connection to attestation stream…",
  open: "Connected. Waiting for new attestations…",
  reconnecting: "Reconnecting…",
  closed: "Stream closed.",
  error: "Stream source unavailable; timeline will populate when the source is reachable.",
};
