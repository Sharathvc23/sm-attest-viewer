# Contributing to `sm-attest-viewer`

Thanks for your interest. This document covers the basics — code style, how to propose changes, and what makes a good PR for this repository specifically.

## Scope

`sm-attest-viewer` is the reference React renderer for the Attested Action Envelope (AAE), the per-action evidence primitive aligned with the Attestation pillar of Project NANDA's four-pillar architecture. PRs that don't fit one of the categories below are still welcome, but the response will start with a scope-check conversation:

- **Working-draft alignment** — the renderer's behavior tracks the wire format and rendering rules documented in [`SPEC.md`](./SPEC.md) §11. Changes that bring the renderer into closer alignment with that documented behavior are welcome.
- **Bug fixes** — anything that fixes incorrect behavior, accessibility gaps, or type-safety holes.
- **New cryptosuite fixtures** — when a new VC 2.0 `DataIntegrityProof` cryptosuite ships against `SPEC.md` §4.4, a golden fixture is a high-leverage contribution.
- **Working-draft revisions** (changes to `SPEC.md`) — these go through a heavier review. See *Working-draft revisions* below.

Out of scope: building a substrate, wiring AG-UI / MCP / A2A specifically (consumer concern), and adding a runtime dependency on any particular agent framework.

## Development setup

```bash
git clone https://github.com/Sharathvc23/sm-attest-viewer.git
cd sm-attest-viewer
pnpm install   # or npm install
pnpm typecheck
pnpm test
```

Node 22+, pnpm 9+ recommended. The package targets ES2022.

## Tests

The pure functions in `src/filter-logic.ts` are the highest-coverage targets. If you change derivation logic (`deriveTrustState`, `eventPassesFilter`, etc.), the PR must include tests demonstrating the new behavior. Tests live under `tests/`.

```bash
pnpm test            # one shot
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage report
```

## Code style

- TypeScript strict mode is required.
- Pure functions in `filter-logic.ts`; no I/O, no React state.
- Components use `"use client"` directive where they hold state or render in a client environment.
- Tailwind utility classes via `cn()`. CSS variables (`--gem-*`) for theme-bound color tokens.
- No `any`. If you reach for `any`, reach for `unknown` and a type guard instead.

## Commit messages

Use imperative mood: "fix: defensive timestamp parse in TimelineRow," not "fixed defensive timestamp parse." A `Conventional Commits` prefix (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`) is encouraged but not required.

## DCO

Sign off commits with `-s` to attest to the [Developer Certificate of Origin](https://developercertificate.org/):

```bash
git commit -sm "fix: defensive timestamp parse"
```

This package does **not** require a CLA. The DCO sign-off is sufficient.

## Working-draft revisions

Changes to `SPEC.md` go through a heavier review than code changes:

1. Open a GitHub Discussion (or issue with the `wire-format-change` label) describing the change and the rationale.
2. Wait for at least one substantive response before opening the PR.
3. The PR must update both `SPEC.md` and the relevant code/types so the documented behavior and the renderer stay aligned.
4. Changes that add required fields require bumping the `@context` URI (a new major working-draft version).

## NANDA alignment

This renderer is positioned as a NANDA Pillar 4 (Attestation) reference. Contributions that strengthen the integration with NANDA primitives — AgentFacts resolution, KYA 1.0 composition, ART registry lookup, ACAP authorization handoff — are explicitly welcome. The README and SPEC §2 are the source of truth on how AAE relates to other NANDA work.

## Reporting issues

Open an issue at https://github.com/Sharathvc23/sm-attest-viewer/issues with:

- What you expected to happen.
- What actually happened.
- A minimal reproduction (CodeSandbox link or a `tests/` test case is ideal).
- The version of `@sharathvc/sm-attest-viewer` you're using.

Security issues: please email rather than filing publicly. Contact details in the package metadata.
