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

const FALLBACK_IMAGE_URL = "https://drive.google.com/thumbnail?id=1T6EoEClNxR4IJW1YuM0bb50OBycafpud&sz=w800";

export function MinisterImageWithFallback({ compact = false, fullImage = true }: { compact?: boolean; fullImage?: boolean }) {
  const [loadState, setLoadState] = useState<"primary" | "fallback-img" | "fallback-text">("primary");

  const { data: config } = useQuery<LoginPageConfig>({
    queryKey: ["/api/login-page-config"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const c = config || DEFAULT_CONFIG;
  const imageUrl = c.imageUrl?.trim() || FALLBACK_IMAGE_URL;

  const handleError = () => {
    if (loadState === "primary") setLoadState("fallback-img");
    else setLoadState("fallback-text");
  };

  const containerClass = compact
    ? "w-full h-[160px] relative overflow-hidden bg-slate-100 flex items-center justify-center"
    : "w-full min-h-[220px] relative overflow-hidden bg-slate-100 flex items-center justify-center";

  if (loadState === "fallback-text") {
    return (
      <div className={`${containerClass} bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center`}>
        <div className="text-center p-4">
          <p className={`font-bold text-blue-800 ${compact ? "text-lg" : "text-4xl"}`}>{c.ministerName}</p>
          <p className={`text-blue-600 mt-1 ${compact ? "text-xs" : "text-sm"}`}>{c.ministerTitle}</p>
        </div>
      </div>
    );
  }

  const imgSrc = loadState === "fallback-img" ? "/minister.jpg" : imageUrl;
  const objectFit = fullImage ? "object-contain" : "object-cover";
  return (
    <div className={containerClass}>
      <img
        key={loadState + imgSrc}
        src={imgSrc}
        alt={`${c.ministerName} - ${c.ministerTitle}`}
        className={`absolute inset-0 w-full h-full ${objectFit} object-top`}
        onError={handleError}
        referrerPolicy="no-referrer"
        loading="eager"
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
    <div className={`text-center bg-white ${compact ? "p-2" : "p-3"}`}>
      <p className={`font-semibold text-slate-800 ${compact ? "text-sm" : "text-lg"}`}>{c.ministerName}</p>
      <p className={`text-slate-600 ${compact ? "text-xs" : "text-sm"}`}>{c.ministerTitle}</p>
      <p className={`text-slate-500 mt-1 font-medium ${compact ? "text-xs" : "text-xs mt-2"}`}>{c.slogan}</p>
    </div>
  );
}
