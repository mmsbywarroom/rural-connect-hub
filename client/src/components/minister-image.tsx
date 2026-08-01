import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface LoginPageConfig {
  imageUrl: string | null;
  ministerName: string;
  ministerTitle: string;
  slogan: string;
}

const DEFAULT_CONFIG: LoginPageConfig = {
  imageUrl: null,
  ministerName: "Dr. Balbir Singh",
  ministerTitle: "Health Minister, Punjab Government",
  slogan: "Sewa, Sunwai, Samman, Sangathan, Suraksha, Sangharsh",
};

const LOCAL_MINISTER_IMAGE = "/minister.jpg";

export function MinisterImageWithFallback({
  compact = false,
  showOverlay = false,
}: {
  compact?: boolean;
  fullImage?: boolean;
  /** Name overlay on photo — off by default so full body stays visible */
  showOverlay?: boolean;
}) {
  const [loadState, setLoadState] = useState<"primary" | "local" | "fallback-text">("primary");

  const { data: config } = useQuery<LoginPageConfig>({
    queryKey: ["/api/login-page-config"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const c = config || DEFAULT_CONFIG;
  const configuredUrl = c.imageUrl?.trim() || "";
  const preferLocal =
    !configuredUrl ||
    configuredUrl.includes("drive.google.com") ||
    configuredUrl.includes("thumbnail");

  const handleError = () => {
    if (loadState === "primary" && !preferLocal && configuredUrl) setLoadState("local");
    else setLoadState("fallback-text");
  };

  // Keyboard-safe heights: full body via object-contain, never crop.
  const frameClass = compact
    ? "max-h-[min(34dvh,240px)] min-h-[140px]"
    : "max-h-[min(42dvh,300px)] min-h-[180px]";

  if (loadState === "fallback-text") {
    return (
      <div
        className={`w-full ${frameClass} relative overflow-hidden bg-gradient-to-br from-[#0b3d91] via-[#1565c0] to-[#0d47a1] flex items-center justify-center`}
      >
        <div className="text-center p-4 text-white">
          <p className={`font-semibold tracking-tight ${compact ? "text-lg" : "text-2xl"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.ministerName}
          </p>
          <p className={`text-white/80 mt-1 ${compact ? "text-[11px]" : "text-sm"}`}>{c.ministerTitle}</p>
        </div>
      </div>
    );
  }

  const imgSrc =
    loadState === "local"
      ? LOCAL_MINISTER_IMAGE
      : preferLocal
        ? LOCAL_MINISTER_IMAGE
        : configuredUrl;

  return (
    <div className={`w-full ${frameClass} relative overflow-hidden bg-gradient-to-b from-[#0a2f6e] via-[#1256b0] to-[#0d47a1] flex items-end justify-center`}>
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 35%, rgba(255,255,255,0.2) 0%, transparent 65%)",
        }}
      />
      <img
        key={loadState + imgSrc}
        src={imgSrc}
        alt={`${c.ministerName} - ${c.ministerTitle}`}
        className="relative z-[1] h-full w-auto max-w-full object-contain object-bottom select-none"
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
      />
      {showOverlay && (
        <div className="absolute inset-x-0 bottom-0 z-[2] px-3 pb-2 pt-8 text-center text-white bg-gradient-to-t from-[#0a2f6e]/90 to-transparent">
          <p className="font-semibold tracking-tight text-sm drop-shadow-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.ministerName}
          </p>
          <p className="text-white/85 text-[10px]">{c.ministerTitle}</p>
        </div>
      )}
    </div>
  );
}

export function MinisterTextBlock({ compact = false }: { compact?: boolean }) {
  const { data: config } = useQuery<LoginPageConfig>({
    queryKey: ["/api/login-page-config"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const c = config || DEFAULT_CONFIG;
  return (
    <div className={`text-center bg-white border-t border-slate-100 ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}>
      <p
        className={`font-semibold text-slate-800 ${compact ? "text-sm" : "text-base"}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {c.ministerName}
      </p>
      <p className={`text-slate-500 ${compact ? "text-[10px]" : "text-xs"}`}>{c.ministerTitle}</p>
      <p
        className={`text-slate-400 font-medium leading-snug ${compact ? "text-[9px] mt-1" : "text-[10px] mt-1.5"}`}
        style={{ letterSpacing: "0.02em" }}
      >
        {c.slogan}
      </p>
    </div>
  );
}
