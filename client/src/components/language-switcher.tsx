import { useTranslation, LANGUAGE_OPTIONS, type Language } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  variant?: "default" | "ghost" | "outline";
  className?: string;
  showLabel?: boolean;
  iconClassName?: string;
}

export function LanguageSwitcher({ variant = "ghost", className = "", showLabel = false, iconClassName = "" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation();
  const currentLang = LANGUAGE_OPTIONS.find(l => l.value === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={showLabel ? "default" : "icon"} className={className} data-testid="button-language-switcher">
          <Globe className={`h-4 w-4 ${iconClassName}`} />
          {showLabel && <span className="ml-1.5 text-sm">{currentLang?.nativeLabel}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="dropdown-language">
        {LANGUAGE_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setLanguage(opt.value)}
            className={language === opt.value ? "font-semibold" : ""}
            data-testid={`lang-option-${opt.value}`}
          >
            <span className="mr-2">{opt.nativeLabel}</span>
            {language === opt.value && <span className="text-xs text-muted-foreground ml-auto">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcherInline({
  className = "",
  tone = "light",
}: {
  className?: string;
  /** light = on white card; dark = on navy background */
  tone?: "light" | "dark";
}) {
  const { language, setLanguage } = useTranslation();

  const active =
    tone === "dark"
      ? "text-white font-semibold bg-white/20"
      : "text-[#0d47a1] font-semibold bg-[#e8f0fe]";
  const idle =
    tone === "dark"
      ? "text-white/80 hover:text-white hover:bg-white/10"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
  const divider = tone === "dark" ? "text-white/35" : "text-slate-300";

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`} data-testid="language-switcher-inline">
      {LANGUAGE_OPTIONS.map((opt, i) => (
        <span key={opt.value} className="flex items-center gap-1">
          {i > 0 && <span className={divider}>|</span>}
          <button
            onClick={() => setLanguage(opt.value)}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              language === opt.value ? active : idle
            }`}
            data-testid={`lang-inline-${opt.value}`}
          >
            {opt.nativeLabel}
          </button>
        </span>
      ))}
    </div>
  );
}
