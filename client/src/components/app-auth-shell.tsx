import {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useState,
} from "react";

const NAVY_GRADIENT =
  "radial-gradient(ellipse 120% 80% at 50% -10%, #1565c0 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 100%, #0b3d91 0%, transparent 50%), linear-gradient(165deg, #0a274f 0%, #061a3a 45%, #082448 100%)";

const PLUS_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2393c5fd' fill-opacity='1'%3E%3Cpath d='M13 6h2v6h6v2h-6v6h-2v-6H7v-2h6z'/%3E%3C/g%3E%3C/svg%3E\")";

const AuthShellContext = createContext({ keyboardOpen: false });

/** True when mobile keyboard (or similar chrome) has shrunk the visible viewport. */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let baseline = Math.max(window.innerHeight, window.visualViewport?.height ?? 0);
    let focusedEditable = false;

    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const update = () => {
      const vv = window.visualViewport?.height ?? window.innerHeight;
      const ih = window.innerHeight;
      const current = Math.min(vv, ih);
      const shrunk = current < baseline - 120;
      const touchLikely = window.matchMedia("(pointer: coarse)").matches;
      const nextOpen = shrunk || (focusedEditable && touchLikely);
      setOpen(nextOpen);
      if (!shrunk && !focusedEditable && current > baseline) baseline = current;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isEditable(e.target)) {
        focusedEditable = true;
        update();
      }
    };
    const onFocusOut = () => {
      requestAnimationFrame(() => {
        focusedEditable = isEditable(document.activeElement);
        update();
      });
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return open;
}

/**
 * Auth shell: navy + plus pattern.
 * Keyboard closed → centered stack, tall portrait toward browser top.
 * Keyboard open → top-aligned compact cards (both stay visible).
 */
export function AppAuthShell({ children }: { children: ReactNode }) {
  const keyboardOpen = useKeyboardOpen();

  return (
    <AuthShellContext.Provider value={{ keyboardOpen }}>
      <div
        className="app-auth-shell relative isolate h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#061a3a]"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: NAVY_GRADIENT }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          aria-hidden
          style={{
            backgroundImage: PLUS_PATTERN,
            backgroundSize: "28px 28px",
          }}
        />

        <div
          className={`relative z-10 mx-auto flex h-full w-full max-w-sm flex-col items-center gap-2.5 overflow-y-auto overscroll-y-contain px-3 ${
            keyboardOpen
              ? "justify-start pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.25rem,env(safe-area-inset-top))]"
              : "justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.25rem,env(safe-area-inset-top))]"
          }`}
        >
          {children}
        </div>
      </div>
    </AuthShellContext.Provider>
  );
}

export function AppAuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`w-full shrink-0 rounded-2xl bg-white shadow-xl shadow-black/25 ring-1 ring-white/20 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Portrait card:
 * - Keyboard closed: tall (stretches toward browser chrome) while stack stays centered
 * - Keyboard open: compact so image + form both remain visible
 */
export function AppPortraitCard({ children }: { children: ReactNode }) {
  const { keyboardOpen } = useContext(AuthShellContext);

  return (
    <div
      className={
        keyboardOpen
          ? "w-full flex flex-col h-[min(26dvh,190px)] min-h-[110px] max-h-[200px] shrink rounded-2xl overflow-hidden bg-white shadow-xl shadow-black/25 ring-1 ring-white/25"
          : "w-full flex flex-col h-[min(58dvh,520px)] min-h-[320px] max-h-[560px] shrink-0 rounded-2xl overflow-hidden bg-white shadow-xl shadow-black/25 ring-1 ring-white/25"
      }
    >
      {children}
    </div>
  );
}

export function AppPortraitMedia({ children }: { children: ReactNode }) {
  return <div className="relative min-h-0 flex-1 w-full">{children}</div>;
}
