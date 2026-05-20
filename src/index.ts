/**
 * sm-attest-viewer — public API.
 *
 * Reference renderer for the Attested Action Envelope (AAE).
 * See README.md for usage and SPEC.md (working draft) for the wire format.
 */

export { InboxPresentation } from "./inbox-presentation";
export { Timeline } from "./timeline";
export { TimelineRow } from "./timeline-row";
export { Filters } from "./filters";
export { EmptyState } from "./empty-state";
export { SignatureGem, type SignatureGemProps } from "./signature-gem";

export {
  deriveTrustState,
  envelopeKindOf,
  eventAgentLabel,
  eventPassesFilter,
  actorMatchKey,
  distinctKinds,
  distinctClassifications,
  TIME_WINDOW_OPTIONS,
} from "./filter-logic";

export {
  EMPTY_FILTER,
  type AAEActor,
  type AAEClassification,
  type AAEEnvelopeKind,
  type AAELifecycle,
  type AAEReconciledOutcome,
  type AttestationEvent,
  type AttestationFilter,
  type AttestationPayload,
  type AttestationSubject,
  type ConnectionStatus,
  type TrustState,
} from "./types";

export { TooltipProvider } from "./ui/tooltip";
