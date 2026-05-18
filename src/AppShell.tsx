import type { ReactNode } from "react";

interface AppShellProps {
  /** Subtitle shown next to the wordmark — e.g. "Attestation explorer". */
  subtitle: string;
  /** Page content; wrapped in a `surface-card-strong` panel. */
  children: ReactNode;
}

/**
 * Shared chrome for every Orogen dashboard: sticky brand header, the inline
 * crystalline-mountain mark, the wordmark, a per-app subtitle, links back to
 * orogen.network + docs, the page body in a surface-card-strong wrapper, and
 * a minimal contributors footer.
 *
 * Brand tokens are defined in `tailwind.config.mjs` and `src/styles/global.css`
 * — both are kept verbatim with the landing-site for cross-surface coherence.
 */
export function AppShell({ subtitle, children }: AppShellProps): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-crust-800/80 bg-crust-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <a
            href="https://orogen.network"
            className="flex items-center gap-3 text-crust-100 no-underline hover:text-crust-100"
            rel="noopener noreferrer"
          >
            <svg
              viewBox="0 0 64 64"
              className="h-8 w-8 shrink-0"
              role="img"
              aria-label="Orogen mark"
            >
              <path
                d="M6 50 L22 22 L30 34 L40 14 L58 50 Z"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinejoin="miter"
              />
              <line x1="6" y1="50" x2="58" y2="50" stroke="#f59e0b" strokeWidth="3" />
              <path
                d="M22 22 L30 34 L40 14"
                fill="none"
                stroke="#34d399"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
            </svg>
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight text-crust-100">Orogen</span>
              <span
                aria-hidden="true"
                className="hidden h-4 w-px bg-crust-700 sm:inline-block"
              />
              <span className="hidden text-sm text-crust-400 sm:inline-block">{subtitle}</span>
            </span>
          </a>

          <div className="flex items-center gap-5 text-sm">
            <a
              href="https://docs.orogen.network"
              className="hidden text-crust-300 no-underline hover:text-crust-100 sm:inline-block"
              rel="noopener noreferrer"
            >
              docs
            </a>
            <a
              href="https://orogen.network"
              className="text-magma-400 no-underline hover:text-magma-300"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">&larr;&nbsp;</span>orogen.network
            </a>
          </div>
        </div>
        {/* Mobile subtitle row — the desktop layout hides this. */}
        <div className="border-t border-crust-800/60 bg-crust-950/85 px-6 py-2 text-xs uppercase tracking-[0.18em] text-magma-400 sm:hidden">
          {subtitle}
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="surface-card-strong">{children}</div>
        </div>
      </main>

      <footer className="border-t border-crust-800/80 bg-crust-950/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-1 px-6 py-6 text-xs text-crust-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {year} Orogen contributors &middot;{" "}
            <a
              href="mailto:hello@orogen.network"
              className="text-crust-300 no-underline hover:text-crust-100"
            >
              hello@orogen.network
            </a>{" "}
            &middot; Apache-2.0
          </span>
          <span className="text-crust-500">
            <a
              href="https://orogen.network"
              className="text-crust-400 no-underline hover:text-crust-200"
              rel="noopener noreferrer"
            >
              orogen.network
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
