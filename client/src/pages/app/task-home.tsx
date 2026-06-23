import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, Users, UserPlus, ChevronRight, ClipboardList, MapPin, FileText, Camera, BarChart3, Sparkles, Home, Trophy, BadgeCheck, Crown, Medal, Heart, ClipboardCheck, MessageSquare, Image as ImageIcon, GraduationCap, CalendarCheck, ShieldAlert, Route as RouteIcon, FolderTree, LayoutGrid, MessageCircle, Vote, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
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

/** MSRP Punjab voter mapping (VMAP); shown to every app user on dashboard. */
const MSRP_PUNJAB_VMAP_URL = "https://msrpunjab.replit.app/vmap";

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

function getFixedTaskLabel(slug: string, language: Language): string {
  switch (slug) {
    case "nasha-viruddh-yuddh":
      return language === "hi"
        ? "नशा विरुद्ध युद्ध"
        : language === "pa"
        ? "ਨਸ਼ਾ ਵਿਰੁੱਧ ਯੁੱਧ"
        : "Nasha Viruddh Yuddh";
    case "road-report":
      return language === "hi"
        ? "सड़क खराबी सूचना"
        : language === "pa"
        ? "ਸੜਕ ਖਰਾਬੀ ਸੂਚਨਾ"
        : "Road Condition Report";
    case "harr-sirr-te-chatt":
      return language === "hi"
        ? "हर सिर ते छत"
        : language === "pa"
        ? "ਹਰ ਸਿਰ ਤੇ ਛੱਤ"
        : "Harr Sirr te Chatt";
    case "sukh-dukh-saanjha-karo":
      return language === "hi"
        ? "सुख-दुख सांझा करो"
        : language === "pa"
        ? "ਸੁਖ-ਦੁੱਖ ਸਾਂਝਾ ਕਰੋ"
        : "Sukh-Dukh Saanjha Karo";
    case "sunwai":
      return language === "hi"
        ? "सुनवाई"
        : language === "pa"
        ? "ਸੁਣਵਾਈ"
        : "Sunwai (Hearing)";
    case "outdoor-ad":
      return language === "hi"
        ? "आउटडोर विज्ञापन"
        : language === "pa"
        ? "ਆਊਟਡੋਰ ਇਸ਼ਤਿਹਾਰ"
        : "Outdoor Advertisement";
    case "gov-school":
      return language === "hi"
        ? "सरकारी स्कूल कार्य"
        : language === "pa"
        ? "ਸਰਕਾਰੀ ਸਕੂਲ ਕੰਮ"
        : "Gov School Work";
    case "appointment":
      return language === "hi"
        ? "मुलाकात"
        : language === "pa"
        ? "ਮੁਲਾਕਾਤ"
        : "Appointment";
    case "event-venue":
      return language === "hi"
        ? "इवेंट स्थल"
        : language === "pa"
        ? "ਇਵੈਂਟ ਸਥਾਨ"
        : "Event Venues";
    case "tirth-yatra":
      return language === "hi"
        ? "तीर्थ यात्रा"
        : language === "pa"
        ? "ਤੀਰਥ ਯਾਤਰਾ"
        : "Tirth Yatra";
    case "voter-registration":
      return language === "hi"
        ? "मतदाता पंजीकरण"
        : language === "pa"
        ? "ਵੋਟਰ ਰਜਿਸਟ੍ਰੇਸ਼ਨ"
        : "Voter Registration";
    case "bla":
      return language === "hi"
        ? "Booth Level Agent (BLA)"
        : language === "pa"
        ? "ਬੂਥ ਲੈਵਲ ਏਜੰਟ (BLA)"
        : "Booth Level Agent (BLA)";
    default:
      return slug;
  }
}

