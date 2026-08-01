import { type ReactNode } from "react";

/** Shared atmospheric shell for volunteer auth / welcome screens (keyboard-scroll safe). */
export function AppAuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="app-auth-shell h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-y-contain"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#061a3a]" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -10%, #1565c0 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 100%, #0b3d91 0%, transparent 50%), linear-gradient(165deg, #0a274f 0%, #061a3a 45%, #082448 100%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="mx-auto flex w-full max-w-sm min-h-[100dvh] flex-col justify-center gap-3 px-3 py-3 sm:py-4">
        {children}
      </div>
    </div>
  );
}

export function AppAuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/97 backdrop-blur-sm shadow-2xl shadow-black/30 ring-1 ring-black/5 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function AppPortraitCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/15 shrink-0">
      {children}
    </div>
  );
}
