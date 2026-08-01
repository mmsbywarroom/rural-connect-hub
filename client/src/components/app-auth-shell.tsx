import { type ReactNode } from "react";

/** Auth shell: navy + plus pattern, keyboard-safe (image + form stay visible). */
export function AppAuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="app-auth-shell h-[100dvh] max-h-[100dvh] overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#061a3a]" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -10%, #1565c0 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 100%, #0b3d91 0%, transparent 50%), linear-gradient(165deg, #0a274f 0%, #061a3a 45%, #082448 100%)",
        }}
      />
      {/* Plus pattern */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2393c5fd' fill-opacity='1'%3E%3Cpath d='M13 6h2v6h6v2h-6v6h-2v-6H7v-2h6z'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: "28px 28px",
        }}
      />
      {/*
        Keyboard-safe column:
        - 100dvh shrinks when mobile keyboard opens
        - no vertical centering (avoids pushing portrait off-screen)
        - portrait can shrink; form stays pinned in view
      */}
      <div className="mx-auto flex h-full w-full max-w-sm flex-col justify-start gap-2.5 overflow-y-auto overscroll-y-contain px-3 pb-3 pt-3 sm:pt-4">
        {children}
      </div>
    </div>
  );
}

export function AppAuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-2xl bg-white shadow-xl shadow-black/25 ring-1 ring-white/20 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function AppPortraitCard({ children }: { children: ReactNode }) {
  return (
    <div className="h-[min(34dvh,260px)] min-h-[140px] shrink-0 rounded-2xl overflow-hidden bg-white shadow-xl shadow-black/25 ring-1 ring-white/25">
      {children}
    </div>
  );
}