function CircularProgress({ percentage, size = 44 }: { percentage: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const complete = percentage >= 100;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={complete ? "#86efac" : "#fde68a"}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-sm font-semibold text-slate-900 mb-3">{title}</h2>;
}

function DashboardTaskCard({
  href,
  title,
  description,
  icon,
  iconWrapClassName,
  iconGradient,
  hoverBorderClassName = "hover:border-blue-200",
  chevronClassName = "text-blue-500",
  chevronBgClassName = "bg-blue-50 group-hover:bg-blue-100",
  testId,
  featured = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  iconWrapClassName?: string;
  iconGradient?: string;
  hoverBorderClassName?: string;
  chevronClassName?: string;
  chevronBgClassName?: string;
  testId?: string;
  featured?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`group cursor-pointer border bg-white shadow-sm hover:shadow-md transition-all duration-200 ${
          featured ? "border-blue-200 ring-1 ring-blue-100" : `border-slate-100 ${hoverBorderClassName}`
        }`}
        data-testid={testId}
      >
        <CardContent className="p-4 flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              iconGradient ? `bg-gradient-to-br ${iconGradient} text-white` : iconWrapClassName
            }`}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{description}</p>
          </div>
          <div className="shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${chevronBgClassName}`}>
              <ChevronRight className={`h-4 w-4 ${chevronClassName}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CategoryPickerItem({
  selected,
  onClick,
  icon,
  iconGradient,
  title,
  subtitle,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  iconGradient: string;
  title: string;
  subtitle: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 transition-all duration-200 ${
        selected ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
      }`}
      data-testid={testId}
    >
      <div className="p-4 flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br ${iconGradient} text-white`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{subtitle}</p>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selected ? "bg-blue-100" : "bg-slate-100"}`}>
          <ChevronRight className={`h-4 w-4 ${selected ? "text-blue-500" : "text-slate-500"}`} />
        </div>
      </div>
    </button>
  );
}

type FixedTaskMeta = {
  href: string;
  icon: ReactNode;
  iconGradient: string;
  hoverBorderClassName: string;
  chevronClassName: string;
  chevronBgClassName: string;
  testId: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
};

