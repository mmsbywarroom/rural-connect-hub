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
  showOverlay = true,
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

  // Image-1 look: tall portrait card, white plate, face always fully visible.
  const frameClass = compact
    ? "aspect-[3/4] max-h-[min(42dvh,300px)]"
    : "aspect-[3/4] max-h-[min(48dvh,340px)]";

  if (loadState === "fallback-text") {
    return (
      <div className={`w-full ${frameClass} relative bg-gradient-to-br from-[#0b3d91] via-[#1565c0] to-[#0d47a1] flex items-center justify-center`}>
        <div className="text-center p-4 text-white">
          <p className={`font-semibold tracking-tight ${compact ? "text-lg" : "text-2xl"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.ministerName}
          </p>
          <p className={`text-white/85 mt-1 ${compact ? "text-[11px]" : "text-sm"}`}>{c.ministerTitle}</p>
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
    <div className={`w-full ${frameClass} relative overflow-hidden bg-white`}>
      {/* soft blue wash at bottom like reference */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none z-[1]"
        style={{
          background: "linear-gradient(to top, #0a2f6e 0%, #1256b0aa 35%, transparent 100%)",
        }}
      />
      <img
        key={loadState + imgSrc}
        src={`${imgSrc}?v=2`}
        alt={`${c.ministerName} - ${c.ministerTitle}`}
        className="absolute inset-0 z-0 h-full w-full object-contain object-center select-none"
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
      />
      {showOverlay && (
        <div className="absolute inset-x-0 bottom-0 z-[2] px-3 pb-3 pt-12 text-center text-white pointer-events-none">
          <p
            className={`font-semibold tracking-tight drop-shadow ${compact ? "text-sm" : "text-base"}`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {c.ministerName}
          </p>
          <p className={`text-white/95 ${compact ? "text-[10px]" : "text-xs"}`}>{c.ministerTitle}</p>
        </div>
      )}
    </div>
  );
}

/** Slogan strip under portrait (name lives on photo overlay). */
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
        className={`text-slate-600 font-medium leading-snug ${compact ? "text-[10px]" : "text-xs"}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.02em" }}
      >
        {c.slogan}
      </p>
    </div>
  );
}
