# sm-attest-viewer: The Attested Action Envelope and Its Operator Surface

*Personal research contribution by [Stellarminds.ai](https://stellarminds.ai), aligned with [Project NANDA](https://projectnanda.org) standards.*

---

## Abstract

The Attested Action Envelope (AAE) is a per-action evidence primitive for autonomous AI agents: a signed, machine-verifiable record that an agent took a specific action, under a specific rule, at a specific time, with a specific authority. AAEs are produced by a rule engine — the open-source reference engine is `sm-locp` — and emitted as W3C Verifiable Credentials. `sm-attest-viewer` is the reference renderer for AAE event streams. It is the **first operator-facing surface** in an otherwise substrate-only portfolio of open-source primitives for the Internet of AI Agents.

This whitepaper makes the case that AAE *rendering* is a primitive in its own right, separable from the engines that produce AAEs, and that a substrate-neutral, domain-neutral, test-driven renderer is the right shape for that primitive. The wire format, lifecycle, and rendering rules used by the reference implementation are documented in [`SPEC.md`](./SPEC.md) as a working draft. This document covers motivation, design choices, and composition.

---

## 1. Problem

Autonomous agents are increasingly entrusted with consequential actions: executing financial transactions, recommending clinical interventions, controlling physical infrastructure, dispatching automated communications under brand reputation. In each of these domains, the safety consensus is consistent — above a defined threshold, an autonomous decision passes through a human supervisor before it commits.

The verification surface where that supervisor approves or rejects is itself a security boundary. Two parallel threat vectors converge on this surface:

1. **Endpoint-level attacks** — compromise of the operator's hardware, OS, browser, or credentials. Defenses live in hardware-attested keys, trusted-execution paths, and out-of-band verification. Outside the scope of this package.

2. **Content-level attacks** — hostile payloads carried inside otherwise-trusted events. XSS injection in actor names or rule citations. Prototype-pollution via untrusted object keys. Approval flows that render correctly but interpolate attacker-controlled strings. The display surface itself becomes the attack vehicle, even when the underlying substrate is trustworthy. **This package addresses this vector.**

The default for observer-facing surfaces today — a chat log — is unsigned, lacks rule citations, has no causal-chain anchoring, *and* is not particularly defensive about what it renders. It breaks down for autonomous agents on every axis:

- **Chat logs are not signed.** They can be edited, fabricated, or simply lost. No cryptographic binding between the agent that acted and the record of the action.
- **Chat logs do not surface rule citations.** A compliance officer reading a thousand-line transcript cannot quickly see *which rule was applied, what evidence supported it, what defeater rules lost*.
- **Chat logs are not causal.** When an agent issues a sequence of related actions, the chat log does not encode the predecessor pointer — no way to verify that no intermediate action was silently dropped.
- **Chat logs are not display-safe.** A markdown renderer that escapes script tags is not the same as a renderer audited against the threat model that operators acting on agent attestations actually face.

For autonomous agents to operate at scale under any consequential rule frame, observers need a different artefact: a **per-action, cryptographically-bound, rule-citing, causal-chained envelope**, rendered by a display surface that can be trusted to show exactly what the substrate emitted — with no opportunity for hostile content to execute. That artefact is the Attested Action Envelope, displayed by this renderer.

## 2. The AAE Primitive

Conceptually, an Attested Action Envelope binds together eight facts about a single agent action. The v0.1 wire envelope (`SPEC.md` §3) carries a subset of these explicitly today; a richer carrier for the rest is anticipated in `SPEC.md` Appendix A:

| Fact | v0.1 field(s) | Future direction (Appendix A) |
|---|---|---|
| **Who** acted | `actor`, `actor.did` | promoted top-level `agent_did` + authorization chain |
| **What** was done | `payload.kind` (string verb) | structured `action_intent` (verb, resource, constraints) |
| **When** it happened | `ts`, `payload.recorded_at` | per-state lifecycle `timestamps` |
| **Where** (jurisdictionally) | — | `jurisdiction` with handoff chain |
| **Why it was allowed** | implicit in `topic` and `payload.kind` | explicit `rule_citation`, `defeated_rules` |
| **What it produces** | `evidence_ref` URI | `evidence_hashes` array |
| **How it links back** | `trace_id` correlation | `predecessor_hash` causal-chain anchor |
| **By whose signature** | opaque `payload.proof` | top-level `signature` + `countersignatures` |

At v0.1, the wire envelope is plain JSON shaped for operator triage; the cryptographic `proof` block sits inside `payload`. A future version (per `SPEC.md` Appendix A) would re-shape this into a W3C Verifiable Credential (VC 2.0) carrying a `DataIntegrityProof` at the top level. The wire format used by the reference implementation today is documented in [`SPEC.md`](./SPEC.md) §3. Issuance is the job of a rule engine; the reference open-source engine is [`sm-locp`](https://github.com/Sharathvc23/sm-locp).

AAE is intentionally domain-neutral. It applies anywhere an agent acts under rules and a verifiable audit record matters — enterprise workflows under internal policy, regulated data handling under GDPR / HIPAA / PCI-DSS, customer-facing automation under SLA commitments, cross-organization coordination, and any other setting where *"what did the agent do, under whose authority"* is a question worth answering.

## 3. Why Rendering Is a Separate Primitive

The natural reaction to "agents produce signed evidence envelopes" is to assume the producer can also render. A rule engine emits VCs; surely it can also display them. The argument against that conflation:

- **Producer and consumer environments diverge.** Rule engines run where agents run — backend Python, edge runtimes, embedded environments. Operators consume from browsers, dashboards, mobile devices. Coupling render code to producer code forces one to follow the other into environments neither wants to be in.
- **Multiple consumers per producer.** A single `sm-locp` deployment issues AAEs that may be consumed by a compliance dashboard, a SOC analyst's triage view, a customer support investigator's read-only timeline, and a regulator's audit export — each a different surface. The producer should not ship four UIs.
- **Substrate neutrality breaks if rendering is bundled.** An AAE consumer might receive events over AG-UI streams, MCP tool outputs, A2A message envelopes, websockets, or JSONL replay. A bundled renderer would inherit assumptions from the substrate it shipped with. A standalone renderer accepts events as a prop and stays out of transport.
- **Rendering ages independently of the wire format.** The AAE wire format is anchored to W3C VC 2.0 plus a small set of cryptosuites; it changes on a slow, spec-driven cadence. Operator UI evolves much faster — accessibility, design tokens, virtualization, dark mode, internationalization. Separating them lets each move at its natural cadence.

So: rendering is a primitive because it has its own substrate constraints, its own consumer surface, and its own lifecycle.

## 4. Design Axioms

`sm-attest-viewer` is built on three axioms. The axioms are not preferences; they are load-bearing for the primitive to compose with the rest of the portfolio.

### 4.1 Substrate-neutral

The renderer accepts AAE events as a `props` array. It does not open connections, poll endpoints, or make network calls. This single rule is what lets the package work with any AAE source — AG-UI, MCP, A2A, websockets, JSONL replay, in-memory fixtures.

Consequence: every consumer wires their own substrate. That is the right tradeoff. Substrate code belongs in the consumer because the consumer knows the latency, retry, authentication, and back-pressure characteristics of their transport. The renderer has no business making those decisions on the consumer's behalf.

### 4.2 Domain-neutral

The renderer ships no hardcoded taxonomy for classifications, regulatory regimes, jurisdictions, or action verbs. The AAE `classification` field is a free-form string defined by the consumer's information-handling policy. The renderer ships default tones for common labels (`public`, `internal`, `restricted`, `confidential`) and renders any other value with neutral styling. Filter chips are derived dynamically from the events in the stream — no taxonomy ships in the package.

Consequence: the renderer is usable by a refund-arbitration agent under SLA constraints and a maritime-routing agent under flag-state regulations, without forking.

### 4.3 Conformance-driven

The behaviours that matter — how trust state is derived, how filters compose, how lifecycle maps to visual primitives — are exported as **pure, exhaustively tested functions**. Components compose those functions; they never inline filter logic in JSX. Backends and alternate renderers prove conformance by passing the same tests as the reference implementation.

Consequence: the spec is the authority. When the renderer disagrees with [`SPEC.md`](./SPEC.md), the spec wins and the renderer changes.

### 4.4 Display-safe

The renderer's job is to display attested events without modifying, interpreting, or escalating their content. Every user-supplied field reaches the DOM through React's default text-escaping path — no `dangerouslySetInnerHTML`, no string interpolation into HTML, no eval-or-Function patterns. Object lookups on untrusted keys are hardened with explicit `Object.hasOwn` guards, so a hostile classification or status string cannot resolve to a prototype method. Defensive parsing on every external field — timestamps validated against `Number.isNaN`, image digests type-guarded as strings, missing payload subfields tolerated — renders gracefully rather than crashing.

The test suite proves these defenses today and fails loudly if a future contributor regresses them: XSS payloads injected into actor names and DIDs must not execute, prototype-pollution attempts on classification labels must not resolve, malformed timestamps must render `??:??:??` rather than throw, unknown trust states must fall back to `pending` rather than read `Object.prototype`.

Consequence: a substrate emitting a hostile payload cannot use the renderer as a vehicle to attack the operator. The renderer is the **display step** in any human-in-the-loop verification stack, and that step must be safe before any approval action downstream can mean anything.

## 5. Trust State Semantics

A core rendering decision is how to summarize each envelope at a glance. AAE defines a five-state lifecycle (`proposed → signed → committed → anchored → reconciled`) plus a reconciliation outcome (`converged | superseded | conflicting`). The renderer collapses that state onto a **four-state trust gem**.

> **Load-bearing caveat.** The trust gem at v0.1 reflects what the substrate marked, not what the renderer independently verified. The renderer does **not** check `proof.proofValue` against the resolved `verificationMethod` cryptographically. A "verified" gem at v0.1 means *"the substrate stamped this envelope as anchored, signed, or committed"* — not *"the renderer re-validated the signature."* Consumers that need independent cryptographic verification should run a W3C VC verify library on events before passing them to this renderer. Renderer-side verification is a v1.x property (see [`SPEC.md`](./SPEC.md) §3.6 and §12).

With that boundary in mind, the lifecycle-to-trust-state mapping is:

| Envelope state | Trust state |
|---|---|
| `signed` / `committed` / `anchored` | **verified** |
| `reconciled` + `converged` | **verified** |
| `reconciled` + `superseded` | **warning** |
| `reconciled` + `conflicting` | **failed** |
| `proposed` | **pending** |
| no lifecycle marker, proof present (legacy substrates) | verified (fallthrough) |

The mapping is illustrative — [`SPEC.md`](./SPEC.md) §11.2 carries the reference table used by the renderer. The legacy fallthrough exists because substrates predating the lifecycle field still emit envelopes the renderer must handle; future working-draft revisions will deprecate it.

The four-state collapse is deliberate. Operators triaging a high-volume stream do not need six gradations; they need to know *"this row is good," "this row needs my attention soon," "this row is broken," "this row is not yet committed."* Four states map cleanly to four colours, four ARIA labels, four keyboard-shortcut filters.

## 6. Where This Fits

The portfolio organizes around three substrate tiers plus the new operator-surface tier:

```
  +-----------------------------------------------------------+
  |                    OPERATOR SURFACES                      |
  |                       (TS / React)                        |
  |                                                           |
  |                  sm-attest-viewer                         |
  |        renders AAE event streams as forensic              |
  |        filterable timelines for compliance ops            |
  +--------------------------- ↑ -----------------------------+
                               |  W3C VC streams (AAE wire envelope)
                               |
  +-----------------------------------------------------------+
  |                      BEHAVIORAL TRUST                     |
  |                                                           |
  |    sm-locp     →     sm-airlock    →     sm-enclave       |
  |  (compliance)     (capabilities)      (speculative exec)  |
  |  *emits AAEs*                                             |
  +-----------------------------------------------------------+
                              |
  +-----------------------------------------------------------+
  |                         MODEL TRUST                       |
  |   sm-model-provenance · sm-model-card ·                   |
  |   sm-model-integrity-layer · sm-model-governance          |
  +-----------------------------------------------------------+
                              |
  +-----------------------------------------------------------+
  |                         FEDERATION                        |
  |                                                           |
  |   sm-bridge  —  registry endpoints, Quilt delta sync      |
  +-----------------------------------------------------------+
```

Substrate tiers are Python-first because they run where agents run. The operator-surface tier is TypeScript / React because it runs where humans look — browsers, dashboards, embedded panels. The language shift is a feature, not an inconsistency: each tier lives in the ecosystem appropriate to its consumer.

## 7. Composition With Sister Primitives

A common deployment combines several primitives. The handoffs are well-defined:

| Producer | Output | Consumer |
|---|---|---|
| `sm-locp` | W3C VC (AAE wire envelope) | `sm-attest-viewer` for display, archival store for retention |
| `sm-enclave` | speculative branches with staged effects | `sm-locp` upon commit, to mint the post-commit AAE |
| `sm-airlock` *(private)* | capability decisions | `sm-locp` as input facts to the rule evaluation |
| `sm-bridge` | registry events (AgentFacts deltas) | optional renderer surface in v0.2+ |

The renderer is paired with `sm-locp` in the simplest deployment — `sm-locp` mints, `sm-attest-viewer` displays. More complete deployments interpose `sm-enclave` to stage side effects pre-commit and `sm-airlock` to gate plugin capability access; both feed `sm-locp`, which is the producer of AAEs the renderer ultimately consumes.

## 8. NANDA Alignment

[Project NANDA](https://projectnanda.org) defines four pillars the open Internet of Agents must solve: **DNS** (discovery), **CA** (decentralized identity), **Orchestration** (dynamic routing), and **Attestation** (verifiable evidence). AAE implements the **Attestation pillar** at the per-action level.

The mapping to other NANDA primitives:

- **AgentFacts** (NANDA Pillars 1/2): static, signed JSON-LD describing what an agent *is* — capabilities, identity, endpoints, TTL-bounded discovery. AAE complements this with what the agent *did*.
- **KYA 1.0** (NANDA credential-attestation): attests *the credential* and *who vouches for it*. AAE attests *the action taken under that credential*. The two compose — a KYA-attested credential authorizes an agent to act; each action emits an AAE that references the KYA-attested identity.
- **ART** (Agents, Resources, Tools taxonomy): the v0.1 envelope encodes the resource being acted upon by convention — via `payload.kind` and the substrate `topic`. If the richer envelope in `SPEC.md` Appendix A is adopted, its `action_intent.resource` field would correspond to the **R** in ART, and renderers could resolve it against the ART registry to surface resource metadata.

Together, AgentFacts + KYA + AAE form a complete evidence substrate: who an agent is, who vouches for that identity, and what the agent has done with it.

The renderer is where Pillar 4's value cashes out for the human operator. Signed attestation evidence is only actionable if there is a display surface trustworthy enough for an operator to make a decision on what they see. A renderer that allows hostile content to escape its rendered scope reduces attested evidence to a paper trail an operator cannot trust to read. The display-safety properties enumerated in §4.4 are therefore not incidental polish — they are what makes this package load-bearing for the Attestation pillar of any NANDA-shaped deployment that puts a human in the approval path.

## 9. Future Work

Items deferred from v0.1 to v1.x, in rough priority order:

1. **Cryptographic verification of `proof.proofValue`.** Today the renderer trusts the substrate's verification marker; v1.x will optionally re-verify against a resolved `verificationMethod` and surface verification failures distinctly from substrate-derived states.
2. **List virtualization.** The current `ScrollArea` is fine for hundreds of events. Past ~5k rows it will need a virtualized list. Tracked for v0.3.
3. **Hybrid signing surfaces.** When AAEs begin carrying both classical and post-quantum proofs as a forward-compatibility measure, the gem must indicate hybrid status without overwhelming the four-state collapse. UX work pending.
4. **Multi-renderer ecosystem.** Operator surfaces beyond the Inbox — a chain view, a rule-engine view, a pre-flight simulator — will need their own renderer libraries. The pure-function approach in `filter-logic.ts` is the conformance anchor for all of them.
5. **Spec convergence to v1.0.** The AAE spec is v0.1 (working draft). v1.0 is gated on the open questions in [`SPEC.md`](./SPEC.md) §12, principally lifecycle-vs-authorization-status relationship and a named hybrid-signing milestone.

## 10. Related Packages

| Package | Role |
|---|---|
| [`sm-locp`](https://github.com/Sharathvc23/sm-locp) | Open Compliance Protocol — defeasible-logic engine + W3C VC issuance layer. **Produces AAEs.** |
| [`sm-enclave`](https://github.com/Sharathvc23/sm-enclave) | Speculative execution sandbox; stages side effects before AAE commit, discards losers. |
| [`sm-bridge`](https://github.com/Sharathvc23/sm-bridge) | NANDA-compatible registry endpoints + Quilt-style delta synchronization. |
| [`sm-model-provenance`](https://github.com/Sharathvc23/sm-model-provenance) | Zero-dependency model identity dataclass. |
| [`sm-model-card`](https://github.com/Sharathvc23/sm-model-card) | Unified model card schema with 4-state lifecycle. |
| [`sm-model-integrity-layer`](https://github.com/Sharathvc23/sm-model-integrity-layer) | Offline SHA-256 weight hashing + HMAC attestation. |
| [`sm-model-governance`](https://github.com/Sharathvc23/sm-model-governance) | Three-plane ML governance with Ed25519 + M-of-N quorum. |

---

*First published: 2026-05-17 | Last modified: 2026-05-17*

*Personal research contributions aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
