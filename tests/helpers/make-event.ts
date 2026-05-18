import type { AttestationEvent } from "../../src/types";

let counter = 0;

/** Build a minimal AAE event for tests; override any field via partial. */
export function makeEvent(overrides: Partial<AttestationEvent> = {}): AttestationEvent {
  counter += 1;
  const base: AttestationEvent = {
    v: 1,
    id: `evt-${counter}`,
    ts: "2026-05-13T12:00:00.000Z",
    tenant: "acme-corp",
    actor: {
      namespace: "ops",
      value: "image-attestor",
      did: "did:example:ops/image-attestor",
      display_name: "Image Attestor",
    },
    topic: "tenants/acme-corp/agents/attestations",
    type: "EVIDENCE",
    classification: "public",
    payload: {
      subject: {
        namespace: "ops",
        value: "image-attestor",
        did: "did:example:ops/image-attestor",
      },
      kind: "image_verified",
      image_digest: "sha256:abc123def456789012345678901234567890",
      recorded_at: "2026-05-13T12:00:00.000Z",
    },
    lifecycle: "anchored",
  };
  return { ...base, ...overrides };
}
