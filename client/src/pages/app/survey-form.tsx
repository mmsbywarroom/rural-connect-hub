import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, getLocalizedText, type Language } from "@/lib/i18n";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, Send } from "lucide-react";
import type { AppUser, Survey, SurveyQuestion } from "@shared/schema";

interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
}

interface SurveyFormProps {
  user: AppUser;
  surveyId: string;
  onBack: () => void;
}

export default function SurveyForm({ user, surveyId, onBack }: SurveyFormProps) {
  const { toast } = useToast();
  const { language } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: survey, isLoading } = useQuery<SurveyWithQuestions>({
    queryKey: ["/api/surveys", surveyId],
  });

  const { data: responseCheck } = useQuery<{ responded: boolean }>({
    queryKey: ["/api/app/surveys", surveyId, "response", user.id],
    enabled: !!user.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/app/surveys/${surveyId}/respond`, {
        appUserId: user.id,
        answers,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/app/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/survey-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/surveys", surveyId, "response", user.id] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to submit", variant: "destructive" });
    },
  });

  const alreadyResponded = responseCheck?.responded;

  const handleSubmit = () => {
    if (!survey) return;
    const requiredMissing = survey.questions
      .filter(q => q.required)
      .filter(q => {
        const val = answers[q.id];
        if (Array.isArray(val)) return val.length === 0;
        return !val || (typeof val === "string" && !val.trim());
      });

    if (requiredMissing.length > 0) {
      const label = getLocalizedText(language, requiredMissing[0].label, requiredMissing[0].labelHi || undefined, requiredMissing[0].labelPa || undefined);
      toast({
        title: language === "hi" ? "आवश्यक फ़ील्ड" : language === "pa" ? "ਲੋੜੀਂਦਾ ਖੇਤਰ" : "Required field",
        description: `"${label}" ${language === "hi" ? "भरना आवश्यक है" : language === "pa" ? "ਭਰਨਾ ਲੋੜੀਂਦਾ ਹੈ" : "is required"}`,
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate();
  };

  const getLabel = (q: SurveyQuestion) =>
    getLocalizedText(language, q.label, q.labelHi || undefined, q.labelPa || undefined);

  const getOptions = (q: SurveyQuestion): string[] => {
    if (language === "hi" && q.optionsHi && q.optionsHi.length > 0) return q.optionsHi;
    if (language === "pa" && q.optionsPa && q.optionsPa.length > 0) return q.optionsPa;
    return q.options || [];
  };

  const getOptionValues = (q: SurveyQuestion): string[] => q.options || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Button variant="ghost" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === "hi" ? "वापस" : language === "pa" ? "ਵਾਪਸ" : "Back"}
        </Button>
        <p className="text-center mt-8 text-slate-500">Survey not found</p>
      </div>
    );
  }

  if (alreadyResponded || submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-emerald-600 text-white px-4 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white" onClick={onBack} data-testid="button-back-header">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">
                {getLocalizedText(language, survey.title, survey.titleHi || undefined, survey.titlePa || undefined)}
              </h1>
            </div>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center p-8 mt-12">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            {language === "hi" ? "धन्यवाद!" : language === "pa" ? "ਧੰਨਵਾਦ!" : "Thank you!"}
          </h2>
          <p className="text-slate-500 text-center">
            {language === "hi" ? "आपका जवाब दर्ज कर लिया गया है" : language === "pa" ? "ਤੁਹਾਡਾ ਜਵਾਬ ਦਰਜ ਕਰ ਲਿਆ ਗਿਆ ਹੈ" : "Your response has been recorded"}
          </p>
          <Button className="mt-6" onClick={onBack} data-testid="button-back-to-home">
            {language === "hi" ? "होम पर वापस जाएं" : language === "pa" ? "ਹੋਮ ਤੇ ਵਾਪਸ ਜਾਓ" : "Back to Home"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={onBack} data-testid="button-back-header">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">
              {getLocalizedText(language, survey.title, survey.titleHi || undefined, survey.titlePa || undefined)}
            </h1>
            {survey.description && (
              <p className="text-sm text-white/80">
                {getLocalizedText(language, survey.description, survey.descriptionHi || undefined, survey.descriptionPa || undefined)}
              </p>
            )}
          </div>
          <ClipboardCheck className="h-6 w-6 text-white/70" />
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {survey.questions?.map((q, idx) => {
          const label = getLabel(q);
          const options = getOptions(q);
          const optionValues = getOptionValues(q);

          return (
            <Card key={q.id} data-testid={`question-card-${idx}`}>
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-medium text-slate-700">
                  {label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {q.type === "text" && (
                  <Input
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    data-testid={`input-q-${idx}`}
                  />
                )}

                {q.type === "number" && (
                  <Input
                    type="number"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    data-testid={`input-q-${idx}`}
                  />
                )}

                {q.type === "textarea" && (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                    data-testid={`textarea-q-${idx}`}
                  />
                )}

                {q.type === "date" && (
                  <Input
                    type="date"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    data-testid={`input-date-q-${idx}`}
                  />
                )}

                {q.type === "dropdown" && (
                  <Select
                    value={answers[q.id] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                  >
                    <SelectTrigger data-testid={`select-q-${idx}`}>
                      <SelectValue placeholder={language === "hi" ? "चुनें" : language === "pa" ? "ਚੁਣੋ" : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {optionValues.map((opt, oi) => (
                        <SelectItem key={oi} value={opt} data-testid={`option-q-${idx}-${oi}`}>
                          {options[oi] || opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {q.type === "radio" && (
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                  >
                    {optionValues.map((opt, oi) => (
                      <div key={oi} className="flex items-center space-x-2" data-testid={`radio-q-${idx}-${oi}`}>
                        <RadioGroupItem value={opt} id={`q-${q.id}-${oi}`} />
                        <Label htmlFor={`q-${q.id}-${oi}`} className="text-sm">{options[oi] || opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === "checkbox" && (
                  <div className="space-y-2">
                    {optionValues.map((opt, oi) => {
                      const checked = (answers[q.id] || []).includes(opt);
                      return (
                        <div key={oi} className="flex items-center space-x-2" data-testid={`checkbox-q-${idx}-${oi}`}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              setAnswers(prev => {
                                const current = prev[q.id] || [];
                                return {
                                  ...prev,
                                  [q.id]: c ? [...current, opt] : current.filter((v: string) => v !== opt),
                                };
                              });
                            }}
                            id={`q-${q.id}-${oi}`}
                          />
                          <Label htmlFor={`q-${q.id}-${oi}`} className="text-sm">{options[oi] || opt}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          data-testid="button-submit-survey"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {language === "hi" ? "जमा करें" : language === "pa" ? "ਜਮ੍ਹਾ ਕਰੋ" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
