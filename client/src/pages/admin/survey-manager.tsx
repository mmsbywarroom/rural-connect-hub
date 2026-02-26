import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  Loader2,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
} from "lucide-react";

type SurveyQuestion = {
  id?: string;
  surveyId?: string;
  label: string;
  labelHi: string;
  labelPa: string;
  type: string;
  options: string[];
  optionsHi: string[];
  optionsPa: string[];
  required: boolean;
  sortOrder: number;
};

type Survey = {
  id: string;
  title: string;
  titleHi?: string | null;
  titlePa?: string | null;
  description?: string | null;
  descriptionHi?: string | null;
  descriptionPa?: string | null;
  isActive: boolean;
  questionCount?: number;
  responseCount?: number;
  questions?: SurveyQuestion[];
  createdAt?: string;
};

type SurveyResponse = {
  id: string;
  surveyId: string;
  appUserId: string;
  answers: string;
  userName?: string;
  userPhone?: string;
  createdAt?: string;
};

const QUESTION_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Textarea" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];

const OPTION_TYPES = ["dropdown", "radio", "checkbox"];

function emptyQuestion(sortOrder: number): SurveyQuestion {
  return {
    label: "",
    labelHi: "",
    labelPa: "",
    type: "text",
    options: [],
    optionsHi: [],
    optionsPa: [],
    required: false,
    sortOrder,
  };
}

