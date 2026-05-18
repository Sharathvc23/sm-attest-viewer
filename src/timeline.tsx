"use client";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Filters } from "./filters";
import { TimelineRow } from "./timeline-row";
import { EmptyState } from "./empty-state";
import { distinctKinds, distinctClassifications, eventPassesFilter } from "./filter-logic";
import {
  EMPTY_FILTER,
  type AttestationEvent,
  type AttestationFilter,
  type ConnectionStatus,
} from "./types";

/**
 * How often the "now" reference advances for time-window filters. 30s is
 * a sweet spot: fresh enough that a "Last 5 min" filter behaves correctly
 * as time passes, infrequent enough to not churn renders.
 */
const NOW_TICK_MS = 30_000;

/**
 * Timeline — filtered, reverse-chronological list of AAE events.
 *
 * Owns filter state locally. Renders newest-first.
 *
 * `onCorrelationClick` is forwarded to each row's correlation chip; if
 * omitted, chips are not rendered (chain-follow is a downstream feature
 * that consumers wire to their own UI; it is not part of this spec).
 */
export function Timeline({
  events,
  status,
  initialFilter,
  onFilterChange,
  onCorrelationClick,
}: {
  events: AttestationEvent[];
  status: ConnectionStatus;
  initialFilter?: AttestationFilter;
  onFilterChange?: (filter: AttestationFilter) => void;
  onCorrelationClick?: (traceId: string) => void;
}) {
  const [filter, setFilterState] = useState<AttestationFilter>(initialFilter ?? EMPTY_FILTER);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (filter.timeWindowMs === null) return;
    const interval = setInterval(() => setNowMs(Date.now()), NOW_TICK_MS);
    return () => clearInterval(interval);
  }, [filter.timeWindowMs]);

  const setFilter = (next: AttestationFilter) => {
    setFilterState(next);
    onFilterChange?.(next);
  };

  const availableKinds = useMemo(() => distinctKinds(events), [events]);
  const availableClassifications = useMemo(() => distinctClassifications(events), [events]);
  const visible = useMemo(
    () => events.filter((e) => eventPassesFilter(e, filter, nowMs)),
    [events, filter, nowMs],
  );
  const ordered = useMemo(() => visible.slice().reverse(), [visible]);

  return (
    <div className="flex h-full flex-col" data-testid="attestation-timeline">
      <Filters
        filter={filter}
        setFilter={setFilter}
        availableKinds={availableKinds}
        availableClassifications={availableClassifications}
        totalCount={events.length}
        visibleCount={visible.length}
      />
      <ScrollArea className="min-h-0 flex-1">
        {ordered.length === 0 ? (
          <EmptyState status={status} isFilteredOut={events.length > 0 && visible.length === 0} />
        ) : (
          <ul className="space-y-1 py-2" data-testid="attestation-timeline-list">
            {ordered.map((event) => (
              <TimelineRow key={event.id} event={event} onCorrelationClick={onCorrelationClick} />
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
