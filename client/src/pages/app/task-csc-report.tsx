import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Check, Home, Plus, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { UnitSelector, UnitSwitcherBar, UnitSubmissionHistory } from "@/components/unit-selector";
import type { AppUser, Csc, Village } from "@shared/schema";

interface CscReportProps {
  user: AppUser;
}

type Step = "select_unit" | "select_csc" | "mark_status" | "not_working_reason" | "success";
type NotWorkingReason = "closed" | "equipment" | "server" | "technical" | "other";

const NOT_WORKING_REASONS_VALUES: { value: NotWorkingReason; labelKey: string }[] = [
  { value: "closed", labelKey: "closed" },
  { value: "equipment", labelKey: "equipmentIssue" },
  { value: "server", labelKey: "serverIssue" },
  { value: "technical", labelKey: "technicalIssue" },
  { value: "other", labelKey: "other" },
];

export default function TaskCscReport({ user }: CscReportProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("select_unit");
  const [selectedVillageId, setSelectedVillageId] = useState(user.mappedAreaId || "");
  const [selectedCscId, setSelectedCscId] = useState("");
  const [status, setStatus] = useState<"working" | "not_working" | null>(null);
  const [notWorkingReason, setNotWorkingReason] = useState<NotWorkingReason | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [showAddCsc, setShowAddCsc] = useState(false);
  const [newCscName, setNewCscName] = useState("");

  const { data: allVillages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: cscs, isLoading: cscsLoading, refetch: refetchCscs } = useQuery<Csc[]>({
    queryKey: ["/api/cscs/village", selectedVillageId],
    queryFn: async () => {
      if (!selectedVillageId) return [];
      const res = await fetch(`/api/cscs/village/${selectedVillageId}`);
      return res.json();
    },
    enabled: !!selectedVillageId,
  });

  const addCscMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cscs", {
        name: newCscName.trim(),
        villageId: selectedVillageId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedCscId(data.id);
      setNewCscName("");
      setShowAddCsc(false);
      refetchCscs();
      toast({ title: t('success'), description: `${data.name} has been added` });
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedSubmitTask'), variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const selectedVillage = allVillages?.find(v => v.id === selectedVillageId);
      const res = await apiRequest("POST", "/api/csc-reports", {
        cscId: selectedCscId,
        appUserId: user.id,
        status,
        notWorkingReason: status === "not_working" ? notWorkingReason : null,
        otherReason: status === "not_working" && notWorkingReason === "other" ? otherReason.trim() : null,
        villageId: selectedVillageId,
        selectedVillageId,
        selectedVillageName: selectedVillage?.name || "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/csc-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/my-submissions", user.id] });
      setStep("success");
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedSubmitTask'), variant: "destructive" });
    },
  });

  const selectedVillage = allVillages?.find(v => v.id === selectedVillageId);
  const selectedCsc = cscs?.find(c => c.id === selectedCscId);

  const handleSubmit = () => {
    if (!selectedCscId || !status) return;
    if (status === "not_working" && !notWorkingReason) return;
    if (status === "not_working" && notWorkingReason === "other" && !otherReason.trim()) return;
    submitMutation.mutate();
  };

  const handleReset = () => {
    setStep("select_unit");
    setSelectedCscId("");
    setStatus(null);
    setNotWorkingReason(null);
    setOtherReason("");
    setShowAddCsc(false);
    setNewCscName("");
  };

  const getReasonLabel = (value: NotWorkingReason): string => {
    const item = NOT_WORKING_REASONS_VALUES.find(r => r.value === value);
    return item ? t(item.labelKey as any) : value;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-purple-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/"><ArrowLeft className="h-5 w-5 cursor-pointer" data-testid="button-back" /></Link>
        <div>
          <h1 className="font-semibold">{t('cscCampReport')}</h1>
          {selectedVillage && <p className="text-xs text-white/70">{selectedVillage.name}</p>}
        </div>
      </header>

      {selectedVillageId && step !== "select_unit" && step !== "success" && (
        <UnitSwitcherBar
          villageName={selectedVillage?.name || ""}
          onSwitch={() => {
            setStep("select_unit");
            setSelectedVillageId("");
            setSelectedCscId("");
            setStatus(null);
            setNotWorkingReason(null);
            setOtherReason("");
            setShowAddCsc(false);
            setNewCscName("");
          }}
        />
      )}

      <div className="flex-1 p-4 space-y-4">
        {step === "select_unit" && (
          <Card>
            <CardContent className="p-4">
              <UnitSelector
                onSelect={(unit) => {
                  setSelectedVillageId(unit.villageId);
                  setSelectedCscId("");
                  setStep("select_csc");
                }}
                title={t('selectUnit')}
                subtitle={t('chooseVillageForCsc')}
                defaultVillageId={user.mappedAreaId || undefined}
              />
              <UnitSubmissionHistory
                userId={user.id}
                villageId={selectedVillageId || "none"}
                taskType="csc-report"
              />
            </CardContent>
          </Card>
        )}

        {step === "select_csc" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-medium text-slate-800">{t('selectCscCamp')}</h2>

              {cscsLoading ? (
                <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
              ) : (
                <>
                  {cscs && cscs.length > 0 ? (
                    <Select value={selectedCscId} onValueChange={setSelectedCscId}>
                      <SelectTrigger className="h-12" data-testid="select-csc">
                        <SelectValue placeholder={t('selectCscCamp')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cscs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-sm">
                      {t('noCscFound')}
                    </div>
                  )}

                  {!showAddCsc ? (
                    <button
                      onClick={() => setShowAddCsc(true)}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                      data-testid="button-add-csc-toggle"
                    >
                      <Plus className="h-4 w-4" /> {t('addNewCsc')}
                    </button>
                  ) : (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                      <label className="text-sm font-medium text-slate-700">{t('newCscName')}</label>
                      <Input
                        placeholder={t('enterName')}
                        value={newCscName}
                        onChange={(e) => setNewCscName(e.target.value)}
                        className="h-11"
                        data-testid="input-new-csc-name"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setShowAddCsc(false); setNewCscName(""); }}>
                          {t('cancel')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addCscMutation.mutate()}
                          disabled={!newCscName.trim() || addCscMutation.isPending}
                          data-testid="button-save-csc"
                        >
                          {addCscMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
                        </Button>
                      </div>
                    </div>
                  )}

                  <UnitSubmissionHistory
                    userId={user.id}
                    villageId={selectedVillageId}
                    taskType="csc-report"
                  />

                  <Button
                    className="w-full"
                    onClick={() => setStep("mark_status")}
                    disabled={!selectedCscId}
                    data-testid="button-next-status"
                  >
                    {t('next')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "mark_status" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-medium text-slate-800">{t('markStatus')}: {selectedCsc?.name}</h2>
              <p className="text-xs text-slate-500">{t('unit')}: {selectedVillage?.name}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setStatus("working"); setNotWorkingReason(null); setOtherReason(""); }}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-colors ${status === "working" ? "border-green-500 bg-green-50" : "border-slate-200"}`}
                  data-testid="button-status-working"
                >
                  <CheckCircle className={`h-10 w-10 ${status === "working" ? "text-green-600" : "text-slate-400"}`} />
                  <span className="font-medium">{t('working')}</span>
                </button>
                <button
                  onClick={() => { setStatus("not_working"); }}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-colors ${status === "not_working" ? "border-red-500 bg-red-50" : "border-slate-200"}`}
                  data-testid="button-status-not-working"
                >
                  <XCircle className={`h-10 w-10 ${status === "not_working" ? "text-red-600" : "text-slate-400"}`} />
                  <span className="font-medium">{t('notWorking')}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setStep("select_csc"); setStatus(null); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
                </Button>
                {status === "working" && (
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('submitReport')} <Check className="ml-2 h-4 w-4" /></>}
                  </Button>
                )}
                {status === "not_working" && (
                  <Button
                    className="flex-1"
                    onClick={() => setStep("not_working_reason")}
                    data-testid="button-next-reason"
                  >
                    {t('next')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === "not_working_reason" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-medium text-slate-800">{t('selectReason')}</h2>
              <p className="text-xs text-slate-500">{selectedCsc?.name} &middot; {selectedVillage?.name}</p>
              <div className="space-y-2">
                {NOT_WORKING_REASONS_VALUES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => { setNotWorkingReason(r.value); if (r.value !== "other") setOtherReason(""); }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${notWorkingReason === r.value ? "border-red-500 bg-red-50" : "border-slate-200"}`}
                    data-testid={`button-reason-${r.value}`}
                  >
                    <span className="font-medium text-sm">{t(r.labelKey as any)}</span>
                  </button>
                ))}
              </div>
              {notWorkingReason === "other" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Please specify</label>
                  <Input
                    placeholder="Describe the issue..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="h-11"
                    data-testid="input-other-reason"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("mark_status")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={
                    submitMutation.isPending ||
                    !notWorkingReason ||
                    (notWorkingReason === "other" && !otherReason.trim())
                  }
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('submitReport')} <Check className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="font-semibold text-lg text-slate-800">{t('reportSubmitted')}</h2>
              <p className="text-sm text-slate-600">
                CSC/Camp: <span className="font-medium">{selectedCsc?.name}</span><br />
                {t('unit')}: <span className="font-medium">{selectedVillage?.name}</span><br />
                {t('status')}: <span className={`font-medium ${status === "working" ? "text-green-600" : "text-red-600"}`}>
                  {status === "working" ? t('working') : t('notWorking')}
                </span>
                {status === "not_working" && notWorkingReason && (
                  <><br />{t('reason')}: <span className="font-medium text-red-600">
                    {getReasonLabel(notWorkingReason)}
                    {notWorkingReason === "other" && otherReason ? ` - ${otherReason}` : ""}
                  </span></>
                )}
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleReset} data-testid="button-another">
                  {t('submitAnother')}
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full" data-testid="button-home">
                    <Home className="mr-2 h-4 w-4" /> {t('goToHome')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
