import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Camera, Check, Home, Loader2, RefreshCw } from "lucide-react";
import { useTranslation, getLocalizedText } from "@/lib/i18n";
import { UnitSelector, UnitSwitcherBar, UnitSubmissionHistory, type SelectedUnit } from "@/components/unit-selector";
import { compressImage } from "@/lib/image-compress";
import type { AppUser } from "@shared/schema";

interface FieldOption {
  id: string;
  label: string;
  labelHi?: string | null;
  labelPa?: string | null;
  value: string;
  sortOrder: number | null;
}

interface FieldCondition {
  id: string;
  dependsOnFieldId: string;
  operator: string;
  value: string;
}

interface FormFieldConfig {
  id: string;
  label: string;
  labelHi?: string | null;
  labelPa?: string | null;
  fieldKey: string;
  fieldType: string;
  placeholder: string | null;
  placeholderHi?: string | null;
  placeholderPa?: string | null;
  isRequired: boolean | null;
  sortOrder: number | null;
  defaultValue: string | null;
  validationRules: string | null;
  options: FieldOption[];
  conditions: FieldCondition[];
}

interface TaskConfigFull {
  id: string;
  name: string;
  nameHi?: string | null;
  namePa?: string | null;
  description: string | null;
  descriptionHi?: string | null;
  descriptionPa?: string | null;
  icon: string | null;
  color: string | null;
  fields: FormFieldConfig[];
}

interface TaskDynamicFormProps {
  user: AppUser;
  taskId: string;
}