function SurveyFormDialog({
  open,
  onClose,
  editSurveyId,
}: {
  open: boolean;
  onClose: () => void;
  editSurveyId: string | null;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [titlePa, setTitlePa] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHi, setDescriptionHi] = useState("");
  const [descriptionPa, setDescriptionPa] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([emptyQuestion(0)]);
  const [loaded, setLoaded] = useState(false);

  const { isLoading: loadingSurvey } = useQuery<Survey>({
    queryKey: ["/api/surveys", editSurveyId],
    enabled: !!editSurveyId,
  });

  const { data: surveyDetail } = useQuery<Survey>({
    queryKey: ["/api/surveys", editSurveyId],
    enabled: !!editSurveyId,
  });

  if (editSurveyId && surveyDetail && !loaded) {
    setTitle(surveyDetail.title || "");
    setTitleHi(surveyDetail.titleHi || "");
    setTitlePa(surveyDetail.titlePa || "");
    setDescription(surveyDetail.description || "");
    setDescriptionHi(surveyDetail.descriptionHi || "");
    setDescriptionPa(surveyDetail.descriptionPa || "");
    setIsActive(surveyDetail.isActive !== false);
    if (surveyDetail.questions && surveyDetail.questions.length > 0) {
      setQuestions(
        surveyDetail.questions
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((q, i) => ({
            ...q,
            options: q.options || [],
            optionsHi: q.optionsHi || [],
            optionsPa: q.optionsPa || [],
            sortOrder: i,
          }))
      );
    } else {
      setQuestions([emptyQuestion(0)]);
    }
    setLoaded(true);
  }

  if (!editSurveyId && !loaded) {
    setLoaded(true);
  }

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/surveys", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Survey created" });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      onClose();
    },
    onError: () => toast({ title: "Failed to create survey", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/surveys/${editSurveyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Survey updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", editSurveyId] });
      onClose();
    },
    onError: () => toast({ title: "Failed to update survey", variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const validQuestions = questions.filter((q) => q.label.trim());
    if (validQuestions.length === 0) {
      toast({ title: "Add at least one question", variant: "destructive" });
      return;
    }
    const payload = {
      title: title.trim(),
      titleHi: titleHi.trim() || null,
      titlePa: titlePa.trim() || null,
      description: description.trim() || null,
      descriptionHi: descriptionHi.trim() || null,
      descriptionPa: descriptionPa.trim() || null,
      isActive,
      questions: validQuestions.map((q, i) => ({
        label: q.label.trim(),
        labelHi: q.labelHi?.trim() || null,
        labelPa: q.labelPa?.trim() || null,
        type: q.type,
        options: OPTION_TYPES.includes(q.type) ? q.options.filter((o) => o.trim()) : [],
        optionsHi: OPTION_TYPES.includes(q.type) ? q.optionsHi.filter((o) => o.trim()) : [],
        optionsPa: OPTION_TYPES.includes(q.type) ? q.optionsPa.filter((o) => o.trim()) : [],
        required: q.required,
        sortOrder: i,
      })),
    };
    if (editSurveyId) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion(questions.length)]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, sortOrder: i })));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setQuestions(updated.map((q, i) => ({ ...q, sortOrder: i })));
  };

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    setQuestions(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    updateQuestion(qIndex, {
      options: [...q.options, ""],
      optionsHi: [...q.optionsHi, ""],
      optionsPa: [...q.optionsPa, ""],
    });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    updateQuestion(qIndex, {
      options: q.options.filter((_, i) => i !== oIndex),
      optionsHi: q.optionsHi.filter((_, i) => i !== oIndex),
      optionsPa: q.optionsPa.filter((_, i) => i !== oIndex),
    });
  };

  const updateOption = (qIndex: number, oIndex: number, lang: "en" | "hi" | "pa", value: string) => {
    const q = questions[qIndex];
    if (lang === "en") {
      const opts = [...q.options];
      opts[oIndex] = value;
      updateQuestion(qIndex, { options: opts });
    } else if (lang === "hi") {
      const opts = [...q.optionsHi];
      opts[oIndex] = value;
      updateQuestion(qIndex, { optionsHi: opts });
    } else {
      const opts = [...q.optionsPa];
      opts[oIndex] = value;
      updateQuestion(qIndex, { optionsPa: opts });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (editSurveyId && loadingSurvey && !loaded) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-survey-dialog-title">
            {editSurveyId ? "Edit Survey" : "Create Survey"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title (English) *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Survey title"
              data-testid="input-survey-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title (Hindi)</Label>
              <Input
                value={titleHi}
                onChange={(e) => setTitleHi(e.target.value)}
                placeholder="हिंदी शीर्षक"
                data-testid="input-survey-title-hi"
              />
            </div>
            <div>
              <Label>Title (Punjabi)</Label>
              <Input
                value={titlePa}
                onChange={(e) => setTitlePa(e.target.value)}
                placeholder="ਪੰਜਾਬੀ ਸਿਰਲੇਖ"
                data-testid="input-survey-title-pa"
              />
            </div>
          </div>
          <div>
            <Label>Description (English)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Survey description"
              className="resize-none"
              data-testid="input-survey-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Description (Hindi)</Label>
              <Textarea
                value={descriptionHi}
                onChange={(e) => setDescriptionHi(e.target.value)}
                placeholder="हिंदी विवरण"
                className="resize-none"
                data-testid="input-survey-description-hi"
              />
            </div>
            <div>
              <Label>Description (Punjabi)</Label>
              <Textarea
                value={descriptionPa}
                onChange={(e) => setDescriptionPa(e.target.value)}
                placeholder="ਪੰਜਾਬੀ ਵੇਰਵਾ"
                className="resize-none"
                data-testid="input-survey-description-pa"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-survey-active"
            />
            <Label>Active</Label>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="font-semibold">Questions</h3>
              <Button size="sm" onClick={addQuestion} data-testid="button-add-question">
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Button>
            </div>
            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <Card key={qIdx} data-testid={`card-question-${qIdx}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Question {qIdx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveQuestion(qIdx, "up")}
                          disabled={qIdx === 0}
                          data-testid={`button-move-up-${qIdx}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveQuestion(qIdx, "down")}
                          disabled={qIdx === questions.length - 1}
                          data-testid={`button-move-down-${qIdx}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(qIdx)}
                          disabled={questions.length <= 1}
                          data-testid={`button-remove-question-${qIdx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Label (English) *</Label>
                      <Input
                        value={q.label}
                        onChange={(e) => updateQuestion(qIdx, { label: e.target.value })}
                        placeholder="Question label"
                        data-testid={`input-question-label-${qIdx}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Label (Hindi)</Label>
                        <Input
                          value={q.labelHi}
                          onChange={(e) => updateQuestion(qIdx, { labelHi: e.target.value })}
                          placeholder="हिंदी लेबल"
                          data-testid={`input-question-label-hi-${qIdx}`}
                        />
                      </div>
                      <div>
                        <Label>Label (Punjabi)</Label>
                        <Input
                          value={q.labelPa}
                          onChange={(e) => updateQuestion(qIdx, { labelPa: e.target.value })}
                          placeholder="ਪੰਜਾਬੀ ਲੇਬਲ"
                          data-testid={`input-question-label-pa-${qIdx}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={q.type}
                          onValueChange={(v) => updateQuestion(qIdx, { type: v })}
                        >
                          <SelectTrigger data-testid={`select-question-type-${qIdx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={q.required}
                          onCheckedChange={(c) => updateQuestion(qIdx, { required: c })}
                          data-testid={`switch-question-required-${qIdx}`}
                        />
                        <Label>Required</Label>
                      </div>
                    </div>

                    {OPTION_TYPES.includes(q.type) && (
                      <div className="space-y-2 border-t pt-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Label className="text-sm">Options</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(qIdx)}
                            data-testid={`button-add-option-${qIdx}`}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Option
                          </Button>
                        </div>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-start gap-2" data-testid={`option-row-${qIdx}-${oIdx}`}>
                            <div className="flex-1 space-y-1">
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(qIdx, oIdx, "en", e.target.value)}
                                placeholder="Option (English)"
                                data-testid={`input-option-en-${qIdx}-${oIdx}`}
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <Input
                                  value={q.optionsHi[oIdx] || ""}
                                  onChange={(e) => updateOption(qIdx, oIdx, "hi", e.target.value)}
                                  placeholder="Hindi"
                                  data-testid={`input-option-hi-${qIdx}-${oIdx}`}
                                />
                                <Input
                                  value={q.optionsPa[oIdx] || ""}
                                  onChange={(e) => updateOption(qIdx, oIdx, "pa", e.target.value)}
                                  placeholder="Punjabi"
                                  data-testid={`input-option-pa-${qIdx}-${oIdx}`}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(qIdx, oIdx)}
                              data-testid={`button-remove-option-${qIdx}-${oIdx}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {q.options.length === 0 && (
                          <p className="text-xs text-muted-foreground">No options added yet</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-survey">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-survey">
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {editSurveyId ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResponsesDialog({
  open,
  onClose,
  surveyId,
  surveyTitle,
}: {
  open: boolean;
  onClose: () => void;
  surveyId: string;
  surveyTitle: string;
}) {
  const { data: surveyDetail } = useQuery<Survey>({
    queryKey: ["/api/surveys", surveyId],
    enabled: open,
  });

  const { data: responses, isLoading } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/surveys", surveyId, "responses"],
    enabled: open,
  });

  const questionsList = surveyDetail?.questions
    ?.slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) || [];

  const parseAnswers = (answersStr: string): Record<string, any> => {
    try {
      return JSON.parse(answersStr);
    } catch {
      return {};
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-responses-title">Responses: {surveyTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/surveys/${surveyId}/export-csv`, "_blank")}
            data-testid="button-export-csv-dialog"
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (responses || []).length === 0 ? (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-responses">
            No responses yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Phone</TableHead>
                  {questionsList.map((q) => (
                    <TableHead key={q.id || q.sortOrder}>{q.label}</TableHead>
                  ))}
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(responses || []).map((r, idx) => {
                  const answers = parseAnswers(r.answers);
                  return (
                    <TableRow key={r.id} data-testid={`row-response-${idx}`}>
                      <TableCell data-testid={`text-response-user-${idx}`}>
                        {r.userName || "—"}
                      </TableCell>
                      <TableCell data-testid={`text-response-phone-${idx}`}>
                        {r.userPhone || "—"}
                      </TableCell>
                      {questionsList.map((q) => (
                        <TableCell key={q.id || q.sortOrder}>
                          {(() => {
                            const val = answers[q.id || ""];
                            if (Array.isArray(val)) return val.join(", ");
                            return val ?? "—";
                          })()}
                        </TableCell>
                      ))}
                      <TableCell>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-responses">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SurveyManagerPage() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editSurveyId, setEditSurveyId] = useState<string | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<Survey | null>(null);
  const [responseSurvey, setResponseSurvey] = useState<Survey | null>(null);

  const { data: surveys, isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/surveys/${id}/toggle`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Survey status toggled" });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
    },
    onError: () => toast({ title: "Failed to toggle status", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/surveys/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Survey deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      setDeletingSurvey(null);
    },
    onError: () => toast({ title: "Failed to delete survey", variant: "destructive" }),
  });

  const handleAdd = () => {
    setEditSurveyId(null);
    setFormOpen(true);
  };

  const handleEdit = (survey: Survey) => {
    setEditSurveyId(survey.id);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditSurveyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-survey-manager-title">
              Survey Manager
            </h1>
            <p className="text-sm text-muted-foreground">Create and manage surveys</p>
          </div>
        </div>
        <Button onClick={handleAdd} data-testid="button-create-survey">
          <Plus className="h-4 w-4 mr-2" /> Create Survey
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (surveys || []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p data-testid="text-no-surveys">No surveys created yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(surveys || []).map((survey) => (
                <TableRow key={survey.id} data-testid={`row-survey-${survey.id}`}>
                  <TableCell data-testid={`text-survey-title-${survey.id}`}>
                    <div>
                      <p className="font-medium">{survey.title}</p>
                      {survey.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {survey.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`no-default-hover-elevate no-default-active-elevate ${
                        survey.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                      data-testid={`badge-survey-status-${survey.id}`}
                    >
                      {survey.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-survey-questions-${survey.id}`}>
                    {survey.questionCount ?? 0}
                  </TableCell>
                  <TableCell data-testid={`text-survey-responses-${survey.id}`}>
                    {survey.responseCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResponseSurvey(survey)}
                        data-testid={`button-view-responses-${survey.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(`/api/surveys/${survey.id}/export-csv`, "_blank")
                        }
                        data-testid={`button-export-csv-${survey.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(survey)}
                        data-testid={`button-edit-survey-${survey.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate(survey.id)}
                        data-testid={`button-toggle-survey-${survey.id}`}
                      >
                        <Badge
                          variant="outline"
                          className="no-default-hover-elevate no-default-active-elevate"
                        >
                          {survey.isActive ? "Deactivate" : "Activate"}
                        </Badge>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingSurvey(survey)}
                        data-testid={`button-delete-survey-${survey.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {formOpen && (
        <SurveyFormDialog
          open={formOpen}
          onClose={handleCloseForm}
          editSurveyId={editSurveyId}
        />
      )}

      {responseSurvey && (
        <ResponsesDialog
          open={!!responseSurvey}
          onClose={() => setResponseSurvey(null)}
          surveyId={responseSurvey.id}
          surveyTitle={responseSurvey.title}
        />
      )}

      <AlertDialog
        open={!!deletingSurvey}
        onOpenChange={(open) => !open && setDeletingSurvey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Survey</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingSurvey?.title}&quot;? This will also
              delete all questions and responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-survey">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSurvey && deleteMutation.mutate(deletingSurvey.id)}
              data-testid="button-confirm-delete-survey"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
