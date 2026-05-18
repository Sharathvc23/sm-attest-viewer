# sm-attest-viewer

**The audited display surface for substrate-attested agent action streams.**

When an autonomous agent proposes a high-stakes action — a financial transaction, a clinical recommendation, an infrastructure command — a human supervisor often needs to verify before it commits. The display surface where that supervisor reads the evidence is itself a security boundary: hostile content carried inside otherwise-trusted events (injected markup, prototype-pollution payloads, malformed identifiers) can break out of the rendered scope and undermine the verification.

`sm-attest-viewer` is the React / TypeScript renderer for the **Attested Action Envelope (AAE)** — the per-action evidence primitive aligned with [Project NANDA](https://projectnanda.org)'s Attestation pillar. It displays signed agent action streams as forensic, filterable, reverse-chronological timelines, audited so what reaches the operator's eyes is exactly what the substrate emitted — without transformation, without escape, with no opportunity for hostile content to execute.

It is **one layer of a human-in-the-loop verification stack** — the trustworthy *display step*. Operator authentication, hardware-attested endpoints, signed approve/deny actions, and audit logging are responsibilities of the surrounding stack, not this package.

The first TypeScript package in an otherwise Python-first portfolio of [Stellarminds.ai](https://stellarminds.ai) primitives aligned with Project NANDA standards.

## What this package secures (v0.1)

- **No content escape.** Every user-supplied field in the envelope reaches the DOM through React's default text-escaping path — no `dangerouslySetInnerHTML`, no string interpolation into HTML.
- **Hardened object lookups.** Internal maps are accessed via `Object.hasOwn` guards so a hostile classification or status string cannot resolve to a prototype method.
- **Defensive parsing.** Malformed timestamps, missing payload fields, non-string runtime values render gracefully rather than crash.
- **Adversarially tested.** XSS payloads, prototype-pollution attempts, malformed inputs, and unknown trust states are explicitly covered in the 62-test suite.

## What this package does not (yet) do

- **Independent cryptographic verification of the proof block.** Trust state at v0.1 is derived from substrate-stamped lifecycle markers (`anchored`, `signed`, etc.); the renderer trusts the substrate's attestation rather than re-checking the signature itself. Renderer-side verification is a v1.x property — see [`SPEC.md`](./SPEC.md) §3.6 and §12.
- **Operator authentication, approval actions, audit logging, endpoint attestation.** These belong to the surrounding HITL stack. Adopters wire their own.

## Features

- **Substrate-neutral** — accepts AAE events as a `props` array; connect to AG-UI, MCP, A2A, websockets, or JSONL replay.
- **Domain-neutral** — no hardcoded taxonomy for classifications, regimes, or action verbs.
- **Tested behavior** — pure derivation and filter functions exported and exhaustively unit-tested against the trust-state and rendering rules documented in [`SPEC.md`](./SPEC.md) §11.
- **Four golden VC fixtures** covering every cryptosuite the AAE spec enumerates: `Ed25519Signature2020`, `EcdsaSecp256r1Signature2019`, `DataIntegrityProof + eddsa-rdfc-2022`, and `DataIntegrityProof + ml-dsa-2025` (FIPS 204 post-quantum).
- **Accessible 4-state trust gem** mapping AAE lifecycle to verified / warning / failed / pending visual primitives.

## Installation

### From source (current)

The package is not yet published to npm. To use the v0.1 working draft today, install directly from the repository:

```bash
git clone https://github.com/Sharathvc23/sm-attest-viewer.git
cd sm-attest-viewer
pnpm install
pnpm test
```

### From npm (planned)

Once v0.1 stabilizes, the package will be published as `@sharathvc/sm-attest-viewer`:

```bash
npm install @sharathvc/sm-attest-viewer
# or
pnpm add @sharathvc/sm-attest-viewer
```

Peer dependencies: `react >= 19.0.0`, `react-dom >= 19.0.0`.

## Quick Start

```tsx
import { InboxPresentation, type AttestationEvent } from "@sharathvc/sm-attest-viewer";

export function MyInbox() {
  const [events, setEvents] = useState<AttestationEvent[]>([]);
  return <InboxPresentation events={events} status="open" />;
}
```

Wire `events` to wherever your AAEs come from — an AG-UI stream, an MCP tool output, a JSONL file, a websocket, or directly from `sm-locp`'s `VCGenerator` output.

## Golden Fixtures

```tsx
import { goldenFixtures } from "@sharathvc/sm-attest-viewer/fixtures";

goldenFixtures.ed25519Signature2020;        // VC 1.1
goldenFixtures.ecdsaSecp256r1Signature2019; // VC 1.1, NIST P-256
goldenFixtures.dataIntegrityEddsaRdfc2022;  // VC 2.0
goldenFixtures.dataIntegrityMlDsa2025;      // VC 2.0, post-quantum ML-DSA
```

Fixture signatures use placeholder bytes — they do not verify against real keys. Treat them as shape examples.

## Consumer Responsibilities

The renderer uses Tailwind CSS utility classes and a small set of CSS custom properties for trust-state and classification tones. Consumers must:

1. Have Tailwind CSS configured (any v3 or v4 release).
2. Define `--gem-verified`, `--gem-warning`, `--gem-failed`, `--gem-pending` CSS variables in their root scope. See [`fixtures/css-tokens.example.css`](./fixtures/css-tokens.example.css) for an accessible default.
3. Wire `<TooltipProvider>` once at the app root for hover tooltips.

## Specification

The wire format used by the reference implementation is documented in [`SPEC.md`](./SPEC.md) as a working draft. The design rationale and the role of AAE rendering as a separable primitive live in [`WHITEPAPER.md`](./WHITEPAPER.md).

## Related Packages

| Package | Role |
|---|---|
| [`sm-locp`](https://github.com/Sharathvc23/sm-locp) | Open Compliance Protocol — defeasible-logic engine + W3C VC issuance. **Produces AAEs.** |
| [`sm-enclave`](https://github.com/Sharathvc23/sm-enclave) | Speculative execution sandbox; stages side effects before AAE commit. |
| [`sm-bridge`](https://github.com/Sharathvc23/sm-bridge) | NANDA-compatible registry endpoints + Quilt-style delta sync. |
| [`sm-model-provenance`](https://github.com/Sharathvc23/sm-model-provenance) | Zero-dependency model identity dataclass. |
| [`sm-model-card`](https://github.com/Sharathvc23/sm-model-card) | Unified model card schema. |
| [`sm-model-integrity-layer`](https://github.com/Sharathvc23/sm-model-integrity-layer) | Offline integrity verification. |
| [`sm-model-governance`](https://github.com/Sharathvc23/sm-model-governance) | Three-plane ML governance. |

## License

[MIT](./LICENSE)

---

*First published: 2026-05-17 | Last modified: 2026-05-17*

*Personal research contributions aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
