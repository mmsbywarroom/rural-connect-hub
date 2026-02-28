import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { Loader2, Mail, KeyRound, ArrowRight, ArrowLeft, Phone, Smartphone } from "lucide-react";
import type { AppUser } from "@shared/schema";
import { MinisterImageWithFallback, MinisterTextBlock } from "@/components/minister-image";

interface AppLoginProps {
  onLogin: (user: AppUser) => void;
  onNeedRegistration: (emailOrMobile: string, name?: string) => void;
  onBack?: () => void;
}

type Step = "input" | "otp";

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

export default function AppLogin({ onLogin, onNeedRegistration, onBack }: AppLoginProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("input");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedTarget, setMaskedTarget] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "sms" | null>(null);
  const cleanEmail = (e: string) => e.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, '');
  const cleanMobile = (m: string) => m.replace(/\D/g, "").replace(/^91/, "");

  const sendOtpMutation = useMutation({
    mutationFn: async (input: string) => {
      const type = detectInputType(input);
      const body: any = {};
      if (type === "mobile") {
        body.mobile = cleanMobile(input);
      } else {
        body.email = cleanEmail(input);
      }
      const res = await apiRequest("POST", "/api/app/send-otp", body);
      return res.json();
    },
    onSuccess: (data) => {
      setChannel(data.channel || (data.smsSent ? "sms" : "email"));
      setMaskedTarget(data.maskedMobile || data.maskedEmail || identifier);
      setStep("otp");
      const desc = data.channel === "sms" || data.smsSent
        ? "Check your phone for the OTP code"
        : "Check your email for the OTP code";
      toast({ title: t('otpSent'), description: desc });
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedToSendOtp'), variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
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
      if (data.exists && data.user) {
        onLogin(data.user);
      } else {
        onNeedRegistration(data.email || data.mobile);
      }
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("401")
        ? t('invalidOrExpiredOtp')
        : err?.message?.includes("403")
        ? "Your account has been blocked. Please contact admin."
        : "Verification failed. Please check your connection and try again.";
      toast({ title: t('error'), description: msg, variant: "destructive" });
    },
  });

  const inputType = detectInputType(identifier);
  const isValidInput = inputType === "email" || inputType === "mobile";

  const handleSendOtp = () => {
    const trimmed = identifier.trim();
    if (!isValidInput) {
      toast({ title: t('invalid'), description: "Please enter a valid email address or 10-digit mobile number", variant: "destructive" });
      return;
    }
    sendOtpMutation.mutate(trimmed);
  };

  const handleVerifyOtp = () => {
    const cleanOtp = otp.replace(/\D/g, '').trim();
    if (!/^\d{4}$/.test(cleanOtp)) {
      toast({ title: t('invalid'), description: t('invalidOtp'), variant: "destructive" });
      return;
    }
    verifyOtpMutation.mutate({ input: identifier.trim(), otpCode: cleanOtp });
  };

  const inputIcon = inputType === "mobile" ? <Smartphone className="h-8 w-8 text-blue-600" /> : <Mail className="h-8 w-8 text-blue-600" />;
  const channelIcon = channel === "sms" ? <Phone className="h-4 w-4 text-blue-600" /> : <Mail className="h-4 w-4 text-blue-600" />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 flex flex-col">
        <div className="rounded-xl overflow-hidden shadow-xl border-2 border-white/20 bg-white flex-shrink-0">
          <div className="w-full h-[140px] flex shrink-0">
            <MinisterImageWithFallback compact />
          </div>
          <MinisterTextBlock compact />
        </div>
      <Card className="shadow-xl flex-shrink-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            {inputIcon}
          </div>
          <CardTitle className="text-xl">{t('patialaRural')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "input" && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Email or Mobile Number</label>
                <Input
                  type="text"
                  inputMode={inputType === "mobile" ? "numeric" : "email"}
                  placeholder="Enter email or mobile number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-email-or-mobile"
                />
                {identifier.trim() && (
                  <p className="text-xs text-slate-500 mt-1">
                    {inputType === "email" && "OTP will be sent to your email"}
                    {inputType === "mobile" && "OTP will be sent via SMS"}
                    {inputType === "unknown" && "Enter a valid email or 10-digit mobile number"}
                  </p>
                )}
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending || !isValidInput}
                data-testid="button-send-otp"
              >
                {sendOtpMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('sendOtp')} <ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>

            </>
          )}

          {step === "otp" && (
            <>
              <div className="text-center text-sm text-slate-600 dark:text-slate-400 mb-2">
                OTP sent to <span className="font-semibold">{maskedTarget || identifier}</span>
                <button className="ml-2 text-blue-600 underline" onClick={() => { setStep("input"); setOtp(""); setMaskedTarget(null); setChannel(null); }}>{t('change')}</button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center" data-testid="text-otp-sent-notice">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {channelIcon}
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {channel === "sms" ? "OTP sent to your mobile" : "OTP sent to your email"}
                  </span>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-mono">{maskedTarget || identifier}</div>
                <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                  {channel === "sms" ? "Check your SMS messages" : "Check your inbox (and spam folder)"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">{t('enterOtp')}</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder={t('enter4DigitOtp')}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-12 text-xl text-center tracking-[0.5em]"
                  data-testid="input-otp"
                />
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={handleVerifyOtp}
                disabled={verifyOtpMutation.isPending || otp.length !== 4}
                data-testid="button-verify-otp"
              >
                {verifyOtpMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('verifyAndContinue')} <KeyRound className="ml-2 h-5 w-5" /></>}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => sendOtpMutation.mutate(identifier.trim())}
                disabled={sendOtpMutation.isPending}
                data-testid="button-resend-otp"
              >
                {sendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Resend OTP
              </Button>
            </>
          )}
          {onBack && (
            <Button variant="ghost" className="w-full mt-2" onClick={onBack} data-testid="button-login-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
