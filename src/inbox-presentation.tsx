"use client";

import { Timeline } from "./timeline";
import type { AttestationEvent, ConnectionStatus } from "./types";

const STATUS_TONE: Record<string, string> = {
  idle: "var(--gem-pending)",
  connecting: "var(--gem-pending)",
  open: "var(--gem-verified)",
  reconnecting: "var(--gem-warning)",
  closed: "var(--gem-pending)",
  error: "var(--gem-failed)",
};

/**
 * InboxPresentation — the pure-presentation component at the heart of
 * `sm-attest-viewer`. Renders an AAE event stream as a forensic,
 * filterable, reverse-chronological timeline.
 *
 * SUBSTRATE-NEUTRAL. The consumer supplies `events` and `status`. The
 * renderer never opens connections, polls endpoints, or makes any
 * network calls. This is the load-bearing rule that lets the package
 * work with any AAE source — AG-UI, MCP, A2A, JSONL replay, mocks.
 *
 * Props:
 *   - `events` — array of AAE events (newest-last; the renderer reverses
 *     internally for newest-first display).
 *   - `status` — the consumer's current connection state.
 *   - `tenant` — optional label rendered in the header below the title.
 *   - `topicHint` — optional substrate topic string shown next to tenant
 *     (e.g., `tenants/acme-corp/agents/attestations`).
 *   - `title` — header text. Defaults to "Attestations Inbox".
 *   - `onCorrelationClick` — optional callback for chain-follow chips.
 */
export function InboxPresentation({
  events,
  status,
  tenant,
  topicHint,
  title = "Attestations Inbox",
  onCorrelationClick,
}: {
  events: AttestationEvent[];
  status: ConnectionStatus;
  tenant?: string;
  topicHint?: string;
  title?: string;
  onCorrelationClick?: (traceId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col" data-testid="attestations-inbox">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold">{title}</h1>
          {topicHint || tenant ? (
            <p className="text-muted-foreground font-mono text-[11px]">{topicHint ?? tenant}</p>
          ) : null}
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
          <span
            aria-hidden
            data-testid="inbox-status-dot"
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: Object.hasOwn(STATUS_TONE, status)
                ? STATUS_TONE[status]
                : STATUS_TONE.idle,
            }}
          />
          <span data-testid="inbox-status-label">{status}</span>
        </span>
      </header>
      <div className="min-h-0 flex-1 px-4 pb-4">
        <Timeline events={events} status={status} onCorrelationClick={onCorrelationClick} />
      </div>
    </div>
  );
}
