import { type ReactNode } from "react";

/** Shared shell for volunteer auth / welcome — light professional background (reference layout). */
export function AppAuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="app-auth-shell h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-y-contain"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Soft off-white field like the preferred screen */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 0%, #e8f1fc 0%, transparent 55%), linear-gradient(180deg, #f5f7fb 0%, #eef2f7 45%, #e8edf4 100%)",
        }}
      />
      <div className="mx-auto flex w-full max-w-sm min-h-[100dvh] flex-col justify-center gap-4 px-4 py-5 sm:py-6">
        {children}
      </div>
    </div>
  );
}

export function AppAuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function AppPortraitCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 shrink-0">
      {children}
    </div>
  );
}