const FIXED_TASK_META: Record<string, FixedTaskMeta> = {
  "nasha-viruddh-yuddh": {
    href: "/task/nasha-viruddh-yuddh",
    icon: <ShieldAlert className="h-5 w-5" />,
    iconGradient: "from-red-600 to-rose-600",
    hoverBorderClassName: "hover:border-red-200",
    chevronClassName: "text-red-500",
    chevronBgClassName: "bg-red-50 group-hover:bg-red-100",
    testId: "task-card-nvy",
    title: { en: "Nasha Viruddh Yuddh", hi: "नशा विरुद्ध युद्ध", pa: "ਨਸ਼ਾ ਵਿਰੁੱਧ ਯੁੱਧ" },
    description: {
      en: "Secretly report locations where drug activity is happening",
      hi: "जहां नशा हो रहा है उस स्थान की गुप्त रिपोर्टिंग",
      pa: "ਜਿੱਥੇ ਨਸ਼ਾ ਚੱਲ ਰਿਹਾ ਹੈ ਉਸ ਥਾਂ ਦੀ ਗੁਪਤ ਰਿਪੋਰਟਿੰਗ",
    },
  },
  "road-report": {
    href: "/task/road-report",
    icon: <RouteIcon className="h-5 w-5" />,
    iconGradient: "from-blue-600 to-sky-500",
    hoverBorderClassName: "hover:border-blue-200",
    chevronClassName: "text-blue-500",
    chevronBgClassName: "bg-blue-50 group-hover:bg-blue-100",
    testId: "task-card-road",
    title: { en: "Road Condition Report", hi: "सड़क खराबी सूचना", pa: "ਸੜਕ ਖਰਾਬੀ ਸੂਚਨਾ" },
    description: {
      en: "Report damaged road stretch with photos, audio and map distance",
      hi: "जहां सड़क टूटी या खराब है, वहां की शुरू से अंत तक की जानकारी भेजें",
      pa: "ਜਿੱਥੇ ਸੜਕ ਟੁੱਟੀ ਜਾਂ ਖਰਾਬ ਹੈ, ਉੱਥੇ ਦੀ ਸ਼ੁਰੂ ਤੋਂ ਅੰਤ ਤੱਕ ਜਾਣਕਾਰੀ ਭੇਜੋ",
    },
  },
  "harr-sirr-te-chatt": {
    href: "/task/harr-sirr-te-chatt",
    icon: <Home className="h-5 w-5" />,
    iconGradient: "from-orange-500 to-red-500",
    hoverBorderClassName: "hover:border-orange-200",
    chevronClassName: "text-orange-500",
    chevronBgClassName: "bg-orange-50 group-hover:bg-orange-100",
    testId: "task-card-hstc",
    title: { en: "Harr Sirr te Chatt", hi: "हर सिर ते छत", pa: "ਹਰ ਸਿਰ ਤੇ ਛੱਤ" },
    description: {
      en: "Roof initiative for needy families",
      hi: "जरूरतमंद परिवारों के लिए छत की पहल",
      pa: "ਲੋੜਵੰਦ ਪਰਿਵਾਰਾਂ ਲਈ ਛੱਤ ਪਹਿਲਕਦਮੀ",
    },
  },
  "sukh-dukh-saanjha-karo": {
    href: "/task/sukh-dukh-saanjha-karo",
    icon: <Heart className="h-5 w-5" />,
    iconGradient: "from-purple-500 to-pink-500",
    hoverBorderClassName: "hover:border-purple-200",
    chevronClassName: "text-purple-500",
    chevronBgClassName: "bg-purple-50 group-hover:bg-purple-100",
    testId: "task-card-sdsk",
    title: { en: "Sukh-Dukh Saanjha Karo", hi: "सुख-दुख सांझा करो", pa: "ਸੁਖ-ਦੁੱਖ ਸਾਂਝਾ ਕਰੋ" },
    description: {
      en: "Community welfare - share joy and sorrow",
      hi: "समुदाय कल्याण - सुख और दुख साझा करें",
      pa: "ਭਾਈਚਾਰਕ ਭਲਾਈ - ਸੁਖ ਅਤੇ ਦੁੱਖ ਸਾਂਝੇ ਕਰੋ",
    },
  },
  sunwai: {
    href: "/task/sunwai",
    icon: <MessageSquare className="h-5 w-5" />,
    iconGradient: "from-teal-500 to-cyan-600",
    hoverBorderClassName: "hover:border-teal-200",
    chevronClassName: "text-teal-500",
    chevronBgClassName: "bg-teal-50 group-hover:bg-teal-100",
    testId: "task-card-sunwai",
    title: { en: "Sunwai (Hearing)", hi: "सुनवाई", pa: "ਸੁਣਵਾਈ" },
    description: {
      en: "File complaints and track resolution",
      hi: "शिकायत दर्ज करें और समाधान ट्रैक करें",
      pa: "ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ ਅਤੇ ਹੱਲ ਟ੍ਰੈਕ ਕਰੋ",
    },
  },
  "outdoor-ad": {
    href: "/task/outdoor-ad",
    icon: <ImageIcon className="h-5 w-5" />,
    iconGradient: "from-blue-500 to-blue-700",
    hoverBorderClassName: "hover:border-blue-200",
    chevronClassName: "text-blue-500",
    chevronBgClassName: "bg-blue-50 group-hover:bg-blue-100",
    testId: "task-card-outdoor-ad",
    title: { en: "Outdoor Advertisement", hi: "आउटडोर विज्ञापन", pa: "ਆਊਟਡੋਰ ਇਸ਼ਤਿਹਾਰ" },
    description: {
      en: "Submit ad location details",
      hi: "विज्ञापन स्थान विवरण जमा करें",
      pa: "ਇਸ਼ਤਿਹਾਰ ਸਥਾਨ ਵੇਰਵੇ ਜਮ੍ਹਾਂ ਕਰੋ",
    },
  },
  "gov-school": {
    href: "/task/gov-school",
    icon: <GraduationCap className="h-5 w-5" />,
    iconGradient: "from-green-500 to-emerald-600",
    hoverBorderClassName: "hover:border-green-200",
    chevronClassName: "text-green-500",
    chevronBgClassName: "bg-green-50 group-hover:bg-green-100",
    testId: "task-card-gov-school",
    title: { en: "Gov School Work", hi: "सरकारी स्कूल कार्य", pa: "ਸਰਕਾਰੀ ਸਕੂਲ ਕੰਮ" },
    description: {
      en: "Report government school issues",
      hi: "सरकारी स्कूल की समस्याएं रिपोर्ट करें",
      pa: "ਸਰਕਾਰੀ ਸਕੂਲ ਦੀਆਂ ਸਮੱਸਿਆਵਾਂ ਰਿਪੋਰਟ ਕਰੋ",
    },
  },
  appointment: {
    href: "/task/appointment",
    icon: <CalendarCheck className="h-5 w-5" />,
    iconGradient: "from-purple-500 to-indigo-600",
    hoverBorderClassName: "hover:border-purple-200",
    chevronClassName: "text-purple-500",
    chevronBgClassName: "bg-purple-50 group-hover:bg-purple-100",
    testId: "task-card-appointment",
    title: { en: "Appointment", hi: "मुलाकात", pa: "ਮੁਲਾਕਾਤ" },
    description: {
      en: "Request an appointment and track your scheduled meetings",
      hi: "मुलाकात का अनुरोध करें और अपनी निर्धारित बैठकों को ट्रैक करें",
      pa: "ਮੁਲਾਕਾਤ ਦੀ ਬੇਨਤੀ ਕਰੋ ਅਤੇ ਆਪਣੀਆਂ ਤਹਿ ਮੀਟਿੰਗਾਂ ਨੂੰ ਟਰੈਕ ਕਰੋ",
    },
  },
  "event-venue": {
    href: "/task/event-venue",
    icon: <Building2 className="h-5 w-5" />,
    iconGradient: "from-emerald-500 to-teal-600",
    hoverBorderClassName: "hover:border-emerald-200",
    chevronClassName: "text-emerald-600",
    chevronBgClassName: "bg-emerald-50 group-hover:bg-emerald-100",
    testId: "task-card-event-venue",
    title: { en: "Event Venues", hi: "इवेंट स्थल", pa: "ਇਵੈਂਟ ਸਥਾਨ" },
    description: {
      en: "Request booking for event venues with unit, date, time & map",
      hi: "यूनिट चुनकर इवेंट स्थल की बुकिंग रिक्वेस्ट भेजें",
      pa: "ਯੂਨਿਟ ਚੁਣ ਕੇ ਇਵੈਂਟ ਸਥਾਨ ਦੀ ਬੁਕਿੰਗ ਬੇਨਤੀ ਭੇਜੋ",
    },
  },
  "tirth-yatra": {
    href: "/task/tirth-yatra",
    icon: <Users className="h-5 w-5" />,
    iconGradient: "from-emerald-600 to-teal-700",
    hoverBorderClassName: "hover:border-emerald-200",
    chevronClassName: "text-emerald-600",
    chevronBgClassName: "bg-emerald-50 group-hover:bg-emerald-100",
    testId: "task-card-tirth-yatra",
    title: { en: "Tirth Yatra", hi: "तीर्थ यात्रा", pa: "ਤੀਰਥ ਯਾਤਰਾ" },
    description: {
      en: "Apply for pilgrimage journey with or without family",
      hi: "तीर्थ यात्रा के लिए आवेदन करें (परिवार सहित या अकेले)",
      pa: "ਤੀਰਥ ਯਾਤਰਾ ਲਈ ਅਰਜ਼ੀ ਦਿਓ (ਪਰਿਵਾਰ ਸਮੇਤ ਜਾਂ ਇਕੱਲੇ)",
    },
  },
  "voter-registration": {
    href: "/task/voter-registration",
    icon: <Vote className="h-5 w-5" />,
    iconGradient: "from-blue-500 to-cyan-600",
    hoverBorderClassName: "hover:border-blue-200",
    chevronClassName: "text-blue-500",
    chevronBgClassName: "bg-blue-50 group-hover:bg-blue-100",
    testId: "task-card-voter-registration",
    title: { en: "Voter Registration", hi: "मतदाता पंजीकरण", pa: "ਵੋਟਰ ਰਜਿਸਟ੍ਰੇਸ਼ਨ" },
    description: {
      en: "Personal details, address, document upload & OTP verification",
      hi: "व्यक्तिगत जानकारी, पता, दस्तावेज़ अपलोड और OTP सत्यापन",
      pa: "ਨਿੱਜੀ ਜਾਣਕਾਰੀ, ਪਤਾ, ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਅਤੇ OTP ਤਸਦੀਕ",
    },
  },
  bla: {
    href: "/task/bla",
    icon: <Users className="h-5 w-5" />,
    iconGradient: "from-indigo-600 to-blue-600",
    hoverBorderClassName: "hover:border-indigo-200",
    chevronClassName: "text-indigo-600",
    chevronBgClassName: "bg-indigo-50 group-hover:bg-indigo-100",
    testId: "task-card-bla",
    title: { en: "Booth Level Agent (BLA)", hi: "Booth Level Agent (BLA)", pa: "ਬੂਥ ਲੈਵਲ ਏਜੰਟ (BLA)" },
    description: {
      en: "Register BLAs by capturing Aadhaar & Voter Card and linking to booth",
      hi: "BLO का Aadhaar और Voter Card लेकर Booth wise BLA register करें",
      pa: "BLO ਦਾ ਆਧਾਰ ਅਤੇ ਵੋਟਰ ਕਾਰਡ ਲੈ ਕੇ ਬੂਥ ਵਾਇਜ਼ BLA ਰਜਿਸਟਰ ਕਰੋ",
    },
  },
};

