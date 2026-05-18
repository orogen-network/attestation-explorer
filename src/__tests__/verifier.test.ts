import { describe, expect, it } from "vitest";
import {
  mockBackend,
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
      "0xbeefc1b06b80f9ae7cb69273b661579f33d20a0cb5733d09b832a4022ed9cc59a3f94c76fe9094775e983f256504a16fbdb31bff3e99faa506075ed8a743808c",
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
