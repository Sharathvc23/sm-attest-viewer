"use client";

import { Link2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { SignatureGem } from "./signature-gem";
import { cn } from "./lib/utils";
import { deriveTrustState, envelopeKindOf, eventAgentLabel } from "./filter-logic";
import type { AAEEnvelopeKind, AttestationEvent, TrustState } from "./types";

const BORDER_BY_TRUST: Record<TrustState, string> = {
  verified: "border-l-[var(--gem-verified)]",
  warning: "border-l-[var(--gem-warning)]",
  failed: "border-l-[var(--gem-failed)]",
  pending: "border-l-[var(--gem-pending)]",
};

/**
 * Default classification tone map. Covers common consumer-defined labels.
 * Unknown classifications fall back to neutral styling. Consumers can
 * override by supplying their own `classificationTone` map via a fork or
 * by styling `[data-classification]` attributes in their global CSS.
 */
const DEFAULT_CLASSIFICATION_TONE: Record<string, string> = {
  public: "bg-transparent text-muted-foreground",
  internal: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
  restricted: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  confidential: "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
};

const NEUTRAL_TONE = "bg-transparent text-muted-foreground";

/**
 * Per-envelope-kind tone map (AAE SPEC §13). `"action"` is omitted on
 * purpose — action envelopes are the historical default, so suppressing
 * the chip keeps v0.1 rows visually unchanged. The three non-action kinds
 * each get a distinct hue so an operator can spot decisions, beliefs, and
 * checkpoints interleaved in the chronological timeline at a glance.
 */
const ENVELOPE_KIND_TONE: Record<Exclude<AAEEnvelopeKind, "action">, string> = {
  decision: "bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  belief: "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  checkpoint: "bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
};

function classificationTone(label: unknown): string {
  if (typeof label !== "string") return NEUTRAL_TONE;
  const key = label.toLowerCase();
  return Object.hasOwn(DEFAULT_CLASSIFICATION_TONE, key)
    ? DEFAULT_CLASSIFICATION_TONE[key]
    : NEUTRAL_TONE;
}

/**
 * Defensive HH:MM:SS extractor — accepts ISO 8601 timestamps but tolerates
 * malformed input rather than rendering garbage.
 */
function formatRowTime(ts: string): string {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "??:??:??";
    return d.toISOString().slice(11, 19);
  } catch {
    return "??:??:??";
  }
}

/**
 * TimelineRow — single AAE entry in the Inbox timeline.
 *
 * Renders all surfaces an operator scans at-a-glance:
 *   - Trust-state border-left (verified/pending/warning/failed)
 *   - Signature gem with signer DID tooltip
 *   - Kind + classification badges
 *   - Agent label (subject)
 *   - Image digest preview
 *   - Optional correlation chip (rendered only when `onCorrelationClick`
 *     is provided)
 *   - Wall-clock time
 */
export function TimelineRow({
  event,
  onCorrelationClick,
}: {
  event: AttestationEvent;
  onCorrelationClick?: (traceId: string) => void;
}) {
  const trust = deriveTrustState(event);
  const p = event.payload;
  const agentLabel = eventAgentLabel(event);
  const digestRaw = typeof p?.image_digest === "string" ? p.image_digest : null;
  const digestShort = digestRaw
    ? digestRaw.length > 16
      ? `${digestRaw.slice(0, 16)}…`
      : digestRaw
    : null;
  const tone = classificationTone(event.classification);
  const trustBorder = Object.hasOwn(BORDER_BY_TRUST, trust)
    ? BORDER_BY_TRUST[trust]
    : BORDER_BY_TRUST.pending;

  const signer = p?.subject?.did ?? event.actor?.did ?? undefined;
  const signedAt = p?.recorded_at ?? event.ts;
  const traceId = event.trace_id;
  const formattedTime = formatRowTime(event.ts);
  const envelopeKind = envelopeKindOf(event);
  const kindTone =
    envelopeKind === "action" ? null : ENVELOPE_KIND_TONE[envelopeKind];

  return (
    <li
      data-testid={`attestation-row-${event.id}`}
      data-classification={event.classification}
      data-envelope-kind={envelopeKind}
      className={cn(
        "bg-card grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-sm border-l-2 px-3 py-2 text-[12px]",
        trustBorder,
      )}
    >
      <SignatureGem state={trust} did={signer} signedAt={signedAt} size="md" className="mt-0.5" />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {kindTone ? (
            <Badge
              variant="outline"
              data-testid={`envelope-kind-badge-${envelopeKind}`}
              className={cn(
                "border-transparent font-mono text-[9px] tracking-wide uppercase",
                kindTone,
              )}
            >
              {envelopeKind}
            </Badge>
          ) : null}
          <Badge variant="outline" className="font-mono text-[9px] uppercase">
            {p?.kind ?? "attested"}
          </Badge>
          <Badge
            variant="outline"
            className={cn("border-transparent font-mono text-[9px] uppercase", tone)}
          >
            {event.classification}
          </Badge>
          <code className="text-muted-foreground truncate font-mono text-[11px]">{agentLabel}</code>
        </div>
        {digestShort ? (
          <div className="text-muted-foreground font-mono text-[10px]">
            digest <code className="text-foreground">{digestShort}</code>
          </div>
        ) : null}
        {traceId && onCorrelationClick ? (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => onCorrelationClick(traceId)}
              data-testid={`correlation-chip-${traceId}`}
              className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors"
              title={`Follow chain ${traceId}`}
            >
              <Link2 className="h-2.5 w-2.5" />
              trace
            </button>
          </div>
        ) : null}
      </div>
      <time
        className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums"
        dateTime={event.ts}
      >
        {formattedTime}Z
      </time>
    </li>
  );
}
