"use client";

import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./lib/utils";
import { TIME_WINDOW_OPTIONS } from "./filter-logic";
import { EMPTY_FILTER, type AttestationFilter, type TrustState } from "./types";

const TRUST_STATES: TrustState[] = ["verified", "pending", "warning", "failed"];

/**
 * Filters — sticky bar across the top of the timeline.
 *
 * All controls are tightly coupled to AttestationFilter; nothing here
 * derives or transforms event state. The parent owns the filter state
 * and passes a setter for batched updates.
 *
 * Trust + classification chips use toggle semantics: clicking the same
 * chip removes it from the set. Empty set means "show all."
 *
 * Available classifications are derived from the event stream by the
 * parent (Timeline) — the renderer does not ship a hardcoded
 * classification taxonomy. Consumers' policies define their own labels.
 */
export function Filters({
  filter,
  setFilter,
  availableKinds,
  availableClassifications,
  totalCount,
  visibleCount,
}: {
  filter: AttestationFilter;
  setFilter: (next: AttestationFilter) => void;
  availableKinds: string[];
  availableClassifications: string[];
  totalCount: number;
  visibleCount: number;
}) {
  const toggleTrust = (state: TrustState) => {
    const next = filter.trustStates.includes(state)
      ? filter.trustStates.filter((s) => s !== state)
      : [...filter.trustStates, state];
    setFilter({ ...filter, trustStates: next });
  };
  const toggleClassification = (c: string) => {
    const next = filter.classifications.includes(c)
      ? filter.classifications.filter((s) => s !== c)
      : [...filter.classifications, c];
    setFilter({ ...filter, classifications: next });
  };
  const toggleKind = (k: string) => {
    const next = filter.kinds.includes(k)
      ? filter.kinds.filter((s) => s !== k)
      : [...filter.kinds, k];
    setFilter({ ...filter, kinds: next });
  };

  const isDirty =
    filter.actorQuery !== "" ||
    filter.kinds.length > 0 ||
    filter.timeWindowMs !== null ||
    filter.trustStates.length > 0 ||
    filter.classifications.length > 0;

  return (
    <div
      data-testid="attestation-filters"
      className="bg-background sticky top-0 z-10 space-y-3 border-b px-1 pt-1 pb-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          data-testid="filter-actor-query"
          placeholder="Filter by actor (DID, namespace/value, display name)"
          value={filter.actorQuery}
          onChange={(e) => setFilter({ ...filter, actorQuery: e.target.value })}
          className="h-8 max-w-md font-mono text-[12px]"
        />
        <Select
          value={String(filter.timeWindowMs ?? "all")}
          onValueChange={(v) =>
            setFilter({ ...filter, timeWindowMs: v === "all" ? null : Number(v) })
          }
        >
          <SelectTrigger className="h-8 w-[140px] text-[12px]" data-testid="filter-time-window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_WINDOW_OPTIONS.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value ?? "all")}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground font-mono tabular-nums">
            {visibleCount} / {totalCount}
          </span>
          {isDirty ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => setFilter(EMPTY_FILTER)}
              data-testid="filter-clear"
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <FilterChipGroup
        label="Trust"
        testid="filter-trust"
        options={TRUST_STATES}
        selected={filter.trustStates}
        onToggle={(s) => toggleTrust(s as TrustState)}
      />
      {availableClassifications.length > 0 ? (
        <FilterChipGroup
          label="Classification"
          testid="filter-classification"
          options={availableClassifications}
          selected={filter.classifications}
          onToggle={toggleClassification}
        />
      ) : null}
      {availableKinds.length > 0 ? (
        <FilterChipGroup
          label="Kind"
          testid="filter-kind"
          options={availableKinds}
          selected={filter.kinds}
          onToggle={toggleKind}
        />
      ) : null}
    </div>
  );
}

function FilterChipGroup({
  label,
  options,
  selected,
  onToggle,
  testid,
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  testid: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={testid}>
      <span className="text-muted-foreground w-[88px] text-[10px] tracking-wide uppercase">
        {label}
      </span>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            data-testid={`${testid}-${opt}`}
            onClick={() => onToggle(opt)}
            aria-pressed={isSelected}
            className={cn(
              "rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase transition-colors",
              isSelected
                ? "bg-foreground text-background border-foreground"
                : "hover:bg-muted text-muted-foreground border-input",
            )}
          >
            {opt}
          </button>
        );
      })}
      {selected.length > 0 ? (
        <Badge variant="outline" className="ml-1 text-[9px]">
          {selected.length}
        </Badge>
      ) : null}
    </div>
  );
}
