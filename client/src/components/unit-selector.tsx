import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, ArrowRight, ChevronRight, RefreshCw, Clock, FileText } from "lucide-react";
import { useTranslation, getLocalizedText } from "@/lib/i18n";
import type { Village } from "@shared/schema";

interface SelectedUnit {
  villageId: string;
  villageName: string;
}

interface UnitSelectorProps {
  onSelect: (unit: SelectedUnit) => void;
  title?: string;
  subtitle?: string;
  defaultVillageId?: string;
}

export function UnitSelector({ onSelect, title = "Select Unit", subtitle = "Choose a village/ward to work in", defaultVillageId }: UnitSelectorProps) {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const vName = (v: Village) => getLocalizedText(language, v.name, v.nameHi, v.namePa);

  const { data: villages, isLoading } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const activeVillages = useMemo(() => {
    return (villages || []).filter(v => v.isActive);
  }, [villages]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activeVillages;
    const q = search.toLowerCase();
    return activeVillages.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.nameHi && v.nameHi.toLowerCase().includes(q)) ||
      (v.namePa && v.namePa.toLowerCase().includes(q)) ||
      (v.halka && v.halka.toLowerCase().includes(q)) ||
      (v.blockNumber && v.blockNumber.toLowerCase().includes(q))
    );
  }, [activeVillages, search]);

  const grouped = useMemo(() => {
    const rural = filtered.filter(v => !/ward/i.test(v.name));
    const urban = filtered.filter(v => /ward/i.test(v.name));
    return { rural, urban };
  }, [filtered]);

  const defaultVillage = activeVillages.find(v => v.id === defaultVillageId);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="text-lg font-semibold text-slate-800" data-testid="text-unit-title">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {defaultVillage && (
        <button
          onClick={() => onSelect({ villageId: defaultVillage.id, villageName: vName(defaultVillage) })}
          className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-2"
          data-testid="button-default-village"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">{t('yourVillage')}: {vName(defaultVillage)}</p>
              {defaultVillage.halka && (
                <p className="text-xs text-blue-600">{defaultVillage.halka}</p>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
        </button>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={t('searchVillages')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
          data-testid="input-search-unit"
        />
      </div>

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {grouped.rural.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase px-1 py-1.5">{t('villages')} ({grouped.rural.length})</p>
            {grouped.rural.map(v => (
              <button
                key={v.id}
                onClick={() => onSelect({ villageId: v.id, villageName: vName(v) })}
                className="w-full text-left p-3 rounded-lg flex items-center justify-between gap-2 hover-elevate active-elevate-2"
                data-testid={`button-village-${v.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{vName(v)}</p>
                  {v.halka && <p className="text-xs text-slate-500">{v.halka}{v.blockNumber ? ` - ${t('block')} ${v.blockNumber}` : ""}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {grouped.urban.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase px-1 py-1.5">{t('wards')} ({grouped.urban.length})</p>
            {grouped.urban.map(v => (
              <button
                key={v.id}
                onClick={() => onSelect({ villageId: v.id, villageName: vName(v) })}
                className="w-full text-left p-3 rounded-lg flex items-center justify-between gap-2 hover-elevate active-elevate-2"
                data-testid={`button-ward-${v.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{vName(v)}</p>
                  {v.halka && <p className="text-xs text-slate-500">{v.halka}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            {t('noVillagesFound')} "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

interface UnitSwitcherBarProps {
  villageName: string;
  onSwitch: () => void;
  submissionCount?: number;
}

export function UnitSwitcherBar({ villageName, onSwitch, submissionCount }: UnitSwitcherBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-100 border-b">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-700 truncate" data-testid="text-current-unit">{villageName}</span>
        {submissionCount !== undefined && submissionCount > 0 && (
          <Badge variant="secondary" className="text-xs flex-shrink-0" data-testid="badge-submission-count">
            {submissionCount}
          </Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSwitch}
        data-testid="button-switch-unit"
      >
        <RefreshCw className="h-3 w-3 mr-1.5" />
        {t('switchUnit')}
      </Button>
    </div>
  );
}

interface SubmissionItem {
  id: string;
  data?: string;
  createdAt?: string | null;
  name?: string;
  status?: string;
  mobileNumber?: string;
  category?: string;
}

interface UnitSubmissionHistoryProps {
  userId: string;
  villageId: string;
  taskType: "csc-report" | "volunteer-mapping" | "supporter-mapping" | "dynamic";
  taskConfigId?: string;
}

export function UnitSubmissionHistory({ userId, villageId, taskType, taskConfigId }: UnitSubmissionHistoryProps) {
  const { t } = useTranslation();
  const endpoint = (() => {
    switch (taskType) {
      case "csc-report":
        return `/api/csc-reports/user/${userId}?villageId=${villageId}`;
      case "volunteer-mapping":
        return `/api/mapped-volunteers/user/${userId}?villageId=${villageId}`;
      case "supporter-mapping":
        return `/api/supporters/user/${userId}?villageId=${villageId}`;
      case "dynamic":
        return `/api/app/my-submissions/${userId}?villageId=${villageId}${taskConfigId ? `&taskConfigId=${taskConfigId}` : ""}`;
    }
  })();

  const { data, isLoading } = useQuery<SubmissionItem[] | { submissions: SubmissionItem[]; count: number }>({
    queryKey: [endpoint],
    enabled: !!userId && !!villageId,
  });

  const submissions = Array.isArray(data) ? data : (data as any)?.submissions || [];
  const count = submissions.length;

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div className="mt-3 space-y-2" data-testid="unit-submission-history">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">{t('yourSubmissions')} ({count})</span>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {submissions.slice(0, 5).map((s: SubmissionItem) => (
          <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs">
            <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {s.name && <span className="font-medium text-slate-700">{s.name}</span>}
              {s.status && <span className="text-slate-500"> - {s.status}</span>}
              {s.category && <span className="text-slate-500"> ({s.category})</span>}
              {s.mobileNumber && <span className="text-slate-500"> {s.mobileNumber}</span>}
              {!s.name && !s.status && s.data && (
                <span className="text-slate-600 truncate block">
                  {(() => {
                    try {
                      const parsed = JSON.parse(s.data);
                      return Object.values(parsed).filter(Boolean).slice(0, 2).join(", ");
                    } catch {
                      return t('submitted');
                    }
                  })()}
                </span>
              )}
            </div>
            {s.createdAt && (
              <span className="text-slate-400 flex-shrink-0">
                {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        ))}
        {count > 5 && (
          <div className="text-center text-xs text-slate-400 py-1">
            +{count - 5} {t('more')}
          </div>
        )}
      </div>
    </div>
  );
}

export type { SelectedUnit };
