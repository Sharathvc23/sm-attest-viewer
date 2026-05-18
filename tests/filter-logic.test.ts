/**
 * Unit tests for src/filter-logic.ts — the pure derivation/filter functions
 * exported from sm-attest-viewer.
 *
 * These tests pin the contract described in SPEC §11.2 (trust state
 * visualization) so any future change to deriveTrustState must update
 * both the spec and the tests in lockstep.
 */

import { describe, it, expect } from "vitest";
import {
  deriveTrustState,
  eventAgentLabel,
  actorMatchKey,
  eventPassesFilter,
  distinctKinds,
  distinctClassifications,
} from "../src/filter-logic";
import { EMPTY_FILTER, type AttestationEvent, type AttestationFilter } from "../src/types";

const baseEvent = (overrides: Partial<AttestationEvent> = {}): AttestationEvent => ({
  v: 1,
  id: "test-id",
  ts: "2026-05-17T12:00:00.000Z",
  tenant: "acme-corp",
  actor: {
    namespace: "ops",
    value: "agent",
    did: "did:example:ops/agent",
    display_name: "Agent",
  },
  topic: "tenants/acme-corp/agents/attestations",
  type: "EVIDENCE",
  classification: "public",
  payload: {
    subject: { namespace: "ops", value: "subject", did: "did:example:ops/subject" },
    kind: "image_verified",
  },
  ...overrides,
});

describe("deriveTrustState", () => {
  it("returns 'verified' for lifecycle 'signed'", () => {
    expect(deriveTrustState(baseEvent({ lifecycle: "signed" }))).toBe("verified");
  });

  it("returns 'verified' for lifecycle 'committed'", () => {
    expect(deriveTrustState(baseEvent({ lifecycle: "committed" }))).toBe("verified");
  });

  it("returns 'verified' for lifecycle 'anchored'", () => {
    expect(deriveTrustState(baseEvent({ lifecycle: "anchored" }))).toBe("verified");
  });

  it("returns 'verified' for lifecycle 'reconciled' + outcome 'converged'", () => {
    expect(
      deriveTrustState(baseEvent({ lifecycle: "reconciled", reconciled_outcome: "converged" })),
    ).toBe("verified");
  });

  it("returns 'warning' for lifecycle 'reconciled' + outcome 'superseded'", () => {
    expect(
      deriveTrustState(baseEvent({ lifecycle: "reconciled", reconciled_outcome: "superseded" })),
    ).toBe("warning");
  });

  it("returns 'failed' for lifecycle 'reconciled' + outcome 'conflicting'", () => {
    expect(
      deriveTrustState(baseEvent({ lifecycle: "reconciled", reconciled_outcome: "conflicting" })),
    ).toBe("failed");
  });

  it("returns 'pending' for lifecycle 'proposed'", () => {
    expect(deriveTrustState(baseEvent({ lifecycle: "proposed" }))).toBe("pending");
  });

  it("falls through to 'verified' when no lifecycle but proofValue present (legacy)", () => {
    expect(
      deriveTrustState(
        baseEvent({
          payload: { proof: { proofValue: "z58..." } },
        }),
      ),
    ).toBe("verified");
  });

  it("falls through to 'verified' when no lifecycle but evidence_ref present (legacy)", () => {
    expect(deriveTrustState(baseEvent({ evidence_ref: "evidence://x/1" }))).toBe("verified");
  });

  it("returns 'pending' when no lifecycle and no proof and no evidence_ref", () => {
    expect(deriveTrustState(baseEvent({ payload: {} }))).toBe("pending");
  });

  it("treats reconciled + unspecified outcome as verified (most-charitable default)", () => {
    expect(deriveTrustState(baseEvent({ lifecycle: "reconciled" }))).toBe("verified");
  });
});

describe("eventAgentLabel", () => {
  it("prefers subject namespace/value", () => {
    expect(
      eventAgentLabel(
        baseEvent({
          payload: { subject: { namespace: "ops", value: "audit-archiver", did: "did:example:..." } },
        }),
      ),
    ).toBe("ops/audit-archiver");
  });

  it("falls back to actor namespace/value if no subject", () => {
    expect(
      eventAgentLabel(
        baseEvent({
          payload: {},
          actor: {
            namespace: "ops",
            value: "image-attestor",
            did: "did:example:ops/image-attestor",
          },
        }),
      ),
    ).toBe("ops/image-attestor");
  });

  it("returns em-dash for completely empty actor", () => {
    expect(
      eventAgentLabel(
        baseEvent({
          payload: {},
          actor: { namespace: "", value: "", did: null },
        }),
      ),
    ).toBe("—");
  });
});

