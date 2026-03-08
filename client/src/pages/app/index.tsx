import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcherInline } from "@/components/language-switcher";
import { UnitSelector } from "@/components/unit-selector";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import AppLogin from "./login";
import AppRegister from "./register";
import ProfilePage from "./profile";
import TaskHome from "./task-home";
import TaskCscReport from "./task-csc-report";
import TaskVolunteerMapping from "./task-volunteer-mapping";
import TaskSupporterMapping from "./task-supporter-mapping";
import TaskDynamicForm from "./task-dynamic";
import TaskHstc from "./task-hstc";
import TaskSdsk from "./task-sdsk";
import TaskSunwai from "./task-sunwai";
import TaskNvy from "./task-nvy";
import TaskOutdoorAd from "./task-outdoor-ad";
import TaskGovSchool from "./task-gov-school";
import TaskAppointment from "./task-appointment";
import TaskEventVenue from "./task-event-venue";
import TaskTirthYatra from "./task-tirth-yatra";
import TaskMahilaSamman from "./task-mahila-samman";
import TaskRoad from "./task-road";
import TaskVoterRegistration from "./task-voter-registration";
import SurveyForm from "./survey-form";
import SurveyLeaderboard from "./survey-leaderboard";
import Leaderboard from "./leaderboard";
import GroupChat from "./group-chat";
import { Loader2, LogIn, UserPlus, Mail, KeyRound, ArrowRight, ArrowLeft, MapPin, Phone, Smartphone } from "lucide-react";
import type { AppUser } from "@shared/schema";
import { getProfileCompletion } from "@/lib/profile-completion";
import { MinisterImageWithFallback, MinisterTextBlock } from "@/components/minister-image";

