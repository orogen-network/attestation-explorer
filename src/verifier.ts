/**
 * Receipt verification.
 *
 * In production this calls into the `wallet-sdk-core` WASM build to verify
 * the sr25519 signature; for the skeleton we ship a pluggable verifier so
 * the UI can be exercised against a mock today and against the real WASM
 * once it's wired in.
 *
 * Receipt schema mirrors RFC-0001 in JSON form. We keep this loose for now
 * because the full type lives in `mining-types` (Python first); a TS mirror
 * lands in a follow-up RFC.
 */

export interface Receipt {
  version: number;
  job_id: string;
  operator_id: string; // ss58
  operator_pubkey_hex: string;
  model_id: string;
  model_weight_hash: string;
  attestation_report_hash: string;
  timestamp_ms: number;
  signature_hex: string;
  // verification payload — what was actually signed. In the real receipt this
  // is the SCALE-encoded body minus signature; we let callers pass it raw.
  payload_hex: string;
}

export interface Crl {
  /** Set of `attestation_report_hash` values that have been revoked. */
  revoked: ReadonlySet<string>;
  /** Set of operator pubkeys marked as compromised. */
  bannedOperators: ReadonlySet<string>;
}

export interface VerificationResult {
  ok: boolean;
  steps: VerificationStep[];
}

export interface VerificationStep {
  label: string;
  pass: boolean;
  detail?: string;
}

export interface SignatureBackend {
  verify(publicKeyHex: string, payloadHex: string, signatureHex: string): Promise<boolean>;
}

export function mockBackend(behaviour: { acceptAll: boolean }): SignatureBackend {
  return {
    async verify(_pk, _payload, _sig) {
      return behaviour.acceptAll;
    },
  };
}

function decodeHex(s: string): Uint8Array {
  const clean = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
  if (clean.length % 2 !== 0) {
    throw new Error(`hex string has odd length: ${s.slice(0, 16)}...`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(clean.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`invalid hex byte at position ${i * 2}`);
    }
    out[i] = byte;
  }
  return out;
}

/**
 * Lazy-loaded real backend backed by `wallet-sdk-core` WASM. The WASM module
 * exposes `verifySr25519(public, payload, signature) -> bool`; we wrap that
 * here so the verifier flow stays asynchronous (matching the trait).
 *
 * On any decode failure (malformed hex, wrong length) we return `false`
 * instead of throwing — a malformed receipt should be a clean "FAIL" in the
 * UI, not a crashed render.
 */
export function wasmBackend(): SignatureBackend {
  let modulePromise: Promise<typeof import("wallet-sdk-core")> | null = null;
  const load = async (): Promise<typeof import("wallet-sdk-core")> => {
    if (!modulePromise) {
      modulePromise = (async () => {
        const mod = await import("wallet-sdk-core");
        // wasm-pack web target requires `init()` before native exports are
        // safe to call. In the browser the default URL resolution works; in
        // Node test runs (jsdom + vitest) `fetch` of a `file://` URL is not
        // available so we load the .wasm bytes directly from disk and use
        // `initSync`.
        const isNode =
          typeof process !== "undefined" &&
          !!(process as { versions?: { node?: string } }).versions?.node;
        if (isNode && typeof mod.initSync === "function") {
          // Resolve the wasm sibling file relative to the SDK package.
          // Dynamic import avoids bundlers eagerly resolving these specifiers
          // for the browser build.
          const { readFileSync } = await import("node:fs");
          const { fileURLToPath } = await import("node:url");
          const { dirname, join } = await import("node:path");
          const sdkUrl = (await import.meta.resolve?.("wallet-sdk-core")) ?? "";
          let wasmPath: string;
          if (sdkUrl) {
            const jsFile = fileURLToPath(sdkUrl);
            wasmPath = join(dirname(jsFile), "wallet_sdk_core_bg.wasm");
          } else {
            // Fallback: jump two levels up to find the pkg dir.
            wasmPath = join(
              dirname(fileURLToPath(import.meta.url)),
              "..",
              "..",
              "wallet-sdk-core",
              "pkg",
              "wallet_sdk_core_bg.wasm",
            );
          }
          const bytes = readFileSync(wasmPath);
          mod.initSync({ module: bytes });
        } else if (typeof mod.default === "function") {
          try {
            await mod.default();
          } catch (err) {
            if (!String(err).includes("already")) {
              throw err;
            }
          }
        }
        return mod;
      })();
    }
    return modulePromise;
  };

  return {
    async verify(publicKeyHex, payloadHex, signatureHex) {
      let pk: Uint8Array;
      let payload: Uint8Array;
      let sig: Uint8Array;
      try {
        pk = decodeHex(publicKeyHex);
        payload = decodeHex(payloadHex);
        sig = decodeHex(signatureHex);
      } catch {
        return false;
      }
      if (pk.length !== 32 || sig.length !== 64) {
        return false;
      }
      const mod = await load();
      return mod.verifySr25519(pk, payload, sig);
    },
  };
}

/**
 * Convenience: pick a backend at runtime based on a simple toggle. The UI
 * exposes this so devs can flip between mock + real without restarting Vite.
 */
export type VerificationMode = "real" | "mock";

export function backendFor(mode: VerificationMode): SignatureBackend {
  return mode === "real" ? wasmBackend() : mockBackend({ acceptAll: true });
}

export async function verifyReceipt(
  receipt: Receipt,
  crl: Crl,
  backend: SignatureBackend,
): Promise<VerificationResult> {
  const steps: VerificationStep[] = [];

  steps.push({
    label: "Receipt structure",
    pass: typeof receipt.job_id === "string" && receipt.signature_hex.length > 0,
  });

  const sigOk = await backend.verify(
    receipt.operator_pubkey_hex,
    receipt.payload_hex,
    receipt.signature_hex,
  );
  steps.push({
    label: "Operator signature",
    pass: sigOk,
    detail: sigOk ? "verified" : "signature does not match operator pubkey",
  });

  const attestationOk = !crl.revoked.has(receipt.attestation_report_hash);
  steps.push({
    label: "Attestation report (vs CRL)",
    pass: attestationOk,
    detail: attestationOk ? "active" : "revoked",
  });

  const operatorOk = !crl.bannedOperators.has(receipt.operator_pubkey_hex);
  steps.push({
    label: "Operator key (vs CRL)",
    pass: operatorOk,
    detail: operatorOk ? "active" : "banned",
  });

  return { ok: steps.every((s) => s.pass), steps };
}

export const mockCrl: Crl = {
  revoked: new Set(["0xrevoked-attestation"]),
  bannedOperators: new Set(["0xbanned-operator-key"]),
};
