import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Crown, ClipboardCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { AppUser } from "@shared/schema";

interface SurveyLeaderboardProps {
  user: AppUser;
  onBack: () => void;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  hasPhoto: boolean;
  count: number;
}

function photoUrl(userId: string) {
  return `/api/app/user/${userId}/photo`;
}

const RANK_COLORS = {
  1: { ring: "ring-yellow-400", bg: "from-yellow-400 to-amber-500", pillar: "from-yellow-300 to-yellow-400", text: "text-yellow-700", badge: "bg-yellow-400 text-yellow-900" },
  2: { ring: "ring-gray-300", bg: "from-gray-300 to-gray-400", pillar: "from-gray-200 to-gray-300", text: "text-gray-600", badge: "bg-gray-300 text-gray-700" },
  3: { ring: "ring-amber-600", bg: "from-amber-500 to-amber-700", pillar: "from-amber-100 to-amber-200", text: "text-amber-700", badge: "bg-amber-600 text-white" },
};

function PodiumSection({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  const top3 = entries.filter((e) => e.count > 0).slice(0, 3);
  if (top3.length === 0) return null;

  const podiumConfig: Record<number, { avatarSize: string; pillarH: string; mt: string }> = {
    1: { avatarSize: "w-20 h-20", pillarH: "h-28", mt: "mt-0" },
    2: { avatarSize: "w-14 h-14", pillarH: "h-20", mt: "mt-6" },
    3: { avatarSize: "w-12 h-12", pillarH: "h-16", mt: "mt-8" },
  };

  const displayOrder = top3.length === 1
    ? [{ entry: top3[0], rank: 1 }]
    : top3.length === 2
    ? [{ entry: top3[1], rank: 2 }, { entry: top3[0], rank: 1 }]
    : [{ entry: top3[1], rank: 2 }, { entry: top3[0], rank: 1 }, { entry: top3[2], rank: 3 }];

  return (
    <div className="relative pt-4 pb-2">
      <div className="flex items-end justify-center gap-3">
        {displayOrder.map(({ entry, rank }) => {
          const colors = RANK_COLORS[rank as 1 | 2 | 3];
          const cfg = podiumConfig[rank];
          const isMe = entry.userId === currentUserId;

          return (
            <div key={entry.userId} className={`flex flex-col items-center ${cfg.mt} flex-1 max-w-[120px]`} data-testid={`survey-podium-rank-${rank}`}>
              <div className="relative mb-1">
                {rank === 1 && (
                  <Crown className="h-7 w-7 text-yellow-500 mx-auto mb-0.5 drop-shadow" />
                )}
                <Avatar className={`${cfg.avatarSize} ring-4 ${colors.ring} ${isMe ? "ring-blue-500" : ""} shadow-lg`}>
                  {entry.hasPhoto ? (
                    <AvatarImage src={photoUrl(entry.userId)} />
                  ) : (
                    <AvatarFallback className={`text-lg font-bold bg-gradient-to-br ${colors.bg} text-white`}>
                      {entry.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <p className={`text-xs font-semibold text-center w-full truncate px-1 ${isMe ? "text-blue-600" : "text-slate-700"}`} data-testid={`survey-podium-name-${rank}`}>
                {entry.name}
              </p>
              <div className={`${colors.badge} px-2.5 py-0.5 rounded-full text-xs font-bold mt-0.5 shadow-sm`}>
                {entry.count}
              </div>
              <div className={`w-full ${cfg.pillarH} mt-2 rounded-t-lg bg-gradient-to-t ${colors.pillar} flex items-center justify-center shadow-inner border border-white/50`}>
                <span className={`text-2xl font-black ${colors.text} opacity-60`}>{rank}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-1 bg-gradient-to-r from-gray-200 via-emerald-200 to-gray-200 rounded-full" />
    </div>
  );
}

export default function SurveyLeaderboard({ user, onBack }: SurveyLeaderboardProps) {
  const { language } = useTranslation();

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/app/survey-leaderboard"],
  });

  const allEntries = entries || [];
  const totalUsers = allEntries.length;
  const topCount = allEntries.filter((e) => e.count > 0).slice(0, 3).length;
  const restEntries = allEntries.slice(topCount);
  const myRank = allEntries.findIndex((e) => e.userId === user.id) + 1;

  const title = language === "hi" ? "सर्वे लीडरबोर्ड" : language === "pa" ? "ਸਰਵੇ ਲੀਡਰਬੋਰਡ" : "Survey Leaderboard";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack} data-testid="button-survey-leaderboard-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-200" />
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
        </div>

        {myRank > 0 && (
          <div className="mt-3 bg-white/15 backdrop-blur rounded-lg px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border-2 border-white/30">
                {user.selfPhoto ? <AvatarImage src={user.selfPhoto} /> : <AvatarFallback className="bg-white/20 text-white text-xs">{user.name.charAt(0)}</AvatarFallback>}
              </Avatar>
              <span className="text-sm font-medium">{language === "hi" ? "आपकी रैंक" : language === "pa" ? "ਤੁਹਾਡੀ ਰੈਂਕ" : "Your Rank"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black">#{myRank}</span>
              <span className="text-xs text-white/70">/ {totalUsers}</span>
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="p-4 space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : allEntries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardCheck className="h-16 w-16 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">{language === "hi" ? "अभी कोई डेटा नहीं" : language === "pa" ? "ਅਜੇ ਕੋਈ ਡਾਟਾ ਨਹੀਂ" : "No data yet"}</p>
          <p className="text-sm mt-1">{language === "hi" ? "सर्वे पूरा करके पहले बनें!" : language === "pa" ? "ਸਰਵੇ ਪੂਰਾ ਕਰਕੇ ਪਹਿਲੇ ਬਣੋ!" : "Complete a survey to be the first!"}</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <Card className="overflow-visible">
            <CardContent className="pt-4 pb-2 px-2">
              <PodiumSection entries={allEntries} currentUserId={user.id} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {language === "hi" ? "सभी प्रतिभागी" : language === "pa" ? "ਸਾਰੇ ਭਾਗੀਦਾਰ" : "All Participants"}
            </span>
            <span className="text-xs text-slate-400">
              {language === "hi" ? `कुल ${totalUsers}` : language === "pa" ? `ਕੁੱਲ ${totalUsers}` : `Total ${totalUsers}`}
            </span>
          </div>

          <div className="space-y-2">
            {restEntries.map((entry, i) => {
              const rank = topCount + i + 1;
              const isMe = entry.userId === user.id;
              return (
                <Card key={entry.userId} className={isMe ? "border-emerald-300 bg-emerald-50" : ""} data-testid={`survey-leaderboard-row-${rank}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 text-center flex-shrink-0">
                      <span className={`text-sm font-bold ${isMe ? "text-emerald-600" : "text-slate-500"}`}>#{rank}</span>
                    </div>
                    <Avatar className={`w-10 h-10 ${isMe ? "ring-2 ring-emerald-400" : ""}`}>
                      {entry.hasPhoto ? <AvatarImage src={photoUrl(entry.userId)} /> : <AvatarFallback className="bg-slate-200 text-sm font-semibold">{entry.name.charAt(0).toUpperCase()}</AvatarFallback>}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? "text-emerald-700" : "text-slate-800"}`}>{entry.name}</p>
                      {isMe && <span className="text-[10px] text-emerald-500 font-medium">{language === "hi" ? "आप" : language === "pa" ? "ਤੁਸੀਂ" : "You"}</span>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-lg font-bold ${isMe ? "text-emerald-600" : "text-slate-700"}`}>{entry.count}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
