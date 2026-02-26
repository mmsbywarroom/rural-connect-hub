import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Camera, Plus, CheckCircle, XCircle, LogOut, Edit2, ChevronDown, Check, Phone, MapPin, Users, Clock, Building2 } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import type { Village, Issue, Department, Visitor } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type TimeFilter = "today" | "7days" | "30days";

interface OfficePageProps {
  manager: { id: string; name: string; userId: string };
  onLogout: () => void;
}

const quickEntrySchema = z.object({
  name: z.string().min(1, "Required"),
  mobileNumber: z.string().min(10, "Required"),
  villageId: z.string().min(1, "Required"),
  issueId: z.string().min(1, "Required"),
  photo: z.string().optional(),
});

type QuickEntryData = z.infer<typeof quickEntrySchema>;

export default function OfficePage({ manager, onLogout }: OfficePageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [editDept, setEditDept] = useState("");
  const [editSolved, setEditSolved] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [villageOpen, setVillageOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<QuickEntryData>({
    resolver: zodResolver(quickEntrySchema),
    defaultValues: { name: "", mobileNumber: "", villageId: "", issueId: "", photo: "" },
  });

  const { data: villages } = useQuery<Village[]>({ queryKey: ["/api/villages"] });
  const { data: issues } = useQuery<Issue[]>({ queryKey: ["/api/issues"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: visitors, isLoading: visitorsLoading } = useQuery<Visitor[]>({ queryKey: ["/api/visitors"] });
  const { data: visitorHistory } = useQuery<Visitor[]>({
    queryKey: [`/api/visitors/by-mobile/${mobileSearch}`],
    enabled: mobileSearch.length >= 10,
  });

  useEffect(() => {
    if (visitorHistory && visitorHistory.length > 0) {
      const last = visitorHistory[0];
      if (last.name) form.setValue("name", last.name);
      if (last.villageId) form.setValue("villageId", last.villageId);
      if (last.photo) {
        form.setValue("photo", last.photo);
        setPhotoPreview(last.photo);
      }
    }
  }, [visitorHistory, form]);

  const handleMobileChange = (value: string) => {
    form.setValue("mobileNumber", value);
    if (value.length >= 10) setMobileSearch(value);
    else setMobileSearch("");
  };

  const createVisitor = useMutation({
    mutationFn: async (data: QuickEntryData) => apiRequest("POST", "/api/visitors", data),
    onSuccess: () => {
      toast({ title: t('visitorAdded') });
      form.reset();
      setPhotoPreview(null);
      setMobileSearch("");
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
    },
    onError: () => toast({ title: t('failed'), variant: "destructive" }),
  });

  const updateVisitor = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Visitor> }) => 
      apiRequest("PATCH", `/api/visitors/${id}`, data),
    onSuccess: () => {
      toast({ title: t('updated') });
      setEditingVisitor(null);
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
    },
    onError: () => toast({ title: t('failed'), variant: "destructive" }),
  });

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        setPhotoPreview(base64);
        form.setValue("photo", base64);
      } catch {}
    }
  };

  const onSubmit = (data: QuickEntryData) => createVisitor.mutate(data);

  const openEdit = (visitor: Visitor) => {
    setEditingVisitor(visitor);
    setEditDept(visitor.departmentId || "");
    setEditSolved(visitor.isSolved || false);
    setEditReason(visitor.notSolvedReason || "");
  };

  const saveEdit = () => {
    if (!editingVisitor) return;
    updateVisitor.mutate({
      id: editingVisitor.id,
      data: { departmentId: editDept || null, isSolved: editSolved, notSolvedReason: editSolved ? null : editReason },
    });
  };

  const getVillageName = (id: string | null) => villages?.find(v => v.id === id)?.name || "-";
  const getIssueName = (id: string | null) => issues?.find(i => i.id === id)?.name || "-";
  const getDeptName = (id: string | null) => departments?.find(d => d.id === id)?.name || "-";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days7Ago = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const days30Ago = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filteredVisitors = useMemo(() => {
    if (!visitors) return [];
    return visitors.filter(v => {
      if (!v.createdAt) return false;
      const visitDate = new Date(v.createdAt);
      if (timeFilter === "today") return visitDate >= todayStart;
      if (timeFilter === "7days") return visitDate >= days7Ago;
      return visitDate >= days30Ago;
    });
  }, [visitors, timeFilter, todayStart, days7Ago, days30Ago]);

  const stats = useMemo(() => {
    const total = filteredVisitors.length;
    const solved = filteredVisitors.filter(v => v.isSolved).length;
    const pending = total - solved;
    return { total, solved, pending };
  }, [filteredVisitors]);

  const getVisitCount = (mobileNumber: string | null) => {
    if (!mobileNumber || !visitors) return 0;
    return visitors.filter(v => v.mobileNumber === mobileNumber).length;
  };

  const selectedVillage = villages?.find(v => v.id === form.watch("villageId"));
  const activeVillages = villages?.filter(v => v.isActive) || [];
  
  const timeFilterLabels: Record<TimeFilter, string> = { today: t('today'), "7days": t('days7'), "30days": t('days30') };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0f172a] text-white">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-amber-400" />
            <h1 className="text-amber-400 font-semibold text-base" data-testid="text-office-header">{t('grievanceEntry')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-xs">{manager.name}</span>
            <LogOut className="h-4 w-4 text-white/70 cursor-pointer hover:text-white" onClick={onLogout} data-testid="button-logout" />
          </div>
        </div>
        {/* Stats Dashboard */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <div className="text-xl font-bold text-white">{stats.total}</div>
            <div className="text-[10px] text-white/70 flex items-center justify-center gap-1"><Users className="h-3 w-3" />{t('total')}</div>
          </div>
          <div className="bg-green-500/20 rounded-lg px-3 py-2 text-center">
            <div className="text-xl font-bold text-green-400">{stats.solved}</div>
            <div className="text-[10px] text-green-300/70 flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3" />{t('solved')}</div>
          </div>
          <div className="bg-orange-500/20 rounded-lg px-3 py-2 text-center">
            <div className="text-xl font-bold text-orange-400">{stats.pending}</div>
            <div className="text-[10px] text-orange-300/70 flex items-center justify-center gap-1"><Clock className="h-3 w-3" />{t('pending')}</div>
          </div>
        </div>
      </header>

      {/* Quick Entry Form */}
      <div className="bg-white border-b shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-3">
            {/* Photo + Mobile Row */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-14 h-14 border-2 border-slate-200">
                  {photoPreview ? <AvatarImage src={photoPreview} /> : <AvatarFallback className="bg-slate-100"><Camera className="h-5 w-5 text-slate-400" /></AvatarFallback>}
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#0f172a] text-amber-400 rounded-full p-1.5 shadow" data-testid="button-capture-photo">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder={t('mobileNumber')} 
                        {...field} 
                        onChange={(e) => handleMobileChange(e.target.value)}
                        className="pl-10 h-11 text-sm bg-slate-50 border-slate-200" 
                        data-testid="input-mobile" 
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>

            {/* Name Field */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder={t('visitorName')} {...field} className="h-11 text-sm bg-slate-50 border-slate-200" data-testid="input-name" />
                </FormControl>
              </FormItem>
            )} />

            {/* Village + Issue + Add Row */}
            <div className="flex gap-2">
              <FormField control={form.control} name="villageId" render={({ field }) => (
                <FormItem className="flex-1">
                  <Popover open={villageOpen} onOpenChange={setVillageOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between h-11 text-sm bg-slate-50 border-slate-200 font-normal", !field.value && "text-slate-500")} data-testid="select-village">
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{selectedVillage?.name || t('village')}</span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('searchVillage')} className="h-10" />
                        <CommandList>
                          <CommandEmpty>{t('noVillageFound')}</CommandEmpty>
                          <CommandGroup>
                            {activeVillages.map(v => (
                              <CommandItem key={v.id} value={v.name} onSelect={() => { field.onChange(v.id); setVillageOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value === v.id ? "opacity-100" : "opacity-0")} />
                                {v.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )} />

              <FormField control={form.control} name="issueId" render={({ field }) => (
                <FormItem className="flex-1">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-sm bg-slate-50 border-slate-200" data-testid="select-issue">
                        <SelectValue placeholder={t('issue')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issues?.filter(i => i.isActive).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <Button type="submit" disabled={createVisitor.isPending} className="h-11 px-6 bg-[#0f172a] hover:bg-[#1e293b]" data-testid="button-submit">
                <Plus className="h-4 w-4 mr-1" />{t('add')}
              </Button>
            </div>

            {/* Previous visits details */}
            {visitorHistory && visitorHistory.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                <div className="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-2 flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  {t('returningVisitor')} • {visitorHistory.length} {t('previousVisits')}
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-amber-100">
                  {visitorHistory.map((visit, idx) => (
                    <div key={visit.id} className="px-3 py-2 text-xs flex items-center gap-3 bg-white">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-medium">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700 truncate">{getIssueName(visit.issueId)}</span>
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", visit.isSolved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                            {visit.isSolved ? t('solved') : t('pending')}
                          </Badge>
                        </div>
                        <div className="text-slate-500 truncate">
                          {getVillageName(visit.villageId)} • {visit.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          {visit.departmentId && ` • ${getDeptName(visit.departmentId)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>

      {/* Visitors List */}
      <div className="flex-1 overflow-auto">
        {/* Time Filter Tabs */}
        <div className="px-4 py-2 bg-slate-100 border-b flex items-center gap-2">
          {(["today", "7days", "30days"] as TimeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                timeFilter === f ? "bg-[#0f172a] text-white" : "bg-white text-slate-600 hover:bg-slate-200"
              )}
              data-testid={`filter-${f}`}
            >
              {timeFilterLabels[f]}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">{filteredVisitors.length} {t('visitors')}</span>
        </div>
        
        {visitorsLoading ? (
          <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : filteredVisitors.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('noVisitors')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredVisitors.map((v, idx) => {
              const visitCount = getVisitCount(v.mobileNumber);
              return (
                <div key={v.id} className="bg-white px-4 py-3 flex items-center gap-3" data-testid={`visitor-card-${v.id}`}>
                  <div className="relative">
                    <Avatar className="w-10 h-10 flex-shrink-0 border">
                      {v.photo ? <AvatarImage src={v.photo} /> : <AvatarFallback className="bg-slate-100 text-slate-500 text-sm">{v.name?.charAt(0)}</AvatarFallback>}
                    </Avatar>
                    <div className="absolute -top-1 -left-1 bg-[#0f172a] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-800 truncate">{v.name}</span>
                      {visitCount > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600">
                          {visitCount} {t('visits')}
                        </Badge>
                      )}
                      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", v.isSolved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                        {v.isSolved ? t('solved') : t('pending')}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {v.mobileNumber} • {getVillageName(v.villageId)} • {getIssueName(v.issueId)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600" onClick={() => openEdit(v)} data-testid={`button-edit-${v.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingVisitor} onOpenChange={() => setEditingVisitor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{`${t('update')}: ${editingVisitor?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('department')}</label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger className="h-11" data-testid="edit-select-department"><SelectValue placeholder={t('selectDepartment')} /></SelectTrigger>
                <SelectContent>
                  {departments?.filter(d => d.isActive).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('status')}</label>
              <div className="flex gap-2">
                <Button type="button" variant={editSolved ? "default" : "outline"} onClick={() => setEditSolved(true)} className={cn("flex-1 h-11", editSolved && "bg-green-600 hover:bg-green-700")} data-testid="button-mark-solved">
                  <CheckCircle className="h-4 w-4 mr-2" />{t('solved')}
                </Button>
                <Button type="button" variant={!editSolved ? "default" : "outline"} onClick={() => setEditSolved(false)} className={cn("flex-1 h-11", !editSolved && "bg-orange-500 hover:bg-orange-600")} data-testid="button-mark-pending">
                  <XCircle className="h-4 w-4 mr-2" />{t('pending')}
                </Button>
              </div>
            </div>
            {!editSolved && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('reason')}</label>
                <Textarea placeholder={t('whyPending')} value={editReason} onChange={e => setEditReason(e.target.value)} data-testid="edit-textarea-reason" />
              </div>
            )}
            <Button className="w-full h-11 bg-[#0f172a] hover:bg-[#1e293b]" onClick={saveEdit} disabled={updateVisitor.isPending} data-testid="button-save-edit">
              {updateVisitor.isPending ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