describe("actorMatchKey", () => {
  it("includes subject, actor, and display name in lowercase haystack", () => {
    const key = actorMatchKey(
      baseEvent({
        payload: {
          subject: { namespace: "ops", value: "Subject", did: "did:example:ops/SUBJECT" },
        },
        actor: {
          namespace: "ops",
          value: "Actor",
          did: "did:example:ops/ACTOR",
          display_name: "Pretty Name",
        },
      }),
    );
    expect(key).toContain("ops/subject");
    expect(key).toContain("ops/actor");
    expect(key).toContain("pretty name");
    expect(key).toBe(key.toLowerCase());
  });
});

describe("eventPassesFilter", () => {
  const now = Date.parse("2026-05-17T12:00:00.000Z");

  it("passes events through when filter is empty", () => {
    expect(eventPassesFilter(baseEvent(), EMPTY_FILTER, now)).toBe(true);
  });

  it("rejects events whose actorQuery substring doesn't match", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, actorQuery: "nonexistent" };
    expect(eventPassesFilter(baseEvent(), filter, now)).toBe(false);
  });

  it("accepts events whose actorQuery substring matches the subject DID", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, actorQuery: "subject" };
    expect(eventPassesFilter(baseEvent(), filter, now)).toBe(true);
  });

  it("filters by kind when kinds is non-empty", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, kinds: ["behavior_proof"] };
    expect(eventPassesFilter(baseEvent(), filter, now)).toBe(false);
    expect(eventPassesFilter(baseEvent({ payload: { kind: "behavior_proof" } }), filter, now)).toBe(
      true,
    );
  });

  it("rejects events older than the time window", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, timeWindowMs: 5 * 60 * 1000 };
    const old = baseEvent({ ts: "2026-05-17T11:30:00.000Z" });
    expect(eventPassesFilter(old, filter, now)).toBe(false);
  });

  it("accepts events inside the time window", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, timeWindowMs: 60 * 60 * 1000 };
    const recent = baseEvent({ ts: "2026-05-17T11:30:00.000Z" });
    expect(eventPassesFilter(recent, filter, now)).toBe(true);
  });

  it("rejects events with malformed timestamps when a time window is active", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, timeWindowMs: 5 * 60 * 1000 };
    expect(eventPassesFilter(baseEvent({ ts: "not-a-date" }), filter, now)).toBe(false);
  });

  it("filters by trust state", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, trustStates: ["failed"] };
    expect(eventPassesFilter(baseEvent({ lifecycle: "signed" }), filter, now)).toBe(false);
    expect(
      eventPassesFilter(
        baseEvent({ lifecycle: "reconciled", reconciled_outcome: "conflicting" }),
        filter,
        now,
      ),
    ).toBe(true);
  });

  it("filters by classification (consumer-defined free-form string)", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, classifications: ["restricted"] };
    expect(eventPassesFilter(baseEvent({ classification: "public" }), filter, now)).toBe(false);
    expect(eventPassesFilter(baseEvent({ classification: "restricted" }), filter, now)).toBe(true);
  });

  it("filters by a custom classification label the consumer defines", () => {
    const filter: AttestationFilter = { ...EMPTY_FILTER, classifications: ["pci-restricted"] };
    expect(eventPassesFilter(baseEvent({ classification: "pci-restricted" }), filter, now)).toBe(true);
    expect(eventPassesFilter(baseEvent({ classification: "public" }), filter, now)).toBe(false);
  });
});

describe("distinctKinds", () => {
  it("returns sorted unique kinds", () => {
    const events = [
      baseEvent({ id: "1", payload: { kind: "behavior_proof" } }),
      baseEvent({ id: "2", payload: { kind: "image_verified" } }),
      baseEvent({ id: "3", payload: { kind: "behavior_proof" } }),
      baseEvent({ id: "4", payload: { kind: "rule_citation" } }),
    ];
    expect(distinctKinds(events)).toEqual(["behavior_proof", "image_verified", "rule_citation"]);
  });

  it("skips events with no kind", () => {
    const events = [baseEvent({ id: "1", payload: {} }), baseEvent({ id: "2", payload: { kind: "x" } })];
    expect(distinctKinds(events)).toEqual(["x"]);
  });

  it("returns empty array for empty input", () => {
    expect(distinctKinds([])).toEqual([]);
  });
});

describe("distinctClassifications", () => {
  it("returns sorted unique classification labels (whatever the consumer used)", () => {
    const events = [
      baseEvent({ id: "1", classification: "public" }),
      baseEvent({ id: "2", classification: "internal" }),
      baseEvent({ id: "3", classification: "public" }),
      baseEvent({ id: "4", classification: "restricted" }),
    ];
    expect(distinctClassifications(events)).toEqual(["internal", "public", "restricted"]);
  });

  it("returns empty array for empty input", () => {
    expect(distinctClassifications([])).toEqual([]);
  });
});
