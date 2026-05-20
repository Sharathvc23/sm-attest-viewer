# Attested Action Envelope (AAE) — Working Draft

**Version:** v0.1 (working draft)
**Status:** Documents the wire format used by the reference implementation. **Not a normative specification.** Treat as a design document offered for review and as a starting point if/when alternate implementations emerge. Open questions consolidated in §12.
**Last updated:** 2026-05-17.

> **Note on language.** Modal words like *must*, *should*, *may* appear throughout this document. They describe how the reference implementation behaves and how a conformant counterpart implementation is expected to behave for round-trip interop. They are **not** RFC 2119 keywords. This document has not been through a formal standards-body review.

---

## 1. Scope and Non-Goals

### 1.1 Scope

The **Attested Action Envelope (AAE)** is the atomic, signed, machine-verifiable unit of evidence that an autonomous agent took (or will take) a specific action under a specific rule frame at a specific time.

The v0.1 envelope (§3) carries the surface fields an operator needs to triage attestation streams. The richer audit-grade envelope that an AAE *conceptually* binds together — described below for context — is not entirely present at v0.1 and is documented in **Appendix A** as the future direction:

1. **Who** — the acting agent's identity (v0.1: via `actor`; Appendix A: explicit `agent_did` + authorization chain).
2. **What** — the action taken (v0.1: `payload.kind` as a string verb; Appendix A: structured `action_intent`).
3. **When** — wall-clock timestamps (v0.1: `ts` + `payload.recorded_at`; Appendix A: per-state lifecycle timestamps).
4. **Where** — jurisdictional scope (v0.1: not carried; Appendix A: `jurisdiction` with handoff chain).
5. **Why allowed** — rule attribution (v0.1: implicit in `topic` and `payload.kind`; Appendix A: explicit `rule_citation` and `defeated_rules`).
6. **What it produces** — evidence pointers (v0.1: `evidence_ref` URI; Appendix A: `evidence_hashes` array).
7. **How it links** — causal-chain anchoring (v0.1: `trace_id` correlation only; Appendix A: `predecessor_hash`).
8. **By whose signature** — cryptographic proof (v0.1: opaque `payload.proof`; Appendix A: top-level `signature` + `countersignatures`).

AAE implements the **Attestation pillar** of Project NANDA's four-pillar architecture (DNS / CA / Orchestration / Attestation). It is the *per-action* complement to NANDA's *per-credential* primitives: NANDA's AgentFacts and KYA 1.0 describe *static claims about an agent and who vouches for them*; AAE describes *dynamic action taken by an agent under rules at a moment in time*. Together they form a complete evidence substrate for the Internet of Agents.

AAE is intentionally domain-neutral. It applies anywhere agents act under rules and a verifiable audit record matters — enterprise workflows under internal policy, regulated data handling under GDPR / HIPAA / PCI-DSS, customer-facing automation under SLA commitments, cross-organization coordination, and any other setting where *"what did the agent do, under whose authority"* is a question worth answering.

### 1.2 Non-Goals

This specification does **not** define:

