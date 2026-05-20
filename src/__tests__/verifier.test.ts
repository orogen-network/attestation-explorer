import { describe, expect, it } from "vitest";
import {
  backendFor,
  mockBackend,
  mockVerifierAllowed,
  mockCrl,
  verifyReceipt,
  wasmBackend,
  type Receipt,
} from "../verifier";

const base: Receipt = {
  version: 1,
  job_id: "0xjob",
  operator_id: "5xyz",
  operator_pubkey_hex: "0x" + "11".repeat(32),
  model_id: "m1",
  model_weight_hash: "0x00",
  attestation_report_hash: "0xactive",
  timestamp_ms: 1,
  signature_hex: "0x" + "ab".repeat(64),
  payload_hex: "0xff",
};

describe("verifier", () => {
  it("accepts a valid receipt with an active attestation", async () => {
    const r = await verifyReceipt(base, mockCrl, mockBackend({ acceptAll: true }));
    expect(r.ok).toBe(true);
    expect(r.steps.every((s) => s.pass)).toBe(true);
  });

  it("rejects when the signature backend reports invalid", async () => {
    const r = await verifyReceipt(base, mockCrl, mockBackend({ acceptAll: false }));
    expect(r.ok).toBe(false);
    const sigStep = r.steps.find((s) => s.label === "Operator signature");
    expect(sigStep?.pass).toBe(false);
  });

  it("flags revoked attestations", async () => {
    const revoked = { ...base, attestation_report_hash: "0xrevoked-attestation" };
    const r = await verifyReceipt(revoked, mockCrl, mockBackend({ acceptAll: true }));
    expect(r.ok).toBe(false);
    expect(r.steps.find((s) => s.label.startsWith("Attestation"))?.pass).toBe(false);
  });

  it("flags banned operator keys", async () => {
    const banned = { ...base, operator_pubkey_hex: "0xbanned-operator-key" };
    const r = await verifyReceipt(banned, mockCrl, mockBackend({ acceptAll: true }));
    expect(r.ok).toBe(false);
    expect(r.steps.find((s) => s.label.startsWith("Operator key"))?.pass).toBe(false);
  });

  it("does not allow the accept-all backend in production mode", () => {
    expect(mockVerifierAllowed({ MODE: "production", DEV: false })).toBe(false);
    expect(() => backendFor("mock", false)).toThrow(/disabled/);
  });
});

describe("wasm backend (real sr25519)", () => {
  // Public key derived from BIP-39 phrase
  //   "abandon abandon abandon abandon abandon abandon abandon abandon
  //    abandon abandon abandon about"
  // via `wallet-sdk-core::Sr25519Keypair::from_mnemonic`. The signature was
  // produced by `examples/gen_fixture.rs`; schnorrkel signatures are
  // randomized, but verification is deterministic, so any single valid
  // (pubkey, payload, sig) triple is a sufficient acceptance test.
  const GOOD = {
    pubkey: "0x7ac50da58c1a25b131e9c5e76060213fdf05dc799579674937759f884438b414",
    payload: "0xdeadbeefcafef00d",
    signature:
      "0x8a084a054af544684532cb6460c0c9fb39cba5309d82d36a3945ad48ae2fbb30bc1a0be7191a2b06df89ad5a036a3e7ddfe5145cda8aeb86362dd144822a4d8d",
  };

  it("accepts a known-good (pubkey, payload, signature) triple", async () => {
    const backend = wasmBackend();
    const ok = await backend.verify(GOOD.pubkey, GOOD.payload, GOOD.signature);
    expect(ok).toBe(true);
  });

  it("rejects a tampered payload against a real signature", async () => {
    const backend = wasmBackend();
    const ok = await backend.verify(GOOD.pubkey, "0x00", GOOD.signature);
    expect(ok).toBe(false);
  });

  it("rejects malformed hex (returns false rather than throwing)", async () => {
    const backend = wasmBackend();
    const ok = await backend.verify("not-hex", GOOD.payload, GOOD.signature);
    expect(ok).toBe(false);
  });
});
