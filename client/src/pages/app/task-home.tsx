import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, Users, UserPlus, ChevronRight, ClipboardList, MapPin, FileText, Camera, BarChart3, Sparkles, ArrowRight, Star, Home, Trophy, BadgeCheck, Crown, Medal, Heart, ClipboardCheck, MessageSquare, Image as ImageIcon, GraduationCap, CalendarCheck, ShieldAlert, Route as RouteIcon, FolderTree, LayoutGrid, MessageCircle, Vote } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getProfileCompletion } from "@/lib/profile-completion";
import { useTranslation, getLocalizedText, type Language } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AppUser, TaskConfig, Survey, SurveyQuestion } from "@shared/schema";

interface TaskCategory {
  id: string;
  name: string;
  nameHi: string | null;
  namePa: string | null;
  sortOrder: number | null;
  fixedTaskSlugs?: string[] | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  hasPhoto: boolean;
  count: number;
}

interface LeaderboardData {
  volunteerMapping: LeaderboardEntry[];
  supporterMapping: LeaderboardEntry[];
  hstc: LeaderboardEntry[];
  sdsk: LeaderboardEntry[];
}

function photoUrl(userId: string) {
  return `/api/app/user/${userId}/photo`;
}

interface TaskHomeProps {
  user: AppUser;
  onLogout: () => void;
  onProfile: () => void;
}

const taskTranslations: Record<string, { hi: string; pa: string; descHi: string; descPa: string }> = {
  "CSC/Camp Report": { hi: "सीएससी/कैंप रिपोर्ट", pa: "CSC/ਕੈਂਪ ਰਿਪੋਰਟ", descHi: "सामान्य सेवा केंद्रों और कैंप कार्यालयों की स्थिति रिपोर्ट करें", descPa: "ਕਾਮਨ ਸਰਵਿਸ ਸੈਂਟਰਾਂ ਅਤੇ ਕੈਂਪ ਦਫ਼ਤਰਾਂ ਦੀ ਸਥਿਤੀ ਰਿਪੋਰਟ ਕਰੋ" },
  "Volunteer Mapping": { hi: "वालंटियर मैपिंग", pa: "ਵਲੰਟੀਅਰ ਮੈਪਿੰਗ", descHi: "क्षेत्र में स्वयंसेवकों का मानचित्रण और सत्यापन करें", descPa: "ਖੇਤਰ ਵਿੱਚ ਵਲੰਟੀਅਰਾਂ ਦੀ ਮੈਪਿੰਗ ਅਤੇ ਤਸਦੀਕ ਕਰੋ" },
  "Supporter Mapping": { hi: "समर्थक मैपिंग", pa: "ਸਮਰਥਕ ਮੈਪਿੰਗ", descHi: "नए समर्थकों को संपर्क और आईडी विवरण के साथ जोड़ें", descPa: "ਨਵੇਂ ਸਮਰਥਕਾਂ ਨੂੰ ਸੰਪਰਕ ਅਤੇ ਆਈਡੀ ਵੇਰਵਿਆਂ ਨਾਲ ਜੋੜੋ" },
};

function getTaskName(language: Language, task: TaskConfig): string {
  const fallback = taskTranslations[task.name];
  return getLocalizedText(language, task.name, (task as any).nameHi || fallback?.hi, (task as any).namePa || fallback?.pa);
}

function getTaskDesc(language: Language, task: TaskConfig): string {
  const fallback = taskTranslations[task.name];
  return getLocalizedText(language, task.description || "", (task as any).descriptionHi || fallback?.descHi, (task as any).descriptionPa || fallback?.descPa);
}

const iconMap: Record<string, any> = {
  Building2, Users, UserPlus, ClipboardList, MapPin, FileText, Camera, BarChart3,
};

const TASK_SLUG_MAP: Record<string, string> = {
  "CSC/Camp Report": "csc-report",
  "Volunteer Mapping": "volunteer-mapping",
  "Supporter Mapping": "supporter-mapping",
};