function FixedTaskCard({ slug, language, featured = false }: { slug: string; language: Language; featured?: boolean }) {
  const meta = FIXED_TASK_META[slug];
  if (!meta) return null;
  return (
    <DashboardTaskCard
      href={meta.href}
      title={meta.title[language]}
      description={meta.description[language]}
      icon={meta.icon}
      iconGradient={meta.iconGradient}
      hoverBorderClassName={meta.hoverBorderClassName}
      chevronClassName={meta.chevronClassName}
      chevronBgClassName={meta.chevronBgClassName}
      testId={meta.testId}
      featured={featured}
    />
  );
}

function LeaderboardMiniCard({
  href,
  title,
  emptyLabel,
  icon,
  cardGradient,
  entries,
  userId,
  testId,
  entryTestIdPrefix,
  scoreClassName = "text-yellow-300",
}: {
  href: string;
  title: string;
  emptyLabel: string;
  icon: ReactNode;
  cardGradient: string;
  entries: LeaderboardEntry[];
  userId: string;
  testId: string;
  entryTestIdPrefix: string;
  scoreClassName?: string;
}) {
  return (
    <Link href={href}>
      <Card className={`cursor-pointer border-0 text-white hover:shadow-lg transition-shadow h-full bg-gradient-to-br ${cardGradient}`} data-testid={testId}>
        <CardContent className="p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            {icon}
            <h3 className="font-semibold text-sm text-white">{title}</h3>
          </div>
          {entries.length > 0 ? (
            <div className="space-y-1.5">
              {entries.map((entry, i) => {
                const isMe = entry.userId === userId;
                const rankIcon =
                  i === 0 ? (
                    <Crown className="h-3 w-3 text-yellow-300" />
                  ) : (
                    <Medal className={`h-3 w-3 ${i === 1 ? "text-gray-300" : "text-amber-600"}`} />
                  );
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 ${isMe ? "bg-white/15" : "bg-white/5"}`}
                    data-testid={`${entryTestIdPrefix}-${i + 1}`}
                  >
                    {rankIcon}
                    <Avatar className="w-5 h-5">
                      {entry.hasPhoto ? (
                        <AvatarImage src={photoUrl(entry.userId)} />
                      ) : (
                        <AvatarFallback className="bg-white/20 text-white text-[8px]">{entry.name.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-[10px] font-medium truncate flex-1">{entry.name.split(" ")[0]}</span>
                    <span className={`text-[10px] font-bold ${scoreClassName}`}>{entry.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/60">{emptyLabel}</p>
          )}
        </CardContent>
      </Card>
    </Link>
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

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories } = useQuery<TaskCategory[]>({
    queryKey: ["/api/app/task-categories"],
  });

  const ALL_FIXED_SLUGS = ["nasha-viruddh-yuddh", "road-report", "harr-sirr-te-chatt", "sukh-dukh-saanjha-karo", "sunwai", "outdoor-ad", "gov-school", "appointment", "event-venue", "tirth-yatra", "mahila-samman-rashi", "voter-registration", "bla"];
  const slugsInAnyCategory = new Set(categories?.flatMap((c) => c.fixedTaskSlugs ?? []) ?? []);
  const uncategorizedFixedSlugs = ALL_FIXED_SLUGS.filter((slug) => !slugsInAnyCategory.has(slug));

  const { data: tasks, isLoading } = useQuery<TaskConfig[]>({
    queryKey: ["/api/app/tasks"],
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
  const volunteerMappingTask = tasks?.find((t) => t.name === "Volunteer Mapping");

  const DASHBOARD_TOP_SLUGS = new Set(["outdoor-ad"]);
  const DASHBOARD_BOTTOM_SLUGS = new Set(["bla", "mahila-samman-rashi"]);

  function filterCategoryFixedSlugs(slugs: string[]) {
    return slugs.filter((slug) => !DASHBOARD_TOP_SLUGS.has(slug) && !DASHBOARD_BOTTOM_SLUGS.has(slug));
  }

  function filterCategoryTasks(taskList: TaskConfig[]) {
    return taskList.filter((t) => t.name !== "Volunteer Mapping");
  }

  /** Fixed slugs + dynamic tasks list – pinned tasks (VM, outdoor, BLA, MSR) shown separately on dashboard. */
  function renderTaskList(fixedSlugs: string[], taskList: TaskConfig[]) {
    const fixedSlugsFiltered = fixedSlugs.filter(
      (slug) => !DASHBOARD_TOP_SLUGS.has(slug) && !DASHBOARD_BOTTOM_SLUGS.has(slug),
    );
    const dynamicTasks = filterCategoryTasks(taskList);
    const hasFixed = fixedSlugsFiltered.length > 0;
    const hasDynamic = dynamicTasks.length > 0;
    return (
      <>
        {fixedSlugsFiltered.map((slug) => (
          <FixedTaskCard key={slug} slug={slug} language={language} />
        ))}
        {isLoading && (
          <>
            <Skeleton className="h-[68px] w-full rounded-lg" />
            <Skeleton className="h-[68px] w-full rounded-lg" />
          </>
        )}
        {dynamicTasks.map((task) => {
          const IconComponent = iconMap[task.icon || "ClipboardList"] || ClipboardList;
          const color = task.color || "#3b82f6";
          return (
            <Link key={task.id} href={getTaskRoute(task)}>
              <Card className="group cursor-pointer bg-white border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200" data-testid={`task-card-${task.id}`}>
                <CardContent className="p-4 flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                  >
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-800">{getTaskName(language, task)}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{getTaskDesc(language, task)}</p>
                  </div>
                  <div className="shrink-0">
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onProfile} className="flex items-center gap-3 min-w-0 text-left">
              <Avatar className="w-11 h-11 border border-white/20 shrink-0">
                {user.selfPhoto ? (
                  <AvatarImage src={user.selfPhoto} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-slate-700 text-white text-base font-semibold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <h1 className="font-semibold text-base leading-tight truncate flex items-center gap-1" data-testid="text-user-name">
                  {user.name}
                  {user.isApproved && (
                    <BadgeCheck className="h-4 w-4 text-amber-400 shrink-0" data-testid="badge-verified-tick" />
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/90" data-testid="text-user-role">
                    {roleLabel}
                  </span>
                  {user.mappedAreaName && (
                    <span className="text-xs text-slate-300 truncate" data-testid="text-user-area">
                      {user.mappedAreaName}
                    </span>
                  )}
                </div>
              </div>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={onProfile}
                className="relative flex items-center justify-center w-10 h-10"
                data-testid="button-profile-completion"
              >
                <CircularProgress percentage={completion.percentage} size={36} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
                  {completion.percentage}%
                </span>
              </button>
              <Link href="/chat">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9" data-testid="button-chat">
                  <MessageCircle className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <LanguageSwitcher variant="ghost" className="text-white" iconClassName="text-white" />
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9" onClick={onLogout} data-testid="button-logout">
                <LogOut className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
          <a
            href={MSRP_PUNJAB_VMAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block"
            data-testid="link-msrp-punjab-vmap"
          >
            <div className="flex items-center gap-2 rounded-lg bg-white text-slate-800 px-3 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors">
              <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="flex-1 truncate">
                {language === "hi" ? "मतदाता मैपिंग" : language === "pa" ? "ਵੋਟਰ ਮੈਪਿੰਗ" : "Voter Mapping"}
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          </a>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-8">
      {!isComplete && (
        <div className="pt-4">
          <button
            onClick={onProfile}
            className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 flex items-center gap-3 text-left hover:bg-amber-100/80 transition-colors"
            data-testid="button-profile-banner"
          >
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{t("completeProfile")}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {completion.filledCount} {t("of")} {completion.totalCount} {t("fieldsDone")}
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded-full">
              {completion.percentage}%
            </span>
          </button>
        </div>
      )}

      <div className={`space-y-6 ${!isComplete ? "pt-4" : "pt-5"}`}>

        {!isMahilaSakhi && activeSurveys && activeSurveys.length > 0 && (
          <section>
            <SectionTitle
              title={language === "hi" ? "सर्वेक्षण" : language === "pa" ? "ਸਰਵੇਖਣ" : "Pending Surveys"}
            />
            <div className="space-y-2">
              {activeSurveys.map((survey) => (
                <Link key={survey.id} href={`/survey/${survey.id}`}>
                  <Card className="group cursor-pointer border-emerald-100 bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-200" data-testid={`survey-card-${survey.id}`}>
                    <CardContent className="p-4 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                        <ClipboardCheck className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-slate-900 leading-tight">
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
                      <ChevronRight className="h-4 w-4 text-emerald-600 shrink-0" />
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
            <LeaderboardMiniCard
              href="/leaderboard"
              title={language === "hi" ? "लीडरबोर्ड" : language === "pa" ? "ਲੀਡਰਬੋਰਡ" : "Leaderboard"}
              emptyLabel={language === "hi" ? "रैंकिंग देखें" : language === "pa" ? "ਰੈਂਕਿੰਗ ਵੇਖੋ" : "View rankings"}
              icon={<Trophy className="h-4.5 w-4.5 text-yellow-300" />}
              cardGradient="from-indigo-500 to-purple-600"
              entries={overallTop3}
              userId={user.id}
              testId="card-leaderboard"
              entryTestIdPrefix="dashboard-top"
              scoreClassName="text-yellow-300"
            />
            <LeaderboardMiniCard
              href="/survey-leaderboard"
              title={language === "hi" ? "सर्वे बोर्ड" : language === "pa" ? "ਸਰਵੇ ਬੋਰਡ" : "Survey Board"}
              emptyLabel={language === "hi" ? "सर्वे रैंकिंग" : language === "pa" ? "ਸਰਵੇ ਰੈਂਕਿੰਗ" : "Survey rankings"}
              icon={<ClipboardCheck className="h-4.5 w-4.5 text-emerald-200" />}
              cardGradient="from-emerald-500 to-teal-600"
              entries={surveyTop3}
              userId={user.id}
              testId="card-survey-leaderboard"
              entryTestIdPrefix="survey-top"
              scoreClassName="text-emerald-200"
            />
          </div>
        </section>
        )}

        <section>
          <SectionTitle title={t("availableTasks")} />

          <div className="space-y-2">
          {volunteerMappingTask && (() => {
            const VmIcon = iconMap[volunteerMappingTask.icon || "Users"] || Users;
            const vmColor = volunteerMappingTask.color || "#3b82f6";
            return (
              <Link href="/task/volunteer-mapping">
                <Card className="group cursor-pointer bg-white border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 border-2 border-blue-100" data-testid="task-card-volunteer-mapping-priority">
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${vmColor}, ${vmColor}dd)` }}
                    >
                      <VmIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-800">{getTaskName(language, volunteerMappingTask)}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{getTaskDesc(language, volunteerMappingTask)}</p>
                    </div>
                    <div className="shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })()}

          <FixedTaskCard slug="outdoor-ad" language={language} featured />

          {!isMahilaSakhi && categories && categories.length > 0 && (
            <>
              <div className="space-y-2">
                <CategoryPickerItem
                  selected={selectedCategoryId === null}
                  onClick={() => setSelectedCategoryId(null)}
                  icon={<LayoutGrid className="h-5 w-5" />}
                  iconGradient="from-slate-500 to-slate-600"
                  title={language === "hi" ? "सभी" : language === "pa" ? "ਸਭ" : "All"}
                  subtitle={language === "hi" ? "सभी कार्य देखें" : language === "pa" ? "ਸਭ ਕੰਮ ਵੇਖੋ" : "View all tasks"}
                />
                {selectedCategoryId === null && (
                  <div className="space-y-2">
                    {renderTaskList(
                      filterCategoryFixedSlugs(uncategorizedFixedSlugs),
                      filterCategoryTasks(tasks?.filter((t) => !(t as any).categoryId) ?? []),
                    )}
                  </div>
                )}
              </div>

              {categories.map((cat) => {
                const label = getLocalizedText(language, cat.name, cat.nameHi || undefined, cat.namePa || undefined);
                const isSelected = selectedCategoryId === cat.id;
                const catSlugs = filterCategoryFixedSlugs(cat.fixedTaskSlugs ?? []);
                const catTasks = filterCategoryTasks(tasks?.filter((t) => (t as any).categoryId === cat.id) ?? []);
                const fixedNames = catSlugs.map((slug) => getFixedTaskLabel(slug, language));
                const dynamicNames = catTasks.map((t) => getTaskName(language, t));
                const allNames = [...fixedNames, ...dynamicNames].filter(Boolean);
                const hintText =
                  allNames.length > 0
                    ? allNames.join(", ")
                    : language === "hi"
                    ? "इस श्रेणी के कार्य"
                    : language === "pa"
                    ? "ਇਸ ਸ਼੍ਰੇਣੀ ਦੇ ਕੰਮ"
                    : "Tasks in this category";
                return (
                  <div key={cat.id} className="space-y-2">
                    <CategoryPickerItem
                      selected={isSelected}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      icon={<FolderTree className="h-5 w-5" />}
                      iconGradient="from-blue-500 to-indigo-600"
                      title={label}
                      subtitle={hintText}
                    />
                    {isSelected && (
                      <div className="space-y-2">
                        {renderTaskList(catSlugs, catTasks)}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {(!categories || categories.length === 0) && !isMahilaSakhi &&
            renderTaskList(
              filterCategoryFixedSlugs(uncategorizedFixedSlugs),
              filterCategoryTasks(tasks?.filter((t) => !(t as any).categoryId) ?? []),
            )}

          <DashboardTaskCard
            href="/task/bla"
            title={getFixedTaskLabel("bla", language)}
            description={
              language === "hi"
                ? "बूथ चुनें, BLA चुनें, OTP और दस्तावेज़ से पंजीकरण"
                : language === "pa"
                ? "ਬੂਥ ਚੁਣੋ, BLA ਚੁਣੋ, OTP ਨਾਲ ਤਸਦੀਕ ਕਰੋ ਅਤੇ ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰੋ"
                : "Select booth & BLA, verify mobile, upload documents"
            }
            icon={<Vote className="h-5 w-5" />}
            iconGradient="from-indigo-600 to-violet-600"
            hoverBorderClassName="hover:border-indigo-200"
            chevronClassName="text-indigo-600"
            chevronBgClassName="bg-indigo-50 group-hover:bg-indigo-100"
            testId="task-card-bla-priority"
          />

          {isMahilaSakhi && (
            <DashboardTaskCard
              href="/task/mahila-samman-punjab-gov"
              title={
                language === "hi"
                  ? "महिला सम्मान राशि (पंजाब सरकार)"
                  : language === "pa"
                  ? "ਮਹਿਲਾ ਸਨਮਾਨ ਰਾਸ਼ੀ (ਪੰਜਾਬ ਸਰਕਾਰ)"
                  : "Mahila Samman Rashi through Punjab Gov"
              }
              description={
                language === "hi"
                  ? "हर महिला को ₹1,000/महीना; SC/ST को ₹1,500/महीना"
                  : language === "pa"
                  ? "ਹਰ ਔਰਤ ਨੂੰ ₹1,000/ਮਹੀਨਾ; SC/ST ਨੂੰ ₹1,500/ਮਹੀਨਾ"
                  : "Every woman ₹1,000/month; SC/ST ₹1,500/month"
              }
              icon={<Users className="h-5 w-5" />}
              iconGradient="from-purple-600 to-pink-600"
              hoverBorderClassName="hover:border-purple-200"
              chevronClassName="text-purple-600"
              chevronBgClassName="bg-purple-50 group-hover:bg-purple-100"
              testId="task-card-mahila-samman-punjab"
            />
          )}

          {!isMahilaSakhi && (
            <DashboardTaskCard
              href="/task/mahila-samman-rashi"
              title={language === "hi" ? "महिला सम्मान राशि" : language === "pa" ? "ਮਹਿਲਾ ਸਨਮਾਨ ਰਾਸ਼ੀ" : "Mahila Samman Rashi"}
              description={
                language === "hi"
                  ? "हर महिला को ₹1,000/महीना; SC/ST महिलाओं को ₹1,500/महीना"
                  : language === "pa"
                  ? "ਹਰ ਔਰਤ ਨੂੰ ₹1,000/ਮਹੀਨਾ; SC/ST ਔਰਤਾਂ ਨੂੰ ₹1,500/ਮਹੀਨਾ"
                  : "₹1,000/month for every woman; ₹1,500 for SC/ST women"
              }
              icon={<Users className="h-5 w-5" />}
              iconGradient="from-purple-600 to-pink-600"
              hoverBorderClassName="hover:border-purple-200"
              chevronClassName="text-purple-600"
              chevronBgClassName="bg-purple-50 group-hover:bg-purple-100"
              testId="task-card-mahila-samman"
            />
          )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
