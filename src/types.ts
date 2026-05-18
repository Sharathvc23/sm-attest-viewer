/**
 * AAE renderer — local types.
 *
 * Mirrors the AAE wire envelope as defined in the Attested Action Envelope
 * specification (see SPEC.md). The renderer is substrate-neutral: it
 * accepts events shaped like `AttestationEvent` from any source —
 * AG-UI streams, MCP tool outputs, JSONL files, websockets.
 *
 * Trust state is derived from envelope lifecycle (see SPEC §6) and, when
 * present, the `proof` block. See `filter-logic.ts:deriveTrustState`.
 */

/**
 * Classification label per AAE SPEC §3.2. Free-form string defined by the
 * consumer's information-handling policy.
 *
 * Examples consumers commonly use:
 *   "public" | "internal" | "restricted" | "confidential"
 *
 * The renderer ships a default tone map for common labels but accepts
 * any string. Unknown labels render with neutral styling.
 */
export type AAEClassification = string;

/**
 * Lifecycle markers from AAE SPEC §6. An AAE moves monotonically through
 * these states:
 *
 *   proposed → signed → committed → anchored → reconciled
 */
export type AAELifecycle =
  | "proposed"
  | "signed"
  | "committed"
  | "anchored"
  | "reconciled";

/**
 * Reconciliation outcomes from AAE SPEC §6.1. Only meaningful when
 * `lifecycle === "reconciled"`.
 */
export type AAEReconciledOutcome = "converged" | "superseded" | "conflicting";

/**
 * Trust state surfaced to operators in the renderer. Derived from the
 * envelope's lifecycle and reconciliation outcome.
 */
export type TrustState = "verified" | "warning" | "failed" | "pending";

/** Actor identity attached to every event. */
export type AAEActor = {
  namespace: string;
  value: string;
  did: string | null;
  display_name?: string | null;
};

/** Subject is an AgentId-shaped dict; substrates surface it alongside actor. */
export type AttestationSubject = {
  namespace?: string;
  value?: string;
  did?: string | null;
};

/** Wire payload for an attestation EVIDENCE event. */
export type AttestationPayload = {
  subject?: AttestationSubject;
  kind?: string;
  image_digest?: string;
  recorded_at?: string;
  /** Optional VC envelope (VC 2.0 / DataIntegrityProof, see SPEC §4). */
  proof?: {
    type?: string;
    cryptosuite?: string;
    created?: string;
    verificationMethod?: string;
    proofValue?: string;
  };
};

/**
 * The renderer accepts events that follow the AAE wire envelope but is
 * substrate-neutral — see SPEC §2.5 for the MCP / A2A / AG-UI framing.
 */
export type AttestationEvent = {
  v: 1;
  id: string;
  ts: string;
  tenant: string;
  actor: AAEActor;
  topic: string;
  type: string;
  /** Consumer-defined sensitivity label. See AAEClassification. */
  classification: AAEClassification;
  payload: AttestationPayload;
  /** Lifecycle marker per SPEC §6. Optional — absence means lifecycle unknown. */
  lifecycle?: AAELifecycle;
  /** Reconciliation outcome per SPEC §6.1. Only meaningful when lifecycle === "reconciled". */
  reconciled_outcome?: AAEReconciledOutcome;
  evidence_ref?: string;
  trace_id?: string;
};

/** Connection states the renderer recognizes for its empty/header chrome. */
export type ConnectionStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

/** Filter state — every field optional; empty values mean "no filter". */
export type AttestationFilter = {
  /** Actor DID substring or namespace/value substring. */
  actorQuery: string;
  /** Selected attestation kinds. Empty = all. */
  kinds: string[];
  /** Time window from current moment (ms). null = unbounded. */
  timeWindowMs: number | null;
  /** Trust states to include. Empty = all. */
  trustStates: TrustState[];
  /** Classification labels to include. Empty = all. */
  classifications: string[];
};

export const EMPTY_FILTER: AttestationFilter = {
  actorQuery: "",
  kinds: [],
  timeWindowMs: null,
  trustStates: [],
  classifications: [],
};