function getTaskRoute(task: TaskConfig): string {
  const slug = TASK_SLUG_MAP[task.name];
  return slug ? `/task/${slug}` : `/task/${task.id}`;
}

function CircularProgress({ percentage, size = 44 }: { percentage: number; size?: number }) {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const isAbove90 = percentage >= 90;
  const gradientId = "progress-gradient";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isAbove90 ? "#34d399" : "#f87171"} />
          <stop offset="100%" stopColor={isAbove90 ? "#22c55e" : "#ef4444"} />
        </linearGradient>
        <filter id="progress-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        filter="url(#progress-glow)"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
}

export default function TaskHome({ user, onLogout, onProfile }: TaskHomeProps) {
  const { t, language } = useTranslation();
  const roleLabel =
    user.role === "party_post_holder"
      ? t("partyPostHolder")
      : user.role === "mahila_sakhi"
      ? (language === "hi" ? "महिला सखी" : language === "pa" ? "ਮਹਿਲਾ ਸਖੀ" : "Mahila Sakhi")
      : t("volunteer");
  const completion = getProfileCompletion(user);
  const isComplete = completion.percentage === 100;
  const isAbove90 = completion.percentage >= 90;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories } = useQuery<TaskCategory[]>({
    queryKey: ["/api/app/task-categories"],
  });

  const ALL_FIXED_SLUGS = ["nasha-viruddh-yuddh", "road-report", "harr-sirr-te-chatt", "sukh-dukh-saanjha-karo", "sunwai", "outdoor-ad", "gov-school", "appointment", "event-venue", "tirth-yatra", "mahila-samman-rashi", "voter-registration"];
  const slugsInAnyCategory = new Set(categories?.flatMap((c) => c.fixedTaskSlugs ?? []) ?? []);
  const uncategorizedFixedSlugs = ALL_FIXED_SLUGS.filter((slug) => !slugsInAnyCategory.has(slug));

  const { data: tasks, isLoading } = useQuery<TaskConfig[]>({
    queryKey: ["/api/app/tasks"],
  });

  const { data: submissionCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/app/my-submissions", user.id],
    enabled: !!user.id,
  });

  const { data: leaderboardData } = useQuery<LeaderboardData>({
    queryKey: ["/api/app/leaderboard"],
  });

  const { data: activeSurveys } = useQuery<SurveyWithQuestions[]>({
    queryKey: ["/api/app/surveys", { userId: user.id }],
    queryFn: async () => {
      const res = await fetch(`/api/app/surveys?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch surveys");
      return res.json();
    },
  });

  const { data: surveyLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/app/survey-leaderboard"],
  });

  const surveyTop3 = (surveyLeaderboard || []).filter(e => e.count > 0).slice(0, 3);
  const isMahilaSakhi = user.role === "mahila_sakhi";

  /** Fixed slugs + dynamic tasks list – jis category ke niche dikhana hai wahi pass karo. Mahila Samman sirf upar alag dikhaya hai. */
  function renderTaskList(fixedSlugs: string[], taskList: TaskConfig[]) {
    const fixedSlugsFiltered = fixedSlugs.filter((slug) => slug !== "mahila-samman-rashi");
    const hasFixed = fixedSlugsFiltered.length > 0;
    const hasDynamic = taskList.length > 0;
    return (
      <>
        {fixedSlugsFiltered.includes("nasha-viruddh-yuddh") && (
        <Link href="/task/nasha-viruddh-yuddh">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-red-200 hover:shadow-md transition-all duration-200" data-testid="task-card-nvy">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-red-600 to-rose-600 shadow-sm">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "नशा विरुद्ध युद्ध" : language === "pa" ? "ਨਸ਼ਾ ਵਿਰੁੱਧ ਯੁੱਧ" : "Nasha Viruddh Yuddh"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi"
                    ? "जहां नशा हो रहा है उस स्थान की गुप्त रिपोर्टिंग"
                    : language === "pa"
                    ? "ਜਿੱਥੇ ਨਸ਼ਾ ਚੱਲ ਰਿਹਾ ਹੈ ਉਸ ਥਾਂ ਦੀ ਗੁਪਤ ਰਿਪੋਰਟਿੰਗ"
                    : "Secretly report locations where drug activity is happening"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("road-report") && (
        <Link href="/task/road-report">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200" data-testid="task-card-road">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-600 to-sky-500 shadow-sm">
                <RouteIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "सड़क खराबी सूचना" : language === "pa" ? "ਸੜਕ ਖਰਾਬੀ ਸੂਚਨਾ" : "Road Condition Report"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi"
                    ? "जहां सड़क टूटी या खराब है, वहां की शुरू से अंत तक की जानकारी भेजें"
                    : language === "pa"
                    ? "ਜਿੱਥੇ ਸੜਕ ਟੁੱਟੀ ਜਾਂ ਖਰਾਬ ਹੈ, ਉੱਥੇ ਦੀ ਸ਼ੁਰੂ ਤੋਂ ਅੰਤ ਤੱਕ ਜਾਣਕਾਰੀ ਭੇਜੋ"
                    : "Report damaged road stretch with photos, audio and map distance"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("harr-sirr-te-chatt") && (
        <Link href="/task/harr-sirr-te-chatt">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-orange-200 hover:shadow-md transition-all duration-200" data-testid="task-card-hstc">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-500 shadow-sm">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "हर सिर ते छत" : language === "pa" ? "ਹਰ ਸਿਰ ਤੇ ਛੱਤ" : "Harr Sirr te Chatt"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "जरूरतमंद परिवारों के लिए छत की पहल" : language === "pa" ? "ਲੋੜਵੰਦ ਪਰਿਵਾਰਾਂ ਲਈ ਛੱਤ ਪਹਿਲਕਦਮੀ" : "Roof initiative for needy families"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("sukh-dukh-saanjha-karo") && (
        <Link href="/task/sukh-dukh-saanjha-karo">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-purple-200 hover:shadow-md transition-all duration-200" data-testid="task-card-sdsk">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "सुख-दुख सांझा करो" : language === "pa" ? "ਸੁਖ-ਦੁੱਖ ਸਾਂਝਾ ਕਰੋ" : "Sukh-Dukh Saanjha Karo"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "समुदाय कल्याण - सुख और दुख साझा करें" : language === "pa" ? "ਭਾਈਚਾਰਕ ਭਲਾਈ - ਸੁਖ ਅਤੇ ਦੁੱਖ ਸਾਂਝੇ ਕਰੋ" : "Community welfare - share joy and sorrow"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("sunwai") && (
        <Link href="/task/sunwai">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-200" data-testid="task-card-sunwai">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-500 to-cyan-600 shadow-sm">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "सुनवाई" : language === "pa" ? "ਸੁਣਵਾਈ" : "Sunwai (Hearing)"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "शिकायत दर्ज करें और समाधान ट्रैक करें" : language === "pa" ? "ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ ਅਤੇ ਹੱਲ ਟ੍ਰੈਕ ਕਰੋ" : "File complaints and track resolution"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-teal-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("outdoor-ad") && (
        <Link href="/task/outdoor-ad">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200" data-testid="task-card-outdoor-ad">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "आउटडोर विज्ञापन" : language === "pa" ? "ਆਊਟਡੋਰ ਇਸ਼ਤਿਹਾਰ" : "Outdoor Advertisement"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "विज्ञापन स्थान विवरण जमा करें" : language === "pa" ? "ਇਸ਼ਤਿਹਾਰ ਸਥਾਨ ਵੇਰਵੇ ਜਮ੍ਹਾਂ ਕਰੋ" : "Submit ad location details"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("gov-school") && (
        <Link href="/task/gov-school">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-green-200 hover:shadow-md transition-all duration-200" data-testid="task-card-gov-school">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "सरकारी स्कूल कार्य" : language === "pa" ? "ਸਰਕਾਰੀ ਸਕੂਲ ਕੰਮ" : "Gov School Work"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "सरकारी स्कूल की समस्याएं रिपोर्ट करें" : language === "pa" ? "ਸਰਕਾਰੀ ਸਕੂਲ ਦੀਆਂ ਸਮੱਸਿਆਵਾਂ ਰਿਪੋਰਟ ਕਰੋ" : "Report government school issues"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("appointment") && (
        <Link href="/task/appointment">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-purple-200 hover:shadow-md transition-all duration-200" data-testid="task-card-appointment">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 shadow-sm">
                <CalendarCheck className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "मुलाकात" : language === "pa" ? "ਮੁਲਾਕਾਤ" : "Appointment"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "मुलाकात का अनुरोध करें और अपनी निर्धारित बैठकों को ट्रैक करें" : language === "pa" ? "ਮੁਲਾਕਾਤ ਦੀ ਬੇਨਤੀ ਕਰੋ ਅਤੇ ਆਪਣੀਆਂ ਤਹਿ ਮੀਟਿੰਗਾਂ ਨੂੰ ਟਰੈਕ ਕਰੋ" : "Request an appointment and track your scheduled meetings"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("event-venue") && (
        <Link href="/task/event-venue">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200" data-testid="task-card-event-venue">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "इवेंट स्थल" : language === "pa" ? "ਇਵੈਂਟ ਸਥਾਨ" : "Event Venues"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi"
                    ? "यूनिट चुनकर इवेंट स्थल की बुकिंग रिक्वेस्ट भेजें"
                    : language === "pa"
                    ? "ਯੂਨਿਟ ਚੁਣ ਕੇ ਇਵੈਂਟ ਸਥਾਨ ਦੀ ਬੁਕਿੰਗ ਬੇਨਤੀ ਭੇਜੋ"
                    : "Request booking for event venues with unit, date, time & map"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("tirth-yatra") && (
        <Link href="/task/tirth-yatra">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200" data-testid="task-card-tirth-yatra">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-600 to-teal-700 shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "तीर्थ यात्रा" : language === "pa" ? "ਤੀਰਥ ਯਾਤਰਾ" : "Tirth Yatra"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi"
                    ? "तीर्थ यात्रा के लिए आवेदन करें (परिवार सहित या अकेले)"
                    : language === "pa"
                    ? "ਤੀਰਥ ਯਾਤਰਾ ਲਈ ਅਰਜ਼ੀ ਦਿਓ (ਪਰਿਵਾਰ ਸਮੇਤ ਜਾਂ ਇਕੱਲੇ)"
                    : "Apply for pilgrimage journey with or without family"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {fixedSlugsFiltered.includes("voter-registration") && (
        <Link href="/task/voter-registration">
          <Card className="group cursor-pointer bg-white border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200" data-testid="task-card-voter-registration">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm">
                <Vote className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800">
                  {language === "hi" ? "मतदाता पंजीकरण" : language === "pa" ? "ਵੋਟਰ ਰਜਿਸਟ੍ਰੇਸ਼ਨ" : "Voter Registration"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {language === "hi" ? "व्यक्तिगत जानकारी, पता, दस्तावेज़ अपलोड और OTP सत्यापन" : language === "pa" ? "ਨਿੱਜੀ ਜਾਣਕਾਰੀ, ਪਤਾ, ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਅਤੇ OTP ਤਸਦੀਕ" : "Personal details, address, document upload & OTP verification"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        )}
        {isLoading && (
          <>
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-[72px] w-full rounded-xl" />
          </>
        )}
        {taskList.map((task) => {
          const IconComponent = iconMap[task.icon || "ClipboardList"] || ClipboardList;
          const count = submissionCounts?.[task.id] || 0;
          return (
            <Link key={task.id} href={getTaskRoute(task)}>
              <Card className="group cursor-pointer bg-white border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200" data-testid={`task-card-${task.id}`}>
                <CardContent className="p-4 flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${task.color || "#3b82f6"}, ${task.color || "#3b82f6"}dd)` }}
                  >
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-800">{getTaskName(language, task)}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{getTaskDesc(language, task)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {!isLoading && !hasFixed && !hasDynamic && (
          <div className="text-center py-10 text-slate-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">
              {language === "hi" ? "इस श्रेणी में कोई कार्य नहीं" : language === "pa" ? "ਇਸ ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਕੋਈ ਕੰਮ ਨਹੀਂ" : "No tasks in this category"}
            </p>
          </div>
        )}
      </>
    );
  }

  const overallTop3 = (() => {
    if (!leaderboardData) return [];
    const combined: Record<string, LeaderboardEntry> = {};
    for (const board of [leaderboardData.volunteerMapping, leaderboardData.supporterMapping, leaderboardData.hstc, leaderboardData.sdsk]) {
      for (const entry of board) {
        if (!combined[entry.userId]) combined[entry.userId] = { ...entry, count: 0 };
        combined[entry.userId].count += entry.count;
      }
    }
    return Object.values(combined).filter(e => e.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 pt-5 pb-6 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white rounded-full" />
        </div>
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] border-2 border-white/30 shadow-md overflow-hidden">
              {user.selfPhoto ? <AvatarImage src={user.selfPhoto} className="object-cover w-full h-full" /> : <AvatarFallback className="bg-white/20 text-white text-lg font-bold">{user.name.charAt(0)}</AvatarFallback>}
            </Avatar>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-1.5" data-testid="text-user-name">
                {user.name}
                {user.isApproved && (
                  <BadgeCheck className="h-4.5 w-4.5 text-amber-300 flex-shrink-0" data-testid="badge-verified-tick" />
                )}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="bg-white/15 text-white/90 text-[10px] px-2 border-0 backdrop-blur-sm" data-testid="text-user-role">{roleLabel}</Badge>
                {user.mappedAreaName && <span className="text-xs text-white/70" data-testid="text-user-area">{user.mappedAreaName}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onProfile}
              className="relative flex items-center justify-center"
              data-testid="button-profile-completion"
              style={{ width: 52, height: 52 }}
            >
              {!isAbove90 && (
                <span className="absolute inset-0 rounded-full animate-ping-slow opacity-40" style={{ border: '2px solid #ef4444' }} />
              )}
              <span className={`absolute inset-0 rounded-full ${isAbove90 ? 'bg-green-500/20' : 'bg-red-500/15 animate-pulse-soft'}`} />
              <CircularProgress percentage={completion.percentage} size={44} />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[11px] font-bold ${isAbove90 ? 'text-green-300' : 'text-red-400 animate-blink'}`} style={{ textShadow: '0 0 8px rgba(0,0,0,0.3)' }}>
                  {completion.percentage}%
                </span>
              </span>
              {!isAbove90 && (
                <span className="absolute -top-0.5 -right-0.5">
                  <Star className="h-3.5 w-3.5 text-red-400 animate-twinkle fill-red-400" />
                </span>
              )}
            </button>
            <Link href="/chat">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-chat">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <LanguageSwitcher variant="ghost" className="text-white" iconClassName="text-white" />
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onLogout} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {!isComplete && (
        <div className="px-4 -mt-3 relative z-10">
          <button
            onClick={onProfile}
            className="w-full bg-white rounded-xl shadow-md px-4 py-3 flex items-center gap-3 text-left group border border-slate-100 hover:shadow-lg transition-shadow"
            data-testid="button-profile-banner"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {t('completeProfile')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {completion.filledCount} {t('of')} {completion.totalCount} {t('fieldsDone')} &middot; {completion.missingFields.length} {t('remaining')}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="relative w-10 h-10">
                <svg width="40" height="40" className="transform -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke={isAbove90 ? "#22c55e" : "#f59e0b"} strokeWidth="3"
                    strokeDasharray={100.5} strokeDashoffset={100.5 - (completion.percentage / 100) * 100.5} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{completion.percentage}%</span>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className={`px-4 ${!isComplete ? 'pt-4' : 'pt-5'} pb-6 space-y-5`}>

        {activeSurveys && activeSurveys.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {language === "hi" ? "सर्वेक्षण" : language === "pa" ? "ਸਰਵੇਖਣ" : "Pending Surveys"}
              </h2>
            </div>
            <div className="space-y-2.5">
              {activeSurveys.map((survey) => (
                <Link key={survey.id} href={`/survey/${survey.id}`}>
                  <Card className="group cursor-pointer border-emerald-100 bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-200" data-testid={`survey-card-${survey.id}`}>
                    <CardContent className="p-4 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                        <ClipboardCheck className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-800 leading-tight">
                          {getLocalizedText(language, survey.title, survey.titleHi || undefined, survey.titlePa || undefined)}
                        </h3>
                        {survey.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {getLocalizedText(language, survey.description, survey.descriptionHi || undefined, survey.descriptionPa || undefined)}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[10px] mt-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                          {survey.questions?.length || 0} {language === "hi" ? "प्रश्न" : language === "pa" ? "ਸਵਾਲ" : "questions"}
                        </Badge>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isMahilaSakhi && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/leaderboard">
              <Card className="cursor-pointer bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white hover:shadow-lg transition-shadow h-full" data-testid="card-leaderboard">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Trophy className="h-4.5 w-4.5 text-yellow-300" />
                    <h3 className="font-semibold text-sm text-white">
                      {language === "hi" ? "लीडरबोर्ड" : language === "pa" ? "ਲੀਡਰਬੋਰਡ" : "Leaderboard"}
                    </h3>
                  </div>
                  {overallTop3.length > 0 ? (
                    <div className="space-y-1.5">
                      {overallTop3.slice(0, 3).map((entry, i) => {
                        const isMe = entry.userId === user.id;
                        const rankIcon = i === 0 ? <Crown className="h-3 w-3 text-yellow-300" /> : i === 1 ? <Medal className="h-3 w-3 text-gray-300" /> : <Medal className="h-3 w-3 text-amber-600" />;
                        return (
                          <div key={entry.userId} className={`flex items-center gap-2 ${isMe ? 'bg-white/15' : 'bg-white/5'} rounded-lg px-2 py-1`} data-testid={`dashboard-top-${i + 1}`}>
                            {rankIcon}
                            <Avatar className="w-5 h-5">
                              {entry.hasPhoto ? <AvatarImage src={photoUrl(entry.userId)} /> : <AvatarFallback className="bg-white/20 text-white text-[8px]">{entry.name.charAt(0)}</AvatarFallback>}
                            </Avatar>
                            <span className="text-[10px] font-medium truncate flex-1">{entry.name.split(" ")[0]}</span>
                            <span className="text-[10px] font-bold text-yellow-300">{entry.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-white/60">
                      {language === "hi" ? "रैंकिंग देखें" : language === "pa" ? "ਰੈਂਕਿੰਗ ਵੇਖੋ" : "View rankings"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/survey-leaderboard">
              <Card className="cursor-pointer bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white hover:shadow-lg transition-shadow h-full" data-testid="card-survey-leaderboard">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ClipboardCheck className="h-4.5 w-4.5 text-emerald-200" />
                    <h3 className="font-semibold text-sm text-white">
                      {language === "hi" ? "सर्वे बोर्ड" : language === "pa" ? "ਸਰਵੇ ਬੋਰਡ" : "Survey Board"}
                    </h3>
                  </div>
                  {surveyTop3.length > 0 ? (
                    <div className="space-y-1.5">
                      {surveyTop3.map((entry, i) => {
                        const isMe = entry.userId === user.id;
                        const rankIcon = i === 0 ? <Crown className="h-3 w-3 text-yellow-300" /> : i === 1 ? <Medal className="h-3 w-3 text-gray-300" /> : <Medal className="h-3 w-3 text-amber-600" />;
                        return (
                          <div key={entry.userId} className={`flex items-center gap-2 ${isMe ? 'bg-white/15' : 'bg-white/5'} rounded-lg px-2 py-1`} data-testid={`survey-top-${i + 1}`}>
                            {rankIcon}
                            <Avatar className="w-5 h-5">
                              {entry.hasPhoto ? <AvatarImage src={photoUrl(entry.userId)} /> : <AvatarFallback className="bg-white/20 text-white text-[8px]">{entry.name.charAt(0)}</AvatarFallback>}
                            </Avatar>
                            <span className="text-[10px] font-medium truncate flex-1">{entry.name.split(" ")[0]}</span>
                            <span className="text-[10px] font-bold text-emerald-200">{entry.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-white/60">
                      {language === "hi" ? "सर्वे रैंकिंग" : language === "pa" ? "ਸਰਵੇ ਰੈਂਕਿੰਗ" : "Survey rankings"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('availableTasks')}</h2>
          </div>

          <div className="space-y-2.5">
          {/* Original Mahila Samman Rashi – only for non-Sakhi users */}
          {!isMahilaSakhi && (
          <Link href="/task/mahila-samman-rashi">
            <Card className="group cursor-pointer bg-white border-slate-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 border-2 border-purple-100" data-testid="task-card-mahila-samman">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-600 to-pink-600 shadow-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-800">
                    {language === "hi" ? "महिला सम्मान राशि" : language === "pa" ? "ਮਹਿਲਾ ਸਨਮਾਨ ਰਾਸ਼ੀ" : "Mahila Samman Rashi"}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {language === "hi"
                      ? "हर महिला को ₹1,000/महीना; SC/ST महिलाओं को ₹1,500/महीना"
                      : language === "pa"
                      ? "ਹਰ ਔਰਤ ਨੂੰ ₹1,000/ਮਹੀਨਾ; SC/ST ਔਰਤਾਂ ਨੂੰ ₹1,500/ਮਹੀਨਾ"
                      : "₹1,000/month for every woman; ₹1,500 for SC/ST women"}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <ChevronRight className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          )}

          {categories && categories.length > 0 && (
            <>
              {/* All – task list sirf iske niche jab All selected ho */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`w-full text-left rounded-xl border-2 transition-all duration-200 ${selectedCategoryId === null ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
                >
                  <Card className="border-0 shadow-none">
                    <CardContent className="p-4 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-slate-500 to-slate-600 shadow-sm">
                        <LayoutGrid className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-800">
                          {language === "hi" ? "सभी" : language === "pa" ? "ਸਭ" : "All"}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {language === "hi" ? "सभी कार्य देखें" : language === "pa" ? "ਸਭ ਕੰਮ ਵੇਖੋ" : "View all tasks"}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCategoryId === null ? "bg-blue-100" : "bg-slate-100"}`}>
                          <ChevronRight className={`h-4 w-4 ${selectedCategoryId === null ? "text-blue-500" : "text-slate-500"}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
                {selectedCategoryId === null && (
                  <div className="pl-0 space-y-2.5">
                    {renderTaskList(uncategorizedFixedSlugs.filter((slug) => slug !== "mahila-samman-rashi"), tasks?.filter((t) => !(t as any).categoryId) ?? [])}
                  </div>
                )}
              </div>

              {/* Har category – task list sirf us category ke niche jab woh selected ho */}
              {categories.map((cat) => {
                const label = getLocalizedText(language, cat.name, cat.nameHi || undefined, cat.namePa || undefined);
                const isSelected = selectedCategoryId === cat.id;
                const catSlugs = cat.fixedTaskSlugs ?? [];
                const catTasks = tasks?.filter((t) => (t as any).categoryId === cat.id) ?? [];
                return (
                  <div key={cat.id} className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`w-full text-left rounded-xl border-2 transition-all duration-200 ${isSelected ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
                    >
                      <Card className="border-0 shadow-none">
                        <CardContent className="p-4 flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                            <FolderTree className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-slate-800">{label}</h3>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {language === "hi" ? "इस श्रेणी के कार्य" : language === "pa" ? "ਇਸ ਸ਼੍ਰੇਣੀ ਦੇ ਕੰਮ" : "Tasks in this category"}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}>
                              <ChevronRight className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-slate-500"}`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                    {isSelected && (
                      <div className="pl-0 space-y-2.5">
                        {renderTaskList(catSlugs, catTasks)}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {(!categories || categories.length === 0) && renderTaskList(uncategorizedFixedSlugs, tasks?.filter((t) => !(t as any).categoryId) ?? [])}
          </div>
        </section>
      </div>
    </div>
  );
}