export default function TaskDynamicForm({ user, taskId }: TaskDynamicFormProps) {
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const [, setLocation] = useLocation();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [showUnitSelector, setShowUnitSelector] = useState(true);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: config, isLoading } = useQuery<TaskConfigFull>({
    queryKey: ["/api/task-configs", taskId, "full"],
  });

  const sortedFields = useMemo(() => {
    if (!config?.fields) return [];
    return [...config.fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [config?.fields]);

  const fieldById = useMemo(() => {
    const map: Record<string, FormFieldConfig> = {};
    if (config?.fields) {
      for (const f of config.fields) {
        map[f.id] = f;
      }
    }
    return map;
  }, [config?.fields]);

  const isFieldVisible = (field: FormFieldConfig): boolean => {
    if (!field.conditions || field.conditions.length === 0) return true;
    return field.conditions.every((cond) => {
      const depField = fieldById[cond.dependsOnFieldId];
      if (!depField) return true;
      const depValue = formValues[depField.fieldKey] ?? "";
      switch (cond.operator) {
        case "equals":
          return depValue === cond.value;
        case "not_equals":
          return depValue !== cond.value;
        case "contains":
          return depValue.includes(cond.value);
        default:
          return true;
      }
    });
  };

  const setValue = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/task-submissions", {
        taskConfigId: taskId,
        appUserId: user.id,
        data: JSON.stringify(formValues),
        selectedVillageId: selectedUnit?.villageId || null,
        selectedVillageName: selectedUnit?.villageName || null,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedSubmitTask'), variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const visibleFields = sortedFields.filter(isFieldVisible);
    const missing = visibleFields.filter(
      (f) => f.isRequired && !(formValues[f.fieldKey] ?? "").trim()
    );
    if (missing.length > 0) {
      toast({
        title: t('required'),
        description: `Please fill: ${missing.map((f) => fieldLabel(f)).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  const handleReset = () => {
    setFormValues({});
    setSubmitted(false);
    setSelectedUnit(null);
    setShowUnitSelector(true);
  };

  const handleUnitSelect = (unit: SelectedUnit) => {
    setSelectedUnit(unit);
    setShowUnitSelector(false);
  };

  const handlePhotoChange = async (fieldKey: string, inputEl: HTMLInputElement | null) => {
    const file = inputEl?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setValue(fieldKey, base64);
    } catch {}
  };

  const taskColor = config?.color ?? "#3b82f6";

  const fieldLabel = (f: FormFieldConfig) => getLocalizedText(language, f.label, f.labelHi, f.labelPa);
  const fieldPlaceholder = (f: FormFieldConfig) => getLocalizedText(language, f.placeholder, f.placeholderHi, f.placeholderPa);
  const optionLabel = (o: FieldOption) => getLocalizedText(language, o.label, o.labelHi, o.labelPa);
  const taskName = config ? getLocalizedText(language, config.name, config.nameHi, config.namePa) : "";
  const taskDesc = config ? getLocalizedText(language, config.description, config.descriptionHi, config.descriptionPa) : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-slate-600">Task not found</p>
        <Button onClick={() => setLocation("/")} data-testid="button-home">
          <Home className="mr-2 h-4 w-4" /> {t('goToHome')}
        </Button>
      </div>
    );
  }

  if (showUnitSelector) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="text-white px-4 py-3 flex items-center gap-3" style={{ backgroundColor: taskColor }}>
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">{taskName}</h1>
        </header>
        <div className="flex-1 p-4">
          <Card>
            <CardContent className="p-4">
              <UnitSelector
                onSelect={handleUnitSelect}
                title={t('selectUnit')}
                subtitle={t('chooseVillageForTask')}
                defaultVillageId={user.mappedAreaId || undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="text-white px-4 py-3 flex items-center gap-3" style={{ backgroundColor: taskColor }}>
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">{taskName}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${taskColor}20` }}>
                <Check className="h-8 w-8" style={{ color: taskColor }} />
              </div>
              <h2 className="font-semibold text-lg text-slate-800" data-testid="text-success">{t('success')}!</h2>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleReset} data-testid="button-another">
                  <RefreshCw className="mr-2 h-4 w-4" /> {t('submitAnother')}
                </Button>
                <Button className="flex-1" onClick={() => setLocation("/")} data-testid="button-home">
                  <Home className="mr-2 h-4 w-4" /> {t('goToHome')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderField = (field: FormFieldConfig) => {
    const val = formValues[field.fieldKey] ?? field.defaultValue ?? "";
    const sortedOptions = [...(field.options || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    switch (field.fieldType) {
      case "text":
        return (
          <Input
            type="text"
            placeholder={fieldPlaceholder(field) || ""}
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
            data-testid={`input-${field.fieldKey}`}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            placeholder={fieldPlaceholder(field) || ""}
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
            data-testid={`input-${field.fieldKey}`}
          />
        );
      case "phone":
        return (
          <Input
            type="tel"
            maxLength={10}
            placeholder={fieldPlaceholder(field) || "Enter 10-digit number"}
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value.replace(/\D/g, "").slice(0, 10))}
            data-testid={`input-${field.fieldKey}`}
          />
        );
      case "email":
        return (
          <Input
            type="email"
            placeholder={fieldPlaceholder(field) || ""}
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
            data-testid={`input-${field.fieldKey}`}
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={fieldPlaceholder(field) || ""}
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
            className="min-h-[100px]"
            data-testid={`input-${field.fieldKey}`}
          />
        );
      case "dropdown":
        return (
          <Select value={val} onValueChange={(v) => setValue(field.fieldKey, v)}>
            <SelectTrigger data-testid={`input-${field.fieldKey}`}>
              <SelectValue placeholder={fieldPlaceholder(field) || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {sortedOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.value}>{optionLabel(opt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multi_select": {
        const selected = val ? val.split(",").filter(Boolean) : [];
        return (
          <div className="space-y-2" data-testid={`input-${field.fieldKey}`}>
            {sortedOptions.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    setValue(field.fieldKey, next.join(","));
                  }}
                />
                <span className="text-sm">{optionLabel(opt)}</span>
              </label>
            ))}
          </div>
        );
      }
      case "date":
        return (
          <Input
            type="date"
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
            data-testid={`input-${field.fieldKey}`}
          />
        );
      case "photo": {
        const hasPhoto = !!formValues[field.fieldKey];
        return (
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={(el) => { fileRefs.current[field.fieldKey] = el; }}
              onChange={() => handlePhotoChange(field.fieldKey, fileRefs.current[field.fieldKey])}
              data-testid={`input-${field.fieldKey}`}
            />
            <button
              type="button"
              onClick={() => fileRefs.current[field.fieldKey]?.click()}
              className={`w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
                hasPhoto ? "border-green-500 bg-green-50" : "border-slate-300 bg-slate-50"
              }`}
              data-testid={`button-photo-${field.fieldKey}`}
            >
              {hasPhoto ? (
                <>
                  <Check className="h-6 w-6 text-green-600" />
                  <span className="text-sm text-green-700">Photo captured</span>
                </>
              ) : (
                <>
                  <Camera className="h-6 w-6 text-slate-400" />
                  <span className="text-sm text-slate-500">{fieldPlaceholder(field) || "Take Photo"}</span>
                </>
              )}
            </button>
          </div>
        );
      }
      case "toggle":
        return (
          <div className="flex items-center gap-3 py-1">
            <Switch
              checked={val === "true"}
              onCheckedChange={(checked) => setValue(field.fieldKey, checked ? "true" : "false")}
              data-testid={`input-${field.fieldKey}`}
            />
            <span className="text-sm text-slate-600">{val === "true" ? "Yes" : "No"}</span>
          </div>
        );
      case "radio":
        return (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-testid={`input-${field.fieldKey}`}>
            {sortedOptions.map((opt) => {
              const isSelected = val === opt.value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setValue(field.fieldKey, opt.value)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? "text-white border-transparent"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                  style={isSelected ? { backgroundColor: taskColor } : undefined}
                  data-testid={`radio-${field.fieldKey}-${opt.value}`}
                >
                  {optionLabel(opt)}
                </button>
              );
            })}
          </div>
        );
      default:
        return (
          <Input
            type="text"
            placeholder={fieldPlaceholder(field) || ""}
            value={val}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
            data-testid={`input-${field.fieldKey}`}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="text-white px-4 py-3 flex items-center gap-3" style={{ backgroundColor: taskColor }}>
        <button onClick={() => setLocation("/")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold">{taskName}</h1>
          {selectedUnit ? (
            <p className="text-xs text-white/70">{selectedUnit.villageName}</p>
          ) : taskDesc ? (
            <p className="text-xs text-white/70">{taskDesc}</p>
          ) : null}
        </div>
      </header>

      {selectedUnit && (
        <UnitSwitcherBar
          villageName={selectedUnit.villageName}
          onSwitch={() => {
            setShowUnitSelector(true);
            setSelectedUnit(null);
            setFormValues({});
          }}
        />
      )}

      {selectedUnit && (
        <div className="px-4 pt-3">
          <UnitSubmissionHistory
            userId={user.id}
            villageId={selectedUnit.villageId}
            taskType="dynamic"
            taskConfigId={taskId}
          />
        </div>
      )}

      <div className="flex-1 p-4 space-y-3 pb-24">
        {sortedFields.filter(isFieldVisible).map((field) => (
          <Card key={field.id}>
            <CardContent className="p-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                {fieldLabel(field)}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderField(field)}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          data-testid="button-submit"
          style={{ backgroundColor: taskColor }}
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t('submit')
          )}
        </Button>
      </div>
    </div>
  );
}
