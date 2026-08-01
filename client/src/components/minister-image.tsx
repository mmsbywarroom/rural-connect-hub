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

/** Bundled portrait — edge-to-edge on login (no side letterboxing). */
const LOCAL_MINISTER_IMAGE = "/minister.jpg";

export function MinisterImageWithFallback({
  compact = false,
  showOverlay = true,
}: {
  compact?: boolean;
  /** @deprecated kept for callers; image always covers full frame */
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
  // Prefer bundled portrait so login never letterboxes a remote/Drive thumbnail.
  const configuredUrl = c.imageUrl?.trim() || "";
  const preferLocal =
    !configuredUrl ||
    configuredUrl.includes("drive.google.com") ||
    configuredUrl.includes("thumbnail");

  const handleError = () => {
    if (loadState === "primary" && !preferLocal && configuredUrl) setLoadState("local");
    else setLoadState("fallback-text");
  };

  const heightClass = compact ? "h-[200px] sm:h-[220px]" : "h-[280px] sm:h-[320px]";

  if (loadState === "fallback-text") {
    return (
      <div
        className={`w-full ${heightClass} relative overflow-hidden bg-gradient-to-br from-[#0b3d91] via-[#1565c0] to-[#0d47a1] flex items-center justify-center`}
      >
        <div className="text-center p-6 text-white">
          <p className={`font-semibold tracking-tight ${compact ? "text-xl" : "text-3xl"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.ministerName}
          </p>
          <p className={`text-white/80 mt-1 ${compact ? "text-xs" : "text-sm"}`}>{c.ministerTitle}</p>
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
    <div className={`w-full ${heightClass} relative overflow-hidden bg-gradient-to-b from-[#0a2f6e] via-[#1256b0] to-[#0d47a1]`}>
      {/* Soft radial glow behind cutout */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 55% 40%, rgba(255,255,255,0.18) 0%, transparent 65%)",
        }}
      />
      <img
        key={loadState + imgSrc}
        src={imgSrc}
        alt={`${c.ministerName} - ${c.ministerTitle}`}
        className="absolute inset-0 w-full h-full object-cover object-[center_12%] select-none"
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
      />
      {/* Bottom fade into text / card */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a2f6e]/95 via-[#0a2f6e]/40 to-transparent pointer-events-none" />
      {showOverlay && (
        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 text-center text-white">
          <p
            className={`font-semibold tracking-tight drop-shadow-sm ${compact ? "text-base" : "text-lg"}`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {c.ministerName}
          </p>
          <p className={`text-white/85 ${compact ? "text-[11px]" : "text-xs"}`}>{c.ministerTitle}</p>
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
    <div className={`text-center bg-white ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
      <p
        className={`text-slate-500 font-medium leading-snug ${compact ? "text-[10px]" : "text-xs"}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.02em" }}
      >
        {c.slogan}
      </p>
    </div>
  );
}
