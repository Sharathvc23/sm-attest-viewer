/**
 * Pure filter + derivation logic for the Attestation Inbox.
 *
 * All functions here are pure and exported for unit testing. Component
 * code in /timeline.tsx, /filters.tsx etc. composes these — never inline
 * filter logic in JSX.
 */

import type {
  AAEEnvelopeKind,
  AttestationEvent,
  AttestationFilter,
  TrustState,
} from "./types";

const KNOWN_ENVELOPE_KINDS: ReadonlySet<AAEEnvelopeKind> = new Set([
  "action",
  "decision",
  "belief",
  "checkpoint",
]);

/**
 * Normalize the envelope-kind discriminator per AAE SPEC §13.
 *
 * The wire field is typed as a literal union extended with `(string & {})` so
 * legacy v0.1 producers emitting free-text values (e.g. `"EVIDENCE"`) still
 * satisfy the type. Renderers route on the normalized kind: anything outside
 * the four known variants collapses to `"action"`, which keeps v0.1 events
 * rendering exactly as they did before §13 landed.
 */
export function envelopeKindOf(event: AttestationEvent): AAEEnvelopeKind {
  const raw = event.type;
  if (typeof raw === "string" && KNOWN_ENVELOPE_KINDS.has(raw as AAEEnvelopeKind)) {
    return raw as AAEEnvelopeKind;
  }
  return "action";
}

/**
 * Derive trust state from an event envelope, per AAE SPEC §11.2.
 *
 * Mapping:
 *
 *   lifecycle = "reconciled" + reconciled_outcome = "conflicting"  → failed
 *   lifecycle = "reconciled" + reconciled_outcome = "superseded"   → warning
 *   lifecycle ∈ {signed, committed, anchored, reconciled[converged]} → verified
 *   lifecycle = "proposed"                                         → pending
 *   no lifecycle marker, proof.proofValue present                  → verified (legacy)
 *   no lifecycle marker, evidence_ref present                      → verified (legacy)
 *   otherwise                                                      → pending
 *
 * The legacy fallthrough handles envelopes from substrates that don't yet
 * emit lifecycle markers. When all upstream substrates emit lifecycle,
 * the fallthrough can be removed in a future major version.
 *
 * NOTE: This function does NOT cryptographically verify proof.proofValue
 * against verificationMethod — that work is deferred to v1.x. A "verified"
 * return today means "the substrate marked it as verified," not "the
 * signature was independently checked." Consumers requiring independent
 * verification should run a VC verify library before passing events here.
 */
export function deriveTrustState(event: AttestationEvent): TrustState {
  if (event.lifecycle === "reconciled") {
    if (event.reconciled_outcome === "conflicting") return "failed";
    if (event.reconciled_outcome === "superseded") return "warning";
    return "verified";
  }
  if (event.lifecycle === "signed" || event.lifecycle === "committed" || event.lifecycle === "anchored") {
    return "verified";
  }
  if (event.lifecycle === "proposed") {
    return "pending";
  }
  if (event.payload?.proof?.proofValue) return "verified";
  if (event.evidence_ref) return "verified";
  return "pending";
}

/** Format an actor identity for matching against an actorQuery substring. */
export function actorMatchKey(event: AttestationEvent): string {
  const sub = event.payload?.subject;
  const subjectKey = sub?.namespace && sub?.value ? `${sub.namespace}/${sub.value}` : "";
  const did = sub?.did ?? event.actor?.did ?? "";
  const actorLabel = event.actor ? `${event.actor.namespace}/${event.actor.value}` : "";
  return [subjectKey, did, actorLabel, event.actor?.display_name ?? ""]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Pull the human-renderable agent label for a row. */
export function eventAgentLabel(event: AttestationEvent): string {
  const sub = event.payload?.subject;
  if (sub?.namespace && sub?.value) return `${sub.namespace}/${sub.value}`;
  const actor = event.actor as AttestationEvent["actor"] | undefined;
  if (actor && (actor.namespace || actor.value)) return `${actor.namespace}/${actor.value}`;
  return actor?.did ?? "—";
}

/** True when `event` passes every active criterion in `filter`. */
export function eventPassesFilter(
  event: AttestationEvent,
  filter: AttestationFilter,
  nowMs: number,
): boolean {
  if (filter.actorQuery.trim()) {
    const haystack = actorMatchKey(event);
    if (!haystack.includes(filter.actorQuery.trim().toLowerCase())) return false;
  }
  if (filter.kinds.length > 0) {
    const k = event.payload?.kind ?? "";
    if (!filter.kinds.includes(k)) return false;
  }
  if (filter.timeWindowMs !== null) {
    const eventMs = Date.parse(event.ts);
    if (Number.isNaN(eventMs)) return false;
    if (nowMs - eventMs > filter.timeWindowMs) return false;
  }
  if (filter.trustStates.length > 0) {
    const trust = deriveTrustState(event);
    if (!filter.trustStates.includes(trust)) return false;
  }
  if (filter.classifications.length > 0) {
    if (!filter.classifications.includes(event.classification)) return false;
  }
  return true;
}

/** Collect unique attestation kinds across the buffer, sorted for stable UI. */
export function distinctKinds(events: AttestationEvent[]): string[] {
  const seen = new Set<string>();
  for (const e of events) {
    const k = e.payload?.kind;
    if (k) seen.add(k);
  }
  return [...seen].sort();
}

/** Collect unique classification labels across the buffer, sorted for stable UI. */
export function distinctClassifications(events: AttestationEvent[]): string[] {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.classification) seen.add(e.classification);
  }
  return [...seen].sort();
}

/** Standard time-window options for the dropdown. */
export const TIME_WINDOW_OPTIONS: { label: string; value: number | null }[] = [
  { label: "All time", value: null },
  { label: "Last 5 min", value: 5 * 60 * 1000 },
  { label: "Last 30 min", value: 30 * 60 * 1000 },
  { label: "Last 1 hour", value: 60 * 60 * 1000 },
  { label: "Last 24 hours", value: 24 * 60 * 60 * 1000 },
];
