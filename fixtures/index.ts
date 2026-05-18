/**
 * Golden VC fixtures — one event per cryptosuite enumerated in
 * AAE spec §4.4.
 *
 * Each fixture is a complete `AttestationEvent` envelope with a
 * cryptosuite-specific proof. They serve double duty: import them in
 * your tests, or use them as wire-format references when implementing
 * an AAE producer.
 *
 * Fixture signatures use placeholder bytes — they do NOT verify against
 * real keys. Treat them as shape examples, not as proof artifacts.
 */

import ed25519Signature2020 from "./ed25519-signature-2020.json" with { type: "json" };
import ecdsaSecp256r1Signature2019 from "./ecdsa-secp256r1-2019.json" with { type: "json" };
import dataIntegrityEddsaRdfc2022 from "./data-integrity-eddsa-rdfc-2022.json" with { type: "json" };
import dataIntegrityMlDsa2025 from "./data-integrity-ml-dsa-2025.json" with { type: "json" };

import type { AttestationEvent } from "../src/types";

export const goldenFixtures = {
  /** VC 1.1 default — RFC 8032 Ed25519. */
  ed25519Signature2020: ed25519Signature2020 as unknown as AttestationEvent,
  /** VC 1.1 / NIST P-256 (AWS KMS path). */
  ecdsaSecp256r1Signature2019: ecdsaSecp256r1Signature2019 as unknown as AttestationEvent,
  /** VC 2.0 DataIntegrityProof + classical EdDSA via the eddsa-rdfc-2022 suite. */
  dataIntegrityEddsaRdfc2022: dataIntegrityEddsaRdfc2022 as unknown as AttestationEvent,
  /** VC 2.0 DataIntegrityProof + post-quantum ML-DSA. */
  dataIntegrityMlDsa2025: dataIntegrityMlDsa2025 as unknown as AttestationEvent,
} as const;

export type GoldenFixtureKey = keyof typeof goldenFixtures;
