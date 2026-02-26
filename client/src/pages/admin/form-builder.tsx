import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import type { TaskConfig, FormField as FormFieldType, FieldOption, FieldCondition } from "@shared/schema";
import { FIELD_TYPES } from "@shared/schema";

const fieldFormSchema = z.object({
  label: z.string().min(1, "Label is required"),
  labelHi: z.string().optional().default(""),
  labelPa: z.string().optional().default(""),
  fieldKey: z.string().min(1, "Field key is required"),
  fieldType: z.string().min(1, "Field type is required"),
  placeholder: z.string().optional().default(""),
  placeholderHi: z.string().optional().default(""),
  placeholderPa: z.string().optional().default(""),
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  defaultValue: z.string().optional().default(""),
  validationRules: z.string().optional().default(""),
});

type FieldFormData = z.infer<typeof fieldFormSchema>;

function generateFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function FieldOptionsManager({ fieldId }: { fieldId: string }) {
  const { toast } = useToast();
  const [optionLabel, setOptionLabel] = useState("");
  const [optionLabelHi, setOptionLabelHi] = useState("");
  const [optionLabelPa, setOptionLabelPa] = useState("");
  const [optionValue, setOptionValue] = useState("");

  const { data: options, isLoading } = useQuery<FieldOption[]>({
    queryKey: ["/api/field-options", fieldId],
    queryFn: async () => {
      const res = await fetch(`/api/field-options/${fieldId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch options");
      return res.json();
    },
  });

  const addOption = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/field-options", {
        formFieldId: fieldId,
        label: optionLabel,
        labelHi: optionLabelHi || null,
        labelPa: optionLabelPa || null,
        value: optionValue,
      }),
    onSuccess: () => {
      toast({ title: "Option added" });
      queryClient.invalidateQueries({ queryKey: ["/api/field-options", fieldId] });
      setOptionLabel("");
      setOptionLabelHi("");
      setOptionLabelPa("");
      setOptionValue("");
    },
    onError: () => toast({ title: "Failed to add option", variant: "destructive" }),
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/field-options/${id}`),
    onSuccess: () => {
      toast({ title: "Option deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/field-options", fieldId] });
    },
    onError: () => toast({ title: "Failed to delete option", variant: "destructive" }),
  });

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <Label className="text-sm font-medium">Options</Label>
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <div className="space-y-1">
          {options?.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`option-item-${opt.id}`}>
              <span>{opt.label} ({opt.value})</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteOption.mutate(opt.id)}
                data-testid={`button-delete-option-${opt.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Label (English)</Label>
            <Input
              value={optionLabel}
              onChange={(e) => setOptionLabel(e.target.value)}
              placeholder="Option label"
              data-testid="input-option-label"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Value</Label>
            <Input
              value={optionValue}
              onChange={(e) => setOptionValue(e.target.value)}
              placeholder="Option value"
              data-testid="input-option-value"
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Label (Hindi)</Label>
            <Input
              value={optionLabelHi}
              onChange={(e) => setOptionLabelHi(e.target.value)}
              placeholder="हिंदी"
              data-testid="input-option-label-hi"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Label (Punjabi)</Label>
            <Input
              value={optionLabelPa}
              onChange={(e) => setOptionLabelPa(e.target.value)}
              placeholder="ਪੰਜਾਬੀ"
              data-testid="input-option-label-pa"
            />
          </div>
          <Button
            size="sm"
            onClick={() => addOption.mutate()}
            disabled={!optionLabel || !optionValue || addOption.isPending}
            data-testid="button-add-option"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldConditionsManager({ fieldId, allFields }: { fieldId: string; allFields: FormFieldType[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [dependsOnFieldId, setDependsOnFieldId] = useState("");
  const [operator, setOperator] = useState("equals");
  const [conditionValue, setConditionValue] = useState("");

  const { data: conditions, isLoading } = useQuery<FieldCondition[]>({
    queryKey: ["/api/field-conditions", fieldId],
    queryFn: async () => {
      const res = await fetch(`/api/field-conditions/${fieldId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conditions");
      return res.json();
    },
  });

  const addCondition = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/field-conditions", {
        formFieldId: fieldId,
        dependsOnFieldId,
        operator,
        value: conditionValue,
      }),
    onSuccess: () => {
      toast({ title: "Condition added" });
      queryClient.invalidateQueries({ queryKey: ["/api/field-conditions", fieldId] });
      setShowForm(false);
      setDependsOnFieldId("");
      setOperator("equals");
      setConditionValue("");
    },
    onError: () => toast({ title: "Failed to add condition", variant: "destructive" }),
  });

  const deleteCondition = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/field-conditions/${id}`),
    onSuccess: () => {
      toast({ title: "Condition deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/field-conditions", fieldId] });
    },
    onError: () => toast({ title: "Failed to delete condition", variant: "destructive" }),
  });

  const otherFields = allFields.filter((f) => f.id !== fieldId);

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Conditions</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          data-testid={`button-toggle-condition-form-${fieldId}`}
        >
          {showForm ? "Cancel" : "Add Condition"}
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <div className="space-y-1">
          {conditions?.map((cond) => {
            const depField = allFields.find((f) => f.id === cond.dependsOnFieldId);
            return (
              <div key={cond.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`condition-item-${cond.id}`}>
                <span>
                  When <strong>{depField?.label ?? "Unknown"}</strong> {cond.operator} <strong>{cond.value}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteCondition.mutate(cond.id)}
                  data-testid={`button-delete-condition-${cond.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-xs">Depends On Field</Label>
            <Select value={dependsOnFieldId} onValueChange={setDependsOnFieldId}>
              <SelectTrigger data-testid="select-condition-field">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {otherFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Operator</Label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger data-testid="select-condition-operator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="not_equals">not_equals</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              placeholder="Value"
              data-testid="input-condition-value"
            />
          </div>
          <Button
            size="sm"
            onClick={() => addCondition.mutate()}
            disabled={!dependsOnFieldId || !conditionValue || addCondition.isPending}
            data-testid="button-save-condition"
          >
            Save Condition
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldCard({
  field,
  allFields,
  onEdit,
  onDelete,
}: {
  field: FormFieldType;
  allFields: FormFieldType[];
  onEdit: (field: FormFieldType) => void;
  onDelete: (field: FormFieldType) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsOptions = ["dropdown", "multi_select", "radio"].includes(field.fieldType);

  return (
    <Card data-testid={`card-field-${field.id}`} className="overflow-visible">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" data-testid={`drag-handle-${field.id}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate" data-testid={`text-field-label-${field.id}`}>{field.label}</span>
              <Badge variant="secondary" data-testid={`badge-field-type-${field.id}`}>{field.fieldType}</Badge>
              {field.isRequired && <Badge variant="destructive" data-testid={`badge-field-required-${field.id}`}>Required</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-field-key-${field.id}`}>
              Key: {field.fieldKey} | Order: {field.sortOrder ?? 0}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} data-testid={`button-expand-field-${field.id}`}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(field)} data-testid={`button-edit-field-${field.id}`}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(field)} data-testid={`button-delete-field-${field.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {needsOptions && <FieldOptionsManager fieldId={field.id} />}
            <FieldConditionsManager fieldId={field.id} allFields={allFields} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FormBuilderPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldType | null>(null);

  const params = new URLSearchParams(window.location.search);
  const taskId = params.get("taskId");

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: {
      label: "",
      fieldKey: "",
      fieldType: "text",
      placeholder: "",
      isRequired: false,
      sortOrder: 0,
      defaultValue: "",
      validationRules: "",
    },
  });

  const watchLabel = form.watch("label");

  useEffect(() => {
    if (!editingField && watchLabel) {
      form.setValue("fieldKey", generateFieldKey(watchLabel));
    }
  }, [watchLabel, editingField, form]);

  const { data: taskConfig, isLoading: taskLoading } = useQuery<TaskConfig>({
    queryKey: ["/api/task-configs", taskId],
    enabled: !!taskId,
  });

  const { data: fields, isLoading: fieldsLoading } = useQuery<FormFieldType[]>({
    queryKey: ["/api/form-fields/task", taskId],
    enabled: !!taskId,
  });

  const createField = useMutation({
    mutationFn: async (data: FieldFormData) =>
      apiRequest("POST", "/api/form-fields", {
        ...data,
        taskConfigId: taskId,
        formType: "task",
      }),
    onSuccess: () => {
      toast({ title: "Field created" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-fields/task", taskId] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to create field", variant: "destructive" }),
  });

  const updateField = useMutation({
    mutationFn: async (data: FieldFormData) =>
      apiRequest("PATCH", `/api/form-fields/${editingField?.id}`, data),
    onSuccess: () => {
      toast({ title: "Field updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-fields/task", taskId] });
      setIsOpen(false);
      setEditingField(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update field", variant: "destructive" }),
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/form-fields/${id}`),
    onSuccess: () => {
      toast({ title: "Field deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-fields/task", taskId] });
    },
    onError: () => toast({ title: "Failed to delete field", variant: "destructive" }),
  });

  const handleAdd = () => {
    setEditingField(null);
    form.reset({
      label: "",
      labelHi: "",
      labelPa: "",
      fieldKey: "",
      fieldType: "text",
      placeholder: "",
      placeholderHi: "",
      placeholderPa: "",
      isRequired: false,
      sortOrder: (fields?.length ?? 0) * 10,
      defaultValue: "",
      validationRules: "",
    });
    setIsOpen(true);
  };

  const handleEdit = (field: FormFieldType) => {
    setEditingField(field);
    form.reset({
      label: field.label,
      labelHi: (field as any).labelHi ?? "",
      labelPa: (field as any).labelPa ?? "",
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      placeholder: field.placeholder ?? "",
      placeholderHi: (field as any).placeholderHi ?? "",
      placeholderPa: (field as any).placeholderPa ?? "",
      isRequired: field.isRequired ?? false,
      sortOrder: field.sortOrder ?? 0,
      defaultValue: field.defaultValue ?? "",
      validationRules: field.validationRules ?? "",
    });
    setIsOpen(true);
  };

  const handleDelete = (field: FormFieldType) => {
    deleteField.mutate(field.id);
  };

  const onSubmit = (data: FieldFormData) => {
    if (editingField) {
      updateField.mutate(data);
    } else {
      createField.mutate(data);
    }
  };

  if (!taskId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-muted-foreground" data-testid="text-no-task-selected">
          No task selected. Please select a task from Task Manager.
        </p>
        <Link href="/admin/task-manager">
          <Button variant="outline" data-testid="button-go-task-manager">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Task Manager
          </Button>
        </Link>
      </div>
    );
  }

  const sortedFields = fields?.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/task-manager">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-form-builder-title">
              {taskLoading ? <Skeleton className="h-7 w-48" /> : `Form Builder: ${taskConfig?.name ?? ""}`}
            </h1>
            <p className="text-muted-foreground">Add, edit, and reorder fields for this task</p>
          </div>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-field">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {fieldsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : sortedFields?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p data-testid="text-no-fields">No fields configured yet. Click "Add Field" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedFields?.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              allFields={sortedFields}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add New Field"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Contact Number" {...field} data-testid="input-field-label" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="labelHi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label (Hindi)</FormLabel>
                      <FormControl>
                        <Input placeholder="हिंदी लेबल" {...field} data-testid="input-field-label-hi" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="labelPa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label (Punjabi)</FormLabel>
                      <FormControl>
                        <Input placeholder="ਪੰਜਾਬੀ ਲੇਬਲ" {...field} data-testid="input-field-label-pa" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fieldKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Key *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. contact_number" {...field} data-testid="input-field-key" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fieldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-field-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placeholder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placeholder (English)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter placeholder text" {...field} data-testid="input-field-placeholder" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="placeholderHi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder (Hindi)</FormLabel>
                      <FormControl>
                        <Input placeholder="हिंदी प्लेसहोल्डर" {...field} data-testid="input-field-placeholder-hi" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="placeholderPa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder (Punjabi)</FormLabel>
                      <FormControl>
                        <Input placeholder="ਪੰਜਾਬੀ ਪਲੇਸਹੋਲਡਰ" {...field} data-testid="input-field-placeholder-pa" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <FormLabel className="text-base">Required</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-field-required"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-field-sort-order" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Value</FormLabel>
                    <FormControl>
                      <Input placeholder="Default value" {...field} data-testid="input-field-default-value" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validationRules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validation Rules (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='e.g. {"min": 1, "max": 100}'
                        {...field}
                        data-testid="input-field-validation-rules"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createField.isPending || updateField.isPending}
                data-testid="button-save-field"
              >
                {editingField ? "Update" : "Add"} Field
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
