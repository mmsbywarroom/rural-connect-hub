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
}: {
  compact?: boolean;
  fullImage?: boolean;
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

  // Tall enough for full body+face; image always fully visible (never cropped).
  const frameStyle = compact
    ? { height: "min(40dvh, 280px)", minHeight: 168 }
    : { height: "min(46dvh, 320px)", minHeight: 200 };

  if (loadState === "fallback-text") {
    return (
      <div
        className="w-full relative bg-gradient-to-br from-[#0b3d91] via-[#1565c0] to-[#0d47a1] flex items-center justify-center"
        style={frameStyle}
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
    <div
      className="w-full relative bg-gradient-to-b from-[#0a2f6e] via-[#1256b0] to-[#0d47a1] flex items-center justify-center overflow-hidden"
      style={frameStyle}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 40%, rgba(255,255,255,0.22) 0%, transparent 65%)",
        }}
      />
      <img
        key={loadState + imgSrc}
        src={imgSrc}
        alt={`${c.ministerName} - ${c.ministerTitle}`}
        className="relative z-[1] max-h-full max-w-full object-contain select-none"
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
      />
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
        className={`font-semibold text-slate-900 ${compact ? "text-sm" : "text-base"}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {c.ministerName}
      </p>
      <p className={`text-slate-600 ${compact ? "text-[10px]" : "text-xs"}`}>{c.ministerTitle}</p>
      <p
        className={`text-slate-500 font-medium leading-snug ${compact ? "text-[9px] mt-1" : "text-[10px] mt-1.5"}`}
        style={{ letterSpacing: "0.02em" }}
      >
        {c.slogan}
      </p>
    </div>
  );
}