- Agent identity issuance, rotation, or revocation (see W3C DID Core and the implementing substrate's identity service).
- Rule definition or compilation (rule packs are out of scope; see the implementing substrate's policy specification).
- Transport mechanics — AAE is transport-neutral.
- UI rendering choices (see informative §11 for hints).
- Storage and indexing (see the implementing substrate's persistence specification).
- Settlement, billing, or accounting derived from AAE streams.

### 1.3 Audiences

| Audience | Reads sections |
|----------|----------------|
| Producer implementer (v0.1) | 1, 2, 3, 6, 10 |
| Renderer implementer (v0.1) | 1, 2, 3, 6, 10, 11 |
| Producer / renderer planning ahead | 1, 4, 5, 7, 8, 9, Appendix A |
| Compliance / auditor | 1, 3, 6, 9, Appendix A |
| Researcher / academic | 1, 2, 8, 12, Appendix A |

---

## 2. Relationship to Other Specifications

### 2.1 W3C Verifiable Credentials 2.0

An AAE **MUST** be expressible as a W3C VC 2.0 Verifiable Credential ([VC-DATA-MODEL-2.0]). The `credentialSubject` carries the AAE structure defined in §3. The `proof` field carries one or more `DataIntegrityProof` entries per §4.

Backward compatibility: AAEs **MAY** continue to be issued under VC 1.1 with `Ed25519Signature2020` proofs during the VC 1.1 → VC 2.0 migration window. Verifiers **MUST** accept both. New issuers **SHOULD** default to VC 2.0.

### 2.2 Project NANDA — Four-Pillar Architecture

Project NANDA defines four named chokepoints that the open Internet of Agents must solve: **DNS** (discovery / registry), **CA** (decentralized identity and cryptographic verification), **Orchestration** (dynamic agent routing and coordination), and **Attestation** (verifiable evidence of agent work). This specification addresses the **Attestation pillar** at the per-action level.

AAE relationship to NANDA primitives:

- **AgentFacts** (NANDA Pillar 1/2): static, signed, JSON-LD descriptions of an agent — capabilities, identity, endpoints, TTL-bounded discovery. AgentFacts answer *"Is this agent allowed to do X-class actions?"*
- **AAE** (NANDA Pillar 4): per-action signed evidence. AAE answers *"Did this agent do this specific X under this specific rule, with this specific authority, at this specific time?"*

AAEs **SHOULD** reference the agent's NANDA AgentFacts bundle via the `agent_did` resolution path. Renderers **MAY** fetch the AgentFacts bundle and surface capabilities and identity attestations alongside the AAE.

See: [projectnanda.org](https://projectnanda.org), [projnanda/adapter](https://github.com/projnanda/adapter), [official docs](https://projnanda.github.io/projnanda/).

### 2.3 KYA 1.0 — Credential Attestation Complement

NANDA's **KYA 1.0** (Know-Your-Agent) specifies credential-level attestation: mutual-TLS, OIDC, optional hardware enclave proofs, plus Verifiable Credentials that attach `credentialSubject` claims signed by external auditors. KYA attests *the credential*; AAE attests *the action*.

Operationally, KYA and AAE compose: a KYA-attested credential authorizes an agent to act; each subsequent action emits an AAE that references the agent's KYA-attested identity and the rule the action was authorized under.

### 2.4 COSE / JWS

AAEs are transported in one of two cryptographic envelope formats (see §4):

- **COSE-Sign1** ([RFC 9052]) — canonical wire format for bandwidth-constrained or low-trust transports.
- **JWS** ([RFC 7515]) — presentation projection at the serializer boundary for web tooling, browsers, and JavaScript verifier libraries.

Both encode the **same VC**. Implementations **MUST NOT** treat them as different envelopes — they are two encodings of one semantic object.

### 2.5 MCP / A2A / AG-UI

AAE is **substrate-neutral** with respect to agent-runtime delivery topologies:

- **MCP** (Model Context Protocol) context updates **MAY** include AAEs as tool-call outputs.
- **A2A** (Agent-to-Agent) protocol envelopes **MAY** carry AAEs as message payloads.
- **AG-UI** streams **MUST** emit AAEs as `EVIDENCE` events when the action is attestable.

MCP and A2A are stewarded by the **Linux Foundation Agentic AI Foundation (AAIF)** (formed December 2025). AAE is a layered companion to these protocols, not a competitor — an implementation **MAY** translate AAEs across MCP / A2A / AG-UI boundaries; this specification does not mandate how.

### 2.6 IETF ACAP — Adjacent Credential-Attestation Draft

[IETF `draft-yakung-oauth-agent-attestation`](https://datatracker.ietf.org/doc/draft-yakung-oauth-agent-attestation/) — Agent Credential Attestation Protocol (ACAP) — specifies a short-lived JWT carrying scope-limited permissions plus a SHA-256 hash of the originating human instruction. ACAP is **complementary, not competitive** with AAE:

- ACAP: per-task, JWT-based, tied to the human instruction that initiated the task. Lives at the OAuth-style authorization layer.
- AAE: per-action, VC-based, tied to a rule citation and the agent's causal chain. Lives at the evidence/audit layer.

A single agent invocation **MAY** be authorized via ACAP and then produce one or more AAEs as it executes — ACAP describes *permission to act*, AAE describes *action taken*.

### 2.7 NANDA ART — Agents, Resources, Tools

NANDA's **ART** taxonomy (Agents, Resources, Tools) categorizes addressable entities in the agent web. The v0.1 envelope (§3) does not carry an explicit resource field at the top level; the resource being acted upon is encoded by convention in `payload.kind` and the event `topic`. If the richer envelope in Appendix A is adopted in a future version, its `action_intent.resource` field would correspond to the **R** in ART, and renderers could resolve it against the ART registry. At v0.1, ART integration is therefore convention-based, not schema-grounded.

### 2.8 OCP / sm-locp — Rule Engine Producing AAEs

AAEs are produced by a rule engine that evaluates an agent's proposed action against a regulatory theory, defeasible rule pack, or policy bundle, and issues a W3C Verifiable Credential carrying the result. The reference open-source implementation is **[`sm-locp`](https://github.com/Sharathvc23/sm-locp)** — the Open Compliance Protocol (OCP) — which provides:

- A defeasible-logic engine.
- A machine-readable regulations (MRR) format.
- A W3C VC issuance layer (`VCGenerator` + `ComplianceCredentialSubject`) that mints AAE-shaped envelopes.

An AAE is, concretely, a `DataIntegrityProof`-bearing VC produced by an OCP-conformant rule engine. `sm-locp` is one such engine; any implementation that passes the OCP conformance suite **MAY** produce AAEs that this renderer accepts.

`sm-attest-viewer` is the operator-facing renderer for AAE streams produced by `sm-locp` (or any other OCP-conformant engine). The two packages compose: `sm-locp` mints, `sm-attest-viewer` displays.

---

## 3. AAE Structure (v0.1, as shipped)

This section describes the wire envelope as actually shipped by the reference implementation. The envelope is a flat JSON object carrying the surface fields an operator needs to triage an attestation stream; cryptographic detail rides inside `payload.proof`.

For a richer envelope shape — with explicit `action_intent`, `rule_citation`, `defeated_rules`, jurisdiction, and other audit-trail-grade fields — see **Appendix A: Future Direction**. The fields in Appendix A are anticipated for v0.2+ and are **not** part of v0.1.

### 3.1 Required top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `v` | literal `1` | Schema version marker. Renderers and verifiers reject any other value at v0.1. |
| `id` | string | Unique event identifier (substrate-assigned). |
| `ts` | RFC 3339 datetime | Wall-clock time the event was emitted. |
| `tenant` | string | Tenant namespace for multi-tenant isolation. |
| `actor` | object (see §3.4) | The agent emitting the event. |
| `topic` | string | Substrate topic the event was emitted on (e.g., the AG-UI / MCP / A2A topic path). |
| `type` | string | Envelope-kind discriminator. v0.1 producers commonly emit `"EVIDENCE"`; v0.2 producers SHOULD emit one of `"action" \| "decision" \| "belief" \| "checkpoint"` (see §13). Conforming renderers normalize unknown values to `"action"`. |
| `classification` | string | Consumer-defined sensitivity label. Free-form. Common values include `public`, `internal`, `restricted`, `confidential`. Renderers ship default styling for common labels but accept any value. |
| `payload` | object (see §3.5) | Type-specific content. |

### 3.2 Optional top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `lifecycle` | enumerated (see §6) | Current lifecycle state: `proposed \| signed \| committed \| anchored \| reconciled`. Absence means lifecycle unknown to the renderer (legacy substrate). |
| `reconciled_outcome` | enumerated (see §6.1) | Reconciliation result; only meaningful when `lifecycle === "reconciled"`. |
| `evidence_ref` | URI | Pointer to an external evidence store (transparency log, archive). Renderers use its presence as a trust-state signal when `lifecycle` is absent. |
| `trace_id` | string | Causal-chain identifier shared across related events. Used by renderers to render correlation chips. |

### 3.3 Wire format

The v0.1 envelope is plain JSON. No canonical-to-wire transformation is required at this version — top-level keys are emitted as-is, and the renderer reads them as-is. A richer canonical-to-wire mapping (matching W3C VC 2.0 JSON-LD conventions) is documented in Appendix A for the future direction.

### 3.4 `actor` (sub-structure)

| Field | Type | Description |
|-------|------|-------------|
| `namespace` | string | Actor namespace (e.g., `ops`, `consensus`). |
| `value` | string | Actor value within the namespace. |
| `did` | string or null | The actor's DID. Null when the actor predates DID assignment. |
| `display_name` | string or null | Optional human-renderable label. |

The renderer derives a display label as `namespace/value` with `did` as a tooltip; `display_name` is used only when present.

### 3.5 `payload` (type-specific)

`payload` is a free-shape object whose contents vary by event `type`. For attestation events (`type: "EVIDENCE"`), the renderer recognizes the following payload keys — all optional:

| Field | Type | Description |
|-------|------|-------------|
| `subject` | object | The subject of the attested action. Same shape as `actor` minus `display_name`. |
| `kind` | string | Action verb / category. Examples used in fixtures: `image_verified`. Consumers define their own kinds. |
| `image_digest` | string | Content hash of an attested artifact (e.g., `sha256:...`). The renderer surfaces a truncated form. |
| `recorded_at` | RFC 3339 datetime | When the underlying action occurred. May predate the event-level `ts` if the action was buffered before emission. |
| `proof` | object | Cryptographic proof block (W3C VC `proof` shape — `type`, `cryptosuite`, `created`, `verificationMethod`, `proofValue`). The renderer treats this as opaque; signature verification is deferred to v1.x (see §3.6). |

Substrates **may** include additional fields in `payload` for their own consumers. The renderer ignores keys it does not recognize.

### 3.6 What the renderer does and does not verify

At v0.1, trust state is derived from the envelope's `lifecycle` and `reconciled_outcome` (see §6 and §11.2), plus the presence of `payload.proof.proofValue` or `evidence_ref` as a legacy fallback. The renderer **does not** cryptographically verify `proof.proofValue` against `verificationMethod`. A "verified" trust gem at v0.1 means *"the substrate marked the envelope as verified"* — not *"the signature has been independently checked."*

Consumers that require independent cryptographic verification should run a W3C VC verify library before passing events to the renderer.

### 3.7 Versioning marker

The `v: 1` field is the only schema-version marker at v0.1. Renderers and verifiers reject events whose `v` is not `1`. Future major schema changes will land as `v: 2` and produce a fresh envelope shape; the migration plan lives in Appendix A.

---

## 4. Wire Formats

> §4 is load-bearing for round-trip interop. Two encodings, one semantic object.

### 4.1 COSE-Sign1 (canonical)

The canonical wire format is **COSE-Sign1** ([RFC 9052]):

- **Payload:** the canonicalized AAE JSON-LD document (RDF canonicalization per [URDNA2015]).
- **Protected header:** `alg` (cryptosuite identifier), `kid` (verification method DID URL), `content type` (`application/vc+ld+json`).
- **Unprotected header:** classification token, jurisdiction handoff marker.
- **Signature:** single Ed25519 / ECDSA-P256 / ML-DSA signature depending on the issuer's chosen cryptosuite per §4.4.

Implementations on bandwidth-constrained transports **SHOULD** use COSE-Sign1.

### 4.2 JWS (presentation projection)

Web tooling, browser-based renderers, and JavaScript verifier libraries consume the same VC as a **detached JWS** ([RFC 7515]) — the *presentation* of the canonical COSE envelope. The implementing substrate's serializer boundary re-projects COSE-Sign1 into JWS for web consumers.

Both representations carry the same `proofValue`. A renderer **MAY** display the active encoding as a chip ("COSE-Sign1" / "JWS"); the underlying verification outcome **MUST** be identical.

### 4.3 Verification

Verifiers **MUST**:

1. Reject AAEs whose `@context` array does not include the AAE namespace context (§3.8).
2. Resolve the `verificationMethod` to a DID document and extract the public key per the cryptosuite indicated by the proof.
3. Verify the signature over the canonicalized payload per the cryptosuite verification algorithm.
4. For VC 2.0 `DataIntegrityProof` entries, dispatch on the `cryptosuite` field, **not** on `proof.type`.
5. Validate every countersignature against its respective verification method.

Verifiers **MUST NOT**:

- Accept an AAE whose `cryptosuite` field is missing when `proof.type === "DataIntegrityProof"`.
- Silently downgrade VC 2.0 `DataIntegrityProof` to a legacy proof type.

### 4.4 Cryptosuite registry

| Cryptosuite | VC version | Notes |
|-------------|------------|-------|
| `Ed25519Signature2020` | 1.1 | Default during VC 1.1 → VC 2.0 migration. |
| `EcdsaSecp256r1Signature2019` | 1.1 | NIST P-256 / cloud KMS path. |
| `eddsa-rdfc-2022` | 2.0 | Default classical signature under VC 2.0. `DataIntegrityProof` + this cryptosuite. |
| `ecdsa-rdfc-2019` | 2.0 | NIST P-256 under VC 2.0. |
| `ml-dsa-2025` | 2.0 | Post-quantum slot (FIPS 204). Carried in `proofs[]` next to the classical entry; hybrid signing. |

---

## 5. Anchoring (Normative)

### 5.1 Transparency log requirement

Every committed AAE **SHOULD** be anchored to a transparency log within the agent's policy-defined anchor window (typical: 24 hours; intermittent-network agents: at next reconnect).

Anchoring **MUST** produce:

1. An inclusion proof that the AAE's hash appears in the log.
2. A log timestamp that **MUST** be greater than or equal to the AAE's `signed_at`.
3. A Merkle batch identifier so a downstream verifier can fetch sibling AAEs.

### 5.2 Merkle batching

Anchoring **MAY** batch multiple AAEs into a single Merkle tree commitment. A batch of `N` AAEs produces one log entry containing the Merkle root, with inclusion proofs of size `O(log N)` per AAE.

Batches **SHOULD** be bounded by policy:

- Time bound (e.g., one batch every 5 minutes).
- Size bound (e.g., max 1024 AAEs per batch).
- Classification bound — if a deployment uses classification labels with differing handling rules, AAEs of different classifications **SHOULD NOT** be batched together.

### 5.3 Independent verifiability

An external auditor with only:

- The AAE itself.
- The transparency log URL.
- The DID resolver for `verificationMethod`.

**MUST** be able to verify:

1. The signature is valid.
2. The AAE was anchored within the policy window.
3. The transparency log is consistent (no equivocation between this AAE and the wider log).

No proprietary service may be on the verification path. (A reconciliation service **MAY** be on the *production* path — see §7 — but never on the verification path.)

---

## 6. Lifecycle (Normative)

An AAE moves through exactly the following states, in order:

```
   proposed → signed → committed → anchored → reconciled
```

| State | Definition | Set by |
|-------|------------|--------|
| **proposed** | Agent has expressed intent but not yet signed. | Agent local logic. |
| **signed** | Primary signature applied (`signature` field populated). | Issuer agent. |
| **committed** | Persisted to local append-only store (`committed_at` populated). | Local persistence layer. |
| **anchored** | Inclusion proof obtained from transparency log (§5). | Anchoring service. |
| **reconciled** | Distributed views have converged; no outstanding divergence. | Reconciliation service. |

State transitions **MUST** be monotonic — an AAE never moves backwards.

### 6.1 Reconciliation outcomes

Reconciliation **MAY** result in one of:

- **converged** — all replicas agree. The AAE is canonical.
- **superseded** — a later AAE has overwritten the effect. The AAE remains in the chain but is annotated as superseded.
- **conflicting** — divergence detected; resolution requires human-in-the-loop (HITL) or a defeasible-rule rerun. The AAE is marked `conflicting` pending resolution.

### 6.2 Revocation

An AAE itself is **never** revoked. The action it describes happened; the envelope is immutable evidence of that. Revocation applies to the *authorization* an AAE relied on (via W3C status lists on the upstream credential) — not to the AAE.

---

## 7. Offline / Intermittent-Network Semantics (Normative)

### 7.1 Disconnected operation

Agents operating under intermittent network conditions **MUST** be able to:

1. Sign AAEs locally using their pre-provisioned signing key.
2. Queue AAEs for later transmission.
3. Chain AAEs via `predecessor_hash` so the causal order survives queue reordering.

### 7.2 Replay on reconnect

On reconnect, an agent **MUST** send queued AAEs in `signed_at` chronological order. The receiving substrate **MUST** accept out-of-order arrival (the chain anchors verify order independently of arrival order).

### 7.3 Conflict resolution

When two agents acting concurrently sign AAEs that imply incompatible state changes, the conflict is resolved by:

1. **Causal order:** the AAE with the earlier `signed_at` wins, *if and only if* both predecessor hashes resolve into a consistent partial order.
2. **Rule rerun:** if causal order is ambiguous (clock skew within tolerance, no shared predecessor), the conflict is escalated for a defeasible-rule rerun using both AAEs as inputs.
3. **HITL:** if rule rerun also yields no deterministic resolution, the conflict surfaces in the Attestations Inbox for human resolution.

The resolution itself is an AAE: it cites the rule(s) used, references the conflicting AAEs by hash, and chains forward in both agents' causal lines. This is the "conflict resolution as AAE" pattern.

---

## 8. Versioning and Forward Compatibility (Normative)

### 8.1 Version field

This specification is identified by the `@context` URI `https://sharathvc23.github.io/sm-aae/ns/v1`. Future major versions **MUST** use a distinct URI (e.g., `…/ns/v2`). Verifiers **MUST** reject AAEs whose context URI they do not recognize (§3.8).

### 8.2 Field additions

Within a major version, new optional fields **MAY** be added to §3.2. Verifiers **MUST** ignore unknown optional fields and **MUST NOT** treat their presence as a verification failure.

New required fields **MUST NOT** be added within a major version. Such changes require a new major version URI.

### 8.3 Cryptosuite additions

New cryptosuites **MAY** be added to §4.4 at any time. Verifiers encountering an unknown cryptosuite **MUST** fail closed (treat as unverifiable), not fail open (assume valid).

### 8.4 Hybrid signing path

The `proofs[]` list shape is the forward-compatibility path for hybrid classical + post-quantum signing. An AAE in hybrid mode carries:

- `proof` — legacy single-proof field, populated with the classical signature (e.g., Ed25519).
- `proofs[0]` — same classical signature, list-shaped for VC 2.0 readers.
- `proofs[1]` — post-quantum signature (e.g., `ml-dsa-2025`).

Verifiers in hybrid environments **SHOULD** validate both entries; until PQ cryptography is mandated, classical-only verifiers **MAY** continue validating only `proof` or `proofs[0]`.

---

## 9. Security Considerations (Normative)

### 9.1 Replay

An AAE is by design a record of an action that has occurred. Replay is not prevented at the envelope layer — downstream consumers **MUST** track processed AAE IDs to avoid double-execution of side-effects derived from AAE consumption.

The `predecessor_hash` chain provides causal-order protection: a replayed AAE inserted out of sequence will fail chain validation against the agent's local store.

### 9.2 Key rotation

Verification keys (referenced by `verificationMethod`) **MUST** be resolvable for the *time period the AAE was signed*. DID resolvers **MUST** support time-anchored resolution; serving only the current key is insufficient because an AAE signed last year is verified with last year's key.

DID documents in the implementing substrate **MUST** include a key rotation history with effective windows.

### 9.3 Multi-party cross-signing

Some deployments require signatures from multiple authorities — for example, cross-organization coordination requiring sign-off from each party, or regulatory submissions requiring both issuer and auditor signatures. The `countersignatures` field carries these as additional `proofs[]` entries, each with its own `verificationMethod` resolving into the cross-signer's DID.

Verifiers in cross-party contexts **MUST** validate each countersignature independently. Failure of any required countersignature **MUST** result in the AAE being rejected for that operational scope, even if the primary signature is valid.

### 9.4 Sensitivity propagation

The AAE `classification` field (§3.2) is **declarative**, not **enforcing** — it labels the envelope but does not by itself restrict access. Substrate components handling AAEs that carry sensitive payloads **MUST**:

- Refuse to deliver AAEs whose classification exceeds the consumer's authorized handling level under the deployment's information-handling policy.
- Refuse to *render* fields whose contents may include sensitive-by-inference data when the consumer is not authorized.

Renderers **MUST NOT** attempt to "downsample" an AAE by stripping fields — the result is an unverifiable envelope. Instead, refuse delivery.

### 9.5 Defeated rule disclosure (Appendix A only)

The v0.1 envelope (§3) does not carry an explicit `defeated_rules` field; defeasible-rule reasoning is opaque to renderers at this version. If the richer envelope (Appendix A) is adopted, `defeated_rules` would be part of the signed payload — making the rule-engine reasoning auditable — and issuers concerned about operationally-sensitive rule logic could redact rule names to hash references that authorized auditors can resolve.

### 9.6 Predecessor-hash gap attacks

An agent **MAY NOT** issue an AAE whose `predecessor_hash` is null when the agent has previously issued an AAE. Verifiers **MUST** track the agent's last known AAE hash and reject envelopes whose predecessor pointer skips over known intermediate AAEs.

This is the AAE-level mitigation of an agent silently dropping intermediate actions from its causal record.

### 9.7 Renderer-side display security (v0.1, normative for the reference renderer)

A trustworthy display of attested evidence is a load-bearing part of any human-in-the-loop verification stack. The reference renderer makes four security guarantees at v0.1:

1. **No content escape.** Every user-supplied field in the envelope (`actor.value`, `payload.subject.did`, `classification`, `payload.kind`, `trace_id`, and any other user-content path) reaches the DOM through React's default text-escaping path. The renderer source contains zero `dangerouslySetInnerHTML`, no string interpolation into HTML, and no eval-style execution patterns.

2. **Hardened object lookups.** Internal maps (trust-state colors, status tones, classification tones, lifecycle borders) are accessed via `Object.hasOwn` guards. A hostile classification label or status string cannot resolve to a prototype method.

3. **Defensive parsing.** Malformed timestamps render as `??:??:??` rather than throwing. Missing payload subfields and non-string runtime values for typed fields render gracefully rather than crashing.

4. **Adversarially tested.** The renderer's test suite explicitly includes XSS-injection cases in actor names and DIDs, prototype-pollution attempts against classification labels and trust states, and malformed timestamp cases. These tests fail loudly if a future contributor regresses any of the four properties above.

Together these properties let an operator trust that what reaches their eyes is what the substrate emitted, with no opportunity for hostile content to attack the display surface itself.

The renderer does **not**, at v0.1, verify the cryptographic proof block independently. Trust state is derived from substrate-stamped `lifecycle` markers (see §3.6 and §11.2). Renderer-side independent verification is a v1.x property and is listed as an open question in §12.

Consumers building HITL approval flows over this renderer therefore rely on two security properties together: (a) the substrate they receive events from is trustworthy enough that its `lifecycle` markers can be trusted, and (b) the renderer's display contract prevents hostile event content from escaping into the operator's UI.

---

## 10. Reference Implementations (Informative)

The following components form the open-source AAE substrate, published under the *Enterprise Internet of AI Agents* portfolio at [github.com/Sharathvc23](https://github.com/Sharathvc23). Each library answers one question; the AAE wire envelope (§3) is the handoff between them.

**AAE producers and renderers**

| Component | Role | Repo |
|-----------|------|------|
| `sm-locp` | Open Compliance Protocol — defeasible-logic engine + W3C VC issuance layer. **Produces AAEs.** | [Sharathvc23/sm-locp](https://github.com/Sharathvc23/sm-locp) |
| `sm-attest-viewer` | Browser-renderable AAE timeline. **Renders AAEs.** *(This repository.)* | [Sharathvc23/sm-attest-viewer](https://github.com/Sharathvc23/sm-attest-viewer) |

**Supporting Behavioral Trust libraries**

| Component | Role | Repo |
|-----------|------|------|
| `sm-airlock` *(private)* | Capability sandbox — attribute-level allowlist + rate limiting + effect staging | — |
| `sm-enclave` | Speculative execution sandbox; stages side effects before AAE commit, discards losers | [Sharathvc23/sm-enclave](https://github.com/Sharathvc23/sm-enclave) |

**Model Trust libraries** (identity / metadata / integrity / governance of the model producing the action)

| Component | Role | Repo |
|-----------|------|------|
| `sm-model-provenance` | Zero-dependency identity dataclass | [Sharathvc23/sm-model-provenance](https://github.com/Sharathvc23/sm-model-provenance) |
| `sm-model-card` | Unified model card schema with 4-state lifecycle | [Sharathvc23/sm-model-card](https://github.com/Sharathvc23/sm-model-card) |
| `sm-model-integrity-layer` | Offline SHA-256 weight hashing + HMAC attestation | [Sharathvc23/sm-model-integrity-layer](https://github.com/Sharathvc23/sm-model-integrity-layer) |
| `sm-model-governance` | Three-plane ML governance with Ed25519 + M-of-N quorum | [Sharathvc23/sm-model-governance](https://github.com/Sharathvc23/sm-model-governance) |

**Federation**

| Component | Role | Repo |
|-----------|------|------|
| `sm-bridge` | NANDA-compatible registry endpoints + Quilt-style delta synchronization | [Sharathvc23/sm-bridge](https://github.com/Sharathvc23/sm-bridge) |

Rule packs, reconciliation service implementations, multi-tenant control planes, and product UIs composed over the open-source viewports are **out of scope** for this working draft.

---

## 11. Rendering Hints (Informative)

This section is informative only. Renderer implementations **MAY** ignore any or all of it without violating conformance.

### 11.1 Citation chips (Appendix A renderers)

The v0.1 envelope (§3) does not carry a `rule_citation` field; rule attribution is implicit in `payload.kind` and the substrate `topic` at this version. If the richer envelope (Appendix A) is adopted and a renderer surfaces `rule_citation`, the following chip schema is suggested for consistency across renderers:

```
[regime] rule_id_short → outcome
```

Examples: `[GDPR] Art. 6(1)(b) → authorized`, `[internal-policy-v3] §refund-cap → conditional`. Tooltip-on-hover would reveal `evaluation_id` and the full `rule_id` URI.

### 11.2 Trust state visualization

Map AAE lifecycle states (§6) to a 4-state trust gem:

| Lifecycle | Trust gem | Color token |
|-----------|-----------|-------------|
| `proposed` | pending | `--gem-pending` (gray) |
| `signed`, `committed` | verified | `--gem-verified` (green) |
| `anchored` | verified | `--gem-verified` (green) |
| `reconciled` with `converged` | verified | `--gem-verified` (green) |
| `reconciled` with `superseded` | warning | `--gem-warning` (amber) |
| `reconciled` with `conflicting` | failed | `--gem-failed` (red) |

### 11.3 Viewport mapping

Renderer implementations may present AAEs across multiple coordinated viewports. The reference renderer in this package implements only the **Attestations Inbox**; the other viewports are listed as design context for future renderer libraries.

| Viewport | Surfaces v0.1 field(s) | Additional Appendix A fields |
|----------|------------------------|------------------------------|
| **Registry** | `actor`, `actor.did` | `agent_did`, `jurisdiction` |
| **Status** (default landing) | `lifecycle`, `reconciled_outcome`, aggregated across recent events | `operational_state` |
| **Pre-flight simulator** | (none in v0.1 — pre-signed envelopes not carried) | `action_intent` against simulated rule packs |
| **Causal chain** | `trace_id`, `ts` ordering | `predecessor_hash` for hash-anchored chains |
| **Rule engine** | (none in v0.1 — rule attribution is implicit) | `rule_citation`, `defeated_rules`, rule graph |
| **Attestations Inbox** (this package) | `kind`, `classification`, `subject`, `lifecycle` | — |

The Attestations Inbox is **not a primitive** — it is a saved-query lens over the agent's attestation stream plus any human-in-the-loop approval queue.

### 11.4 Sensitivity context

When AAEs carry a `classification` value other than the deployment's default, renderers **SHOULD** surface that context prominently — typically as a top-of-surface banner or row-level badge — so operators can interpret what they're seeing under the right handling rules. Renderers **SHOULD NOT** hide classification context behind tooltips alone.

---

## 12. Open Questions for v1.0

The following questions are open as of v0.1 and would need to be resolved before this document graduates from working draft to a stable design reference:

1. **Field-set graduation.** Whether and when the lean v0.1 envelope (§3) is extended toward the richer envelope in Appendix A — and which fields from Appendix A land in which version step.
2. **Lifecycle vs. authorization-status relationship.** §6 defines an event-level lifecycle (`proposed → signed → committed → anchored → reconciled`). Producers may carry a separate authorization-status enum; v1.0 would state the relationship.
3. **JWS projection boundary.** §4.2 describes a JWS projection produced at the producer's serializer boundary. v1.0 would name a reference component for that projection.
4. **Hybrid signing GA.** §8.4 describes hybrid classical + post-quantum signing as forward-compatible. v1.0 would name a reference implementation milestone.
5. **Countersignature ordering.** If countersignatures land via Appendix A, are they ordered or set-shaped (deduped by `verificationMethod`)?
6. **Anchoring service interop.** §5 specifies the requirements on anchoring but not the specific transparency log implementation. v1.0 would name at least one concrete log (Sigstore-style, IETF SCITT, bespoke) for reference.
7. **Renderer-side cryptographic verification.** §3.6 documents that v0.1 trust state is derived from substrate markers, not from independent signature checks. v1.0 would describe the renderer-side verification path.

---

## 13. Envelope Kinds (v0.2, Normative)

> §13 lands in v0.2. It promotes the existing top-level `type` field (§3.1) from a free-text string to a tagged-union discriminator over four envelope kinds. The promotion is forward-compatible: v0.1 producers emitting `type: "EVIDENCE"` (or any other free-text value) continue to be accepted by conforming renderers, which MUST normalize unknown values to `"action"`.

### 13.1 Discriminator field

The `type` field at envelope root is the kind discriminator. Conforming v0.2 producers MUST emit one of:

| `type` | Meaning |
|--------|---------|
| `"action"`     | Agent action attestation — the historical v0.1 shape. The default for v0.1 → v0.2 migration when no specific kind applies. |
| `"decision"`   | Operator decision attestation — authorize, deny, annotate. May carry an M-of-N proof set when operator quorum is required (see §14, planned). |
| `"belief"`     | Agent internal-state assertion — typically a snapshot of a memory entry the agent took an action on. |
| `"checkpoint"` | Merkle commitment over predecessor envelopes within a scope, enabling reverse audit (see §16, planned). |

`payload.kind` is a distinct field meaning "what was attested" (e.g. `rule_citation`, `image_verified`) and is unchanged by §13. The two fields MUST NOT be conflated.

### 13.2 Field applicability

The §3 base envelope shape applies to all four kinds. Sub-payload shapes specific to `decision` / `belief` / `checkpoint` are defined in §14 / §15 / §16 respectively (planned; not yet normative in v0.2). Until those land, producers SHOULD emit kind-tagged envelopes using the base §3 payload shape and let consumers route on `type` alone.

### 13.3 Backward compatibility

- Renderers MUST accept envelopes whose `type` is any string, not only the four kinds above. Unknown values MUST be treated as `"action"` for rendering purposes.
- v0.1 producers emitting `type: "EVIDENCE"` remain conformant. The reference renderer normalizes such envelopes to `"action"` via the `envelopeKindOf` helper.
- Consumers that need to distinguish kinds MUST switch on the normalized discriminator, not on raw `type`.

### 13.4 Rationale

The discriminator rides on the existing `type` field — not a new `kind` field — because `payload.kind` already exists with a different meaning at §3.5. Promoting a free-text field to a literal union is a type-safety upgrade with no field addition and no fixture migration on existing action data. This aligns with W3C VC 2.0's use of the top-level `type` array for variant tagging.

### 13.5 Cross-reference: reverse-audit substrate

The discriminator is the foundation for bidirectional auditability. Action / decision / belief envelopes chain forward via `predecessor_hash` (when present); checkpoint envelopes commit to a merkle root over predecessor envelopes in scope, enabling reverse audit in O(log N). The full reverse-audit pipeline is the subject of §16 (planned).

---

## Appendix A. Future Direction (Aspirational)

This appendix describes a richer envelope shape anticipated for v0.2 and beyond. **It is not implemented in v0.1.** No reference producer or renderer emits or consumes these fields today. The intent of this appendix is to document the design trajectory so future contributors and integrators can align without re-inventing the structure.

### A.1 Goals of the richer envelope

The v0.1 envelope (§3) carries enough information for an operator to triage attestation streams: who, when, what kind of action, current trust state. A richer envelope would additionally carry:

- The intended action in **structured form** (verb, resource, constraints, parameters) so a rule engine can replay the evaluation.
- An explicit **rule citation** — which strict rule authorized the action, which defeasible rules lost.
- **Jurisdictional scope** — who has authority over the action; whether the action crossed an authority boundary.
- **Causal-chain anchoring** via a `predecessor_hash`, so an entire chain of related actions is verifiable end-to-end.
- **Policy-bundle version binding** so verifiers can confirm the exact rules in effect at evaluation time.
- **Independent renderer-side cryptographic verification** — the renderer (or a verifier sitting in front of it) checks `proof.proofValue` against the resolved `verificationMethod` rather than trusting the substrate's pre-stamped lifecycle marker.

### A.2 Proposed additional top-level fields

A future version would extend §3.1's required-field table with the following. All field names are normative-style sketches; the v1.0 process would lock the final names.

| Field | Type | Purpose |
|-------|------|---------|
| `agent_did` | DID URI | Acting agent's identifier promoted to top-level (currently nested inside `actor.did`). |
| `action_intent` | object (see A.3) | Structured intent for rule-engine replay and audit. |
| `context_hash` | hex SHA-256 | Hash of the canonicalized context bundle the action was evaluated against. |
| `rule_citation` | object (see A.4) | The strict rule that authorized the action. |
| `jurisdiction` | object (see A.5) | Governing authority at evaluation time, with handoff chain. |
| `defeated_rules` | array of rule IDs | Defeasible rules that lost to a stronger rule — auditable reasoning trail. |
| `evidence_hashes` | array of hex SHA-256 | Hashes of supporting evidence artifacts (telemetry, inference logs, input data). |
| `predecessor_hash` | hex SHA-256 or null | Hash of the immediately preceding event in the agent's causal chain. `null` for the agent's first event. |
| `policy_bundle_version` | string | Identifier of the policy bundle in effect (a label, a SHA, or a versioned URI). |
| `signature` | object | Primary cryptographic proof (W3C VC `proof` shape, promoted to top-level). |
| `countersignatures` | array of proofs | Cross-signs by operators, auditors, or jurisdictional authorities. |
| `timestamps` | object (see A.6) | Per-state lifecycle timestamps (`proposed_at` / `signed_at` / `committed_at` / `anchored_at` / `reconciled_at`). |
| `delegation_chain` | array of DelegationProof | Authority chain from ultimate authorizer to acting agent. Required when the acting agent did not originate the authorization. |
| `operational_state` | object | Opaque, substrate-defined runtime indicators (health, confidence, source attribution). Schema is consumer-defined. |
| `domain_context` | object | Domain-specific extension, profile-keyed. Profiles defined by the implementing community for their vertical. |

### A.3 `action_intent` (sub-structure)

| Field | Type | Description |
|-------|------|-------------|
| `verb` | string | Action verb. Examples: `create`, `update`, `delete`, `read`, `send`, `approve`, `execute`, `respond`. |
| `resource` | string | Target resource identifier. Examples: `api:/v1/transfer`, `doc:report-q1`, `table:customers`, `record:patient-12345`. Corresponds to the **R** in NANDA ART. |
| `constraints` | object | Action-specific constraints (rate, scope, time window, etc.). |
| `parameters` | object | Additional parameters not constrained by rules but recorded for replay. |

### A.4 `rule_citation` (sub-structure)

| Field | Type | Description |
|-------|------|-------------|
| `rule_id` | URI | Canonical identifier of the strict rule that authorized the action. |
| `regime` | string | The regulatory or policy regime the rule belongs to. Examples: `GDPR`, `HIPAA`, `PCI-DSS`, `SOC2`, `internal-policy-v3`. |
| `evaluation_id` | hex SHA-256 | Identifier of the rule evaluation that produced this citation, for trace-back into the rule inspector. |
| `outcome` | enumerated | One of: `authorized`, `denied`, `conditional`. |

### A.5 `jurisdiction` (sub-structure)

| Field | Type | Description |
|-------|------|-------------|
| `authority` | string | The jurisdictional authority. Examples: `US`, `EU`, `UK`, `INTL`, or organization-specific identifiers like `acme-corp:legal`. |
| `scope` | object | Spatial / temporal / data-domain scope of the authority's claim. |
| `handoff_chain` | array | If the action crossed a jurisdictional boundary mid-execution, the ordered chain of authority handoffs. Empty if single-jurisdiction. |

### A.6 `timestamps` (sub-structure)

| Field | Type | Description |
|-------|------|-------------|
| `proposed_at` | RFC 3339 datetime | When the agent first proposed the action. |
| `signed_at` | RFC 3339 datetime | When the primary signature was applied. |
| `committed_at` | RFC 3339 datetime or null | When the envelope was committed to the producer's persistence layer. Null until commit. |
| `anchored_at` | RFC 3339 datetime or null | When the envelope was anchored to a transparency log (§5). Null until anchor. |
| `reconciled_at` | RFC 3339 datetime or null | When reconciliation completed (§7). Null until reconcile. |

These mirror the lifecycle states defined in §6.

### A.7 Canonical-to-wire mapping

If the richer envelope is serialized as a W3C VC 2.0 JSON-LD document, the canonical-to-wire mapping would be:

| Canonical | W3C VC location | Wire key |
|-----------|-----------------|----------|
| `agent_did` | `credentialSubject.id` | `id` |
| `action_intent` | `credentialSubject.action` | `action` |
| `context_hash` | `credentialSubject.contextHash` | `contextHash` |
| `rule_citation` | `credentialSubject.ruleCitation` | `ruleCitation` |
| `jurisdiction` | `credentialSubject.jurisdiction` | `jurisdiction` |
| `defeated_rules` | `credentialSubject.defeatedRules` | `defeatedRules` |
| `evidence_hashes` | `credentialSubject.evidenceHashes` | `evidenceHashes` |
| `predecessor_hash` | `credentialSubject.predecessorHash` | `predecessorHash` |
| `policy_bundle_version` | `credentialSubject.policyVersion` | `policyVersion` |
| `delegation_chain` | `credentialSubject.delegationChain` | `delegationChain` |
| `operational_state` | `credentialSubject.operationalState` | `operationalState` |
| `domain_context` | `credentialSubject.context` | `context` |
| `signature` + `countersignatures` | top-level `proof` and `proofs[]` | per §4 |

The v0.1 fields from §3 stay intact under this mapping; the richer fields are additive.

### A.8 Anticipated migration path

The richer envelope would land alongside — not replace — the v0.1 envelope. A producer would:

1. Continue emitting the v0.1 fields exactly as today.
2. Add the richer fields as **optional**, gated on a `v: 2` schema marker (or an extension namespace under a JSON-LD `@context`).
3. Provide a transition period during which renderers can read both shapes.

A renderer would:

1. Continue reading the v0.1 fields exactly as today.
2. Add optional surfaces that display the richer fields when present (e.g., citation chips for `rule_citation`, defeated-rules drill-in for `defeated_rules`).
3. Treat all richer fields as **additive** — their absence must not degrade v0.1-envelope rendering.

### A.9 Status of this appendix

This appendix is **not** a normative specification. It is a forward-compatibility guide. Implementers should track it as design context, not as a current requirement. The decisions in §12 ("Open Questions for v1.0") are the entry points for graduating individual fields from Appendix A into §3.

---

*Generated: 2026-05-13 | Last updated: 2026-05-18*
