import { useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import {
  backendFor,
  mockVerifierAllowed,
  mockCrl,
  verifyReceipt,
  type Receipt,
  type VerificationMode,
  type VerificationResult,
} from "./verifier";

const sampleReceipt: Receipt = {
  version: 1,
  job_id: "0xjob-abc",
  operator_id: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  operator_pubkey_hex: "0x" + "11".repeat(32),
  model_id: "llama-3.1-70b",
  model_weight_hash: "0xfeed",
  attestation_report_hash: "0xactive-attestation",
  timestamp_ms: 1_747_440_000_000,
  signature_hex: "0x" + "ab".repeat(64),
  payload_hex: "0xdeadbeef",
};

const INPUT_CLASSES =
  "w-full rounded-md border border-crust-700 bg-crust-900 px-3 py-2 text-sm text-crust-100 placeholder:text-crust-500 focus:border-magma-500 focus:outline-none focus:ring-2 focus:ring-magma-500/60";

const PRIMARY_BTN =
  "inline-flex items-center justify-center rounded-md bg-magma-500 px-4 py-2 text-sm font-medium text-crust-950 transition-colors hover:bg-magma-400 focus:outline-none focus:ring-2 focus:ring-magma-500/60 focus:ring-offset-2 focus:ring-offset-crust-900 disabled:cursor-not-allowed disabled:opacity-60";

export function App(): JSX.Element {
  const [input, setInput] = useState<string>(JSON.stringify(sampleReceipt, null, 2));
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<VerificationMode>("real");
  const canUseMock = mockVerifierAllowed();

  // Re-build the backend whenever the mode toggles (keeps tests deterministic
  // and avoids stale closure capture in production).
  const backend = useMemo(() => backendFor(mode, canUseMock), [mode, canUseMock]);

  const onVerify = async (): Promise<void> => {
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(input) as Receipt;
      const r = await verifyReceipt(parsed, mockCrl, backend);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <AppShell subtitle="Attestation explorer">
      <header className="mb-6">
        <p className="heading-eyebrow">Verification</p>
        <h1 className="mt-2 text-2xl font-semibold text-crust-100 sm:text-3xl">
          Attestation explorer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-crust-300">
          Paste a signed receipt to inspect its attestation chain. Each step is
          checked independently — operator key, signature, attestation report,
          and revocation status.
        </p>
      </header>
      <div className="divider-igneous mb-6" />

      <fieldset
        aria-label="verification mode"
        className="mb-5 inline-flex flex-wrap items-center gap-4 rounded-md border border-crust-700 bg-crust-900/60 px-4 py-2 text-sm"
      >
        <legend className="px-1 text-xs uppercase tracking-[0.18em] text-crust-400">
          Verification mode
        </legend>
        <label className="inline-flex items-center gap-2 text-crust-200">
          <input
            type="radio"
            name="mode"
            value="real"
            checked={mode === "real"}
            onChange={() => setMode("real")}
            className="h-4 w-4 cursor-pointer border-crust-700 bg-crust-900 text-magma-500 accent-magma-500 focus:outline-none focus:ring-2 focus:ring-magma-500/60"
          />
          Real (wasm)
        </label>
        {canUseMock ? (
          <label className="inline-flex items-center gap-2 text-magma-300">
            <input
              type="radio"
              name="mode"
              value="mock"
              checked={mode === "mock"}
              onChange={() => setMode("mock")}
              className="h-4 w-4 cursor-pointer border-crust-700 bg-crust-900 text-magma-500 accent-magma-500 focus:outline-none focus:ring-2 focus:ring-magma-500/60"
            />
            Mock (dev/test only)
          </label>
        ) : null}
      </fieldset>

      <label className="block">
        <span className="heading-eyebrow">Receipt JSON</span>
        <textarea
          aria-label="receipt input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={16}
          spellCheck={false}
          className={`${INPUT_CLASSES} mt-2 resize-y font-mono text-xs leading-relaxed`}
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={onVerify} className={PRIMARY_BTN}>
          Verify
        </button>
        <span className="text-xs text-crust-400">
          Operator signature checked against the sr25519 wasm backend by default.
        </span>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-sm text-red-400"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <section aria-label="verification result" className="mt-6 rounded-md border border-crust-700 bg-crust-900/60 p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`inline-flex h-3 w-3 rounded-full ${
                result.ok ? "bg-crystal-500 shadow-[0_0_12px] shadow-crystal-500/60" : "bg-red-500"
              }`}
            />
            <h2 className={`text-lg font-semibold ${result.ok ? "text-crystal-500" : "text-red-400"}`}>
              {result.ok ? "OK — all checks pass" : "FAIL — see details"}
            </h2>
          </div>
          <ul className="mt-4 space-y-2 font-mono text-sm tabular-nums">
            {result.steps.map((s) => (
              <li
                key={s.label}
                className={`flex items-start gap-2 ${s.pass ? "text-crystal-500" : "text-red-400"}`}
              >
                <span aria-hidden="true" className="select-none">
                  {s.pass ? "[ok]" : "[x] "}
                </span>
                <span className="text-crust-100">
                  {s.label}
                  {s.detail ? <span className="text-crust-400"> — {s.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