function isIndianMobile(input: string): boolean {
  const cleaned = input.replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

function detectInputType(input: string): "email" | "mobile" | "unknown" {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return "email";
  if (isIndianMobile(trimmed)) return "mobile";
  return "unknown";
}

type AuthState = "loading" | "welcome" | "login" | "register_village" | "register_otp" | "register" | "authenticated";

export default function VolunteerPortal() {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingMobile, setPendingMobile] = useState<string | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");
  const [regIdentifier, setRegIdentifier] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpStep, setRegOtpStep] = useState<"input" | "otp">("input");
  const [regChannel, setRegChannel] = useState<"email" | "sms" | null>(null);
  const [pendingUnit, setPendingUnit] = useState<{ villageId: string; villageName: string } | null>(null);
  const [existingUserDialog, setExistingUserDialog] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const cleanEmail = (e: string) => e.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, '');
  const cleanMobile = (m: string) => m.replace(/\D/g, "").replace(/^91/, "");

  const regSendOtpMutation = useMutation({
    mutationFn: async (input: string) => {
      const type = detectInputType(input);
      const body: any = { context: "register" };
      if (type === "mobile") {
        body.mobile = cleanMobile(input);
      } else {
        body.email = cleanEmail(input);
      }
      const res = await apiRequest("POST", "/api/app/send-otp", body);
      return res.json();
    },
    onSuccess: (data) => {
      setRegOtpSent(true);
      setRegChannel(data.channel || (data.smsSent ? "sms" : "email"));
      setRegOtpStep("otp");
      const desc = data.channel === "sms" || data.smsSent
        ? "Check your phone for the OTP code"
        : "Check your email for the OTP code";
      toast({ title: t('otpSent'), description: desc });
    },
    onError: async (error: any) => {
      try {
        if (error?.message?.includes("409") || error?.status === 409) {
          setExistingUserDialog(true);
          return;
        }
      } catch {}
      toast({ title: t('error'), description: t('failedToSendOtp'), variant: "destructive" });
    },
  });

  const regVerifyOtpMutation = useMutation({
    mutationFn: async ({ input, otpCode }: { input: string; otpCode: string }) => {
      const type = detectInputType(input);
      const body: any = { otp: otpCode };
      if (type === "mobile") {
        body.mobile = cleanMobile(input);
      } else {
        body.email = cleanEmail(input);
      }
      const res = await apiRequest("POST", "/api/app/verify-otp", body);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.exists) {
        setExistingUserDialog(true);
      } else {
        if (data.email) setPendingEmail(data.email);
        if (data.mobile) setPendingMobile(data.mobile);
        setAuthState("register");
      }
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("401")
        ? t('invalidOrExpiredOtp')
        : "Verification failed. Please check your connection and try again.";
      toast({ title: t('error'), description: msg, variant: "destructive" });
    },
  });

  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: subscribePush } = usePushNotifications(user?.id || null);

  const requestPushPermission = useCallback(async () => {
    if (pushSupported && !pushSubscribed) {
      setTimeout(() => subscribePush(), 2000);
    }
  }, [pushSupported, pushSubscribed, subscribePush]);

  useEffect(() => {
    const storedUser = localStorage.getItem("appUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setAuthState("authenticated");
        if (parsed.id) {
          fetch(`/api/app/user/${parsed.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(freshUser => {
              if (freshUser) {
                localStorage.setItem("appUser", JSON.stringify(freshUser));
                setUser(freshUser);
              }
            })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem("appUser");
        setAuthState("welcome");
      }
    } else {
      setAuthState("welcome");
    }
  }, []);

  useEffect(() => {
    if (authState === "authenticated" && user?.id) {
      requestPushPermission();
    }
  }, [authState, user?.id, requestPushPermission]);

  const handleLogin = (loggedInUser: AppUser) => {
    localStorage.setItem("appUser", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    setAuthState("authenticated");
    setLocation("/");
  };

  const handleNeedRegistration = (emailAddr: string, name?: string) => {
    toast({
      title: t('notRegistered'),
      description: t('notRegisteredDesc'),
    });
    setPendingEmail(emailAddr);
    setAuthState("register_village");
  };

  const handleRegistrationComplete = (registeredUser: AppUser) => {
    localStorage.setItem("appUser", JSON.stringify(registeredUser));
    setUser(registeredUser);
    setAuthState("authenticated");
    setLocation("/");
  };

  const handleBackToWelcome = () => {
    setPendingEmail(null);
    setPendingMobile(null);
    setSelectedVillageId("");
    setSelectedVillageName("");
    setRegIdentifier("");
    setRegOtp("");
    setRegOtpSent(false);
    setRegOtpStep("input");
    setRegChannel(null);
    setAuthState("welcome");
  };

  const handleLogout = () => {
    localStorage.removeItem("appUser");
    setUser(null);
    setAuthState("welcome");
    setLocation("/");
  };

  const handleProfileUpdate = (updatedUser: AppUser) => {
    localStorage.setItem("appUser", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleRegSendOtp = () => {
    const trimmed = regIdentifier.trim();
    const type = detectInputType(trimmed);
    if (type === "unknown") {
      toast({ title: t('invalid'), description: "Please enter a valid email address or 10-digit mobile number", variant: "destructive" });
      return;
    }
    regSendOtpMutation.mutate(trimmed);
  };

  const handleRegVerifyOtp = () => {
    const cleanOtp = regOtp.replace(/\D/g, '').trim();
    if (!/^\d{4}$/.test(cleanOtp)) {
      toast({ title: t('invalid'), description: t('invalidOtp'), variant: "destructive" });
      return;
    }
    regVerifyOtpMutation.mutate({ input: regIdentifier.trim(), otpCode: cleanOtp });
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <h1 className="text-xl font-semibold">{t('patialaRural')}</h1>
          <p className="text-white/70 text-sm mt-1">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (authState === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl overflow-hidden shadow-xl border-2 border-white/20 bg-white">
            <div className="w-full min-h-[220px]">
              <MinisterImageWithFallback fullImage />
            </div>
            <MinisterTextBlock />
          </div>
          <Card className="shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl" data-testid="text-app-title">{t('patialaRural')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full h-14 text-base"
                onClick={() => setAuthState("login")}
                data-testid="button-login"
              >
                <LogIn className="mr-3 h-5 w-5" /> {t('login')}
              </Button>
              <LanguageSwitcherInline className="mt-3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (authState === "login") {
    return <AppLogin onLogin={handleLogin} onNeedRegistration={handleNeedRegistration} onBack={handleBackToWelcome} />;
  }

  if (authState === "register_village") {
    const handleConfirmUnit = () => {
      if (!pendingUnit) return;
      setSelectedVillageId(pendingUnit.villageId);
      setSelectedVillageName(pendingUnit.villageName);
      setPendingUnit(null);
      if (pendingEmail || pendingMobile) {
        setAuthState("register");
      } else {
        setRegOtpStep("input");
        setRegIdentifier("");
        setRegOtp("");
        setRegOtpSent(false);
        setRegChannel(null);
        setAuthState("register_otp");
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="pt-6 pb-4 space-y-3">
            <div className="space-y-1" data-testid="progress-bar-village">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{selectedVillageId ? 1 : 0}/1</span>
                <span className="text-xs font-medium text-slate-600">{selectedVillageId ? 100 : 0}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: selectedVillageId ? '100%' : '0%' }} />
              </div>
            </div>
            <UnitSelector
              title={t('selectYourUnit')}
              subtitle={t('chooseVillageOrWard')}
              onSelect={(unit) => setPendingUnit(unit)}
            />
            <Button variant="ghost" className="w-full" onClick={handleBackToWelcome} data-testid="button-village-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={!!pendingUnit} onOpenChange={(open) => { if (!open) setPendingUnit(null); }}>
          <DialogContent className="max-w-xs" data-testid="dialog-confirm-unit">
            <DialogHeader>
              <DialogTitle>{t('confirmUnit')}</DialogTitle>
              <DialogDescription>{t('confirmUnitMessage')}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="font-medium text-blue-800" data-testid="text-confirm-village-name">{pendingUnit?.villageName}</span>
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingUnit(null)} data-testid="button-confirm-change">
                {t('changeUnit')}
              </Button>
              <Button className="flex-1" onClick={handleConfirmUnit} data-testid="button-confirm-proceed">
                {t('proceedWithUnit')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (authState === "register_otp") {
    const regInputType = detectInputType(regIdentifier);
    const regIsValid = regInputType === "email" || regInputType === "mobile";
    const otpFilledCount = (regIsValid ? 1 : 0) + (regOtp.length === 4 ? 1 : 0);
    const regIcon = regInputType === "mobile" ? <Smartphone className="h-6 w-6 text-blue-600" /> : <Mail className="h-6 w-6 text-blue-600" />;
    const regChannelIcon = regChannel === "sms" ? <Phone className="h-4 w-4 text-blue-600" /> : <Mail className="h-4 w-4 text-blue-600" />;
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              {regIcon}
            </div>
            <CardTitle className="text-lg" data-testid="text-reg-otp-title">Verify Your Identity</CardTitle>
            <CardDescription>{selectedVillageName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1" data-testid="progress-bar-otp">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{otpFilledCount}/2</span>
                <span className="text-xs font-medium text-slate-600">{Math.round((otpFilledCount / 2) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(otpFilledCount / 2) * 100}%` }} />
              </div>
            </div>
            {regOtpStep === "input" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email or Mobile Number</label>
                  <Input
                    type="text"
                    inputMode={regInputType === "mobile" ? "numeric" : "email"}
                    placeholder="Enter email or mobile number"
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value)}
                    className="h-12 text-base"
                    data-testid="input-reg-email-or-mobile"
                  />
                  {regIdentifier.trim() && (
                    <p className="text-xs text-slate-500 mt-1">
                      {regInputType === "email" && "OTP will be sent to your email"}
                      {regInputType === "mobile" && "OTP will be sent via SMS"}
                      {regInputType === "unknown" && "Enter a valid email or 10-digit mobile number"}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full h-12 text-base"
                  onClick={handleRegSendOtp}
                  disabled={regSendOtpMutation.isPending || !regIsValid}
                  data-testid="button-reg-send-otp"
                >
                  {regSendOtpMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('sendOtp')} <ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>

              </>
            )}

            {regOtpStep === "otp" && (
              <>
                <div className="text-center text-sm text-slate-600 mb-2">
                  OTP sent to <span className="font-semibold">{regIdentifier}</span>
                  <button className="ml-2 text-blue-600 underline" onClick={() => { setRegOtpStep("input"); setRegOtp(""); setRegOtpSent(false); setRegChannel(null); }}>{t('change')}</button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {regChannelIcon}
                    <span className="text-sm font-medium text-blue-700">
                      {regChannel === "sms" ? "OTP sent to your mobile" : "OTP sent to your email"}
                    </span>
                  </div>
                  <div className="text-sm text-blue-600 font-mono">{regIdentifier}</div>
                  <p className="text-xs text-blue-500 mt-1">
                    {regChannel === "sms" ? "Check your SMS messages" : "Check your inbox (and spam folder)"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('enterOtp')}</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    placeholder={t('enter4DigitOtp')}
                    value={regOtp}
                    onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-12 text-xl text-center tracking-[0.5em]"
                    data-testid="input-reg-otp"
                  />
                </div>
                <Button
                  className="w-full h-12 text-base"
                  onClick={handleRegVerifyOtp}
                  disabled={regVerifyOtpMutation.isPending || regOtp.length !== 4}
                  data-testid="button-reg-verify-otp"
                >
                  {regVerifyOtpMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('verifyAndContinue')} <KeyRound className="ml-2 h-5 w-5" /></>}
                </Button>
              </>
            )}

            <Button variant="ghost" className="w-full" onClick={() => setAuthState("register_village")} data-testid="button-reg-otp-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={existingUserDialog} onOpenChange={(open) => { if (!open) setExistingUserDialog(false); }}>
          <DialogContent className="max-w-xs" data-testid="dialog-user-exists">
            <DialogHeader>
              <DialogTitle>{t('userAlreadyExists')}</DialogTitle>
              <DialogDescription>{t('userAlreadyExistsDesc')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button className="w-full" onClick={() => { setExistingUserDialog(false); handleBackToWelcome(); setAuthState("login"); }} data-testid="button-go-to-login">
                <LogIn className="mr-2 h-4 w-4" /> {t('goToLogin')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (authState === "register" && (pendingEmail || pendingMobile)) {
    return (
      <AppRegister
        email={pendingEmail || undefined}
        mobile={pendingMobile || undefined}
        selectedVillageId={selectedVillageId}
        selectedVillageName={selectedVillageName}
        onComplete={handleRegistrationComplete}
        onBack={handleBackToWelcome}
      />
    );
  }

  if (authState === "authenticated" && user) {
    const completion = getProfileCompletion(user);
    const profileComplete = completion.percentage === 100;

    const ProfileGate = () => (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-lg font-medium text-slate-800">
              {t('profileCompleteFirst')}
            </p>
            <Button onClick={() => setLocation("/profile")} className="w-full">
              Complete Profile
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );

    if (location === "/profile" || location === "/app/profile") {
      return <ProfilePage user={user} onBack={() => setLocation("/")} onUpdate={handleProfileUpdate} />;
    }
    if (location === "/task/csc-report" || location === "/app/task/csc-report") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskCscReport user={user} />;
    }
    if (location === "/task/volunteer-mapping" || location === "/app/task/volunteer-mapping") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskVolunteerMapping user={user} />;
    }
    if (location === "/task/supporter-mapping" || location === "/app/task/supporter-mapping") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskSupporterMapping user={user} />;
    }
    if (location === "/task/harr-sirr-te-chatt" || location === "/app/task/harr-sirr-te-chatt") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskHstc user={user} />;
    }
    if (location === "/task/sukh-dukh-saanjha-karo" || location === "/app/task/sukh-dukh-saanjha-karo") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskSdsk user={user} />;
    }
    if (location === "/task/sunwai" || location === "/app/task/sunwai") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskSunwai user={user} />;
    }
    if (location === "/task/nasha-viruddh-yuddh" || location === "/app/task/nasha-viruddh-yuddh") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskNvy user={user} />;
    }
    if (location === "/task/road-report" || location === "/app/task/road-report") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskRoad user={user} />;
    }
    if (location === "/task/outdoor-ad" || location === "/app/task/outdoor-ad") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskOutdoorAd user={user} />;
    }
    if (location === "/task/gov-school" || location === "/app/task/gov-school") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskGovSchool user={user} />;
    }
    if (location === "/task/appointment" || location === "/app/task/appointment") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskAppointment user={user} />;
    }
    if (location === "/task/event-venue" || location === "/app/task/event-venue") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskEventVenue user={user} />;
    }
    if (location === "/task/tirth-yatra" || location === "/app/task/tirth-yatra") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskTirthYatra user={user} />;
    }
    if (location === "/task/mahila-samman-rashi" || location === "/app/task/mahila-samman-rashi") {
      return <TaskMahilaSamman user={user} />;
    }
    if (location === "/task/voter-registration" || location === "/app/task/voter-registration") {
      if (!profileComplete) return <ProfileGate />;
      return <TaskVoterRegistration user={user} />;
    }
    if (location === "/chat" || location === "/app/chat") {
      return <GroupChat user={user} onBack={() => setLocation("/")} />;
    }
    if (location === "/leaderboard" || location === "/app/leaderboard") {
      return <Leaderboard user={user} onBack={() => setLocation("/")} />;
    }
    if (location === "/survey-leaderboard" || location === "/app/survey-leaderboard") {
      return <SurveyLeaderboard user={user} onBack={() => setLocation("/")} />;
    }
    const surveyMatch = location.match(/^\/(?:app\/)?survey\/(.+)$/);
    if (surveyMatch) {
      if (!profileComplete) return <ProfileGate />;
      return <SurveyForm user={user} surveyId={surveyMatch[1]} onBack={() => setLocation("/")} />;
    }
    const taskMatch = location.match(/^\/(?:app\/)?task\/(.+)$/);
    if (taskMatch) {
      if (!profileComplete) return <ProfileGate />;
      return <TaskDynamicForm user={user} taskId={taskMatch[1]} />;
    }
    return <TaskHome user={user} onLogout={handleLogout} onProfile={() => setLocation("/profile")} />;
  }

  return null;
}
