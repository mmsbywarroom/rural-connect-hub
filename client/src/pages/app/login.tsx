import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const inputIcon = inputType === "mobile"
    ? <Smartphone className="h-6 w-6 text-[#0d47a1]" />
    : <Mail className="h-6 w-6 text-[#0d47a1]" />;
  const channelIcon = channel === "sms"
    ? <Phone className="h-4 w-4 text-[#1565c0]" />
    : <Mail className="h-4 w-4 text-[#1565c0]" />;

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-[#061a3a]" />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -10%, #1565c0 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 100%, #0b3d91 0%, transparent 50%), linear-gradient(165deg, #0a274f 0%, #061a3a 45%, #082448 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
        {/* Portrait hero — full bleed, no side gaps */}
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/15">
          <MinisterImageWithFallback compact />
          <MinisterTextBlock compact />
        </div>

        {/* Auth panel */}
        <div className="rounded-2xl bg-white/97 backdrop-blur-sm shadow-2xl shadow-black/30 ring-1 ring-black/5 overflow-hidden">
          <div className="px-6 pt-6 pb-2 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-[#e8f0fe] flex items-center justify-center ring-4 ring-[#e8f0fe]/60">
              {inputIcon}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0a274f]">
              {t('patialaRural')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">Secure OTP login</p>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {step === "input" && (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
                    Email or Mobile Number
                  </label>
                  <Input
                    type="text"
                    inputMode={inputType === "mobile" ? "numeric" : "email"}
                    placeholder="Enter email or mobile number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-12 text-base rounded-xl border-slate-200 focus-visible:ring-[#1565c0]"
                    data-testid="input-email-or-mobile"
                    autoFocus
                  />
                  {identifier.trim() && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      {inputType === "email" && "OTP will be sent to your email"}
                      {inputType === "mobile" && "OTP will be sent via SMS"}
                      {inputType === "unknown" && "Enter a valid email or 10-digit mobile number"}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full h-12 text-base rounded-xl bg-[#0d47a1] hover:bg-[#1565c0] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                  onClick={handleSendOtp}
                  disabled={sendOtpMutation.isPending || !isValidInput}
                  data-testid="button-send-otp"
                >
                  {sendOtpMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t('sendOtp')} <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="text-center text-sm text-slate-600 mb-1">
                  OTP sent to <span className="font-semibold text-slate-800">{maskedTarget || identifier}</span>
                  <button
                    className="ml-2 text-[#1565c0] underline underline-offset-2"
                    onClick={() => {
                      setStep("input");
                      setOtp("");
                      setMaskedTarget(null);
                      setChannel(null);
                    }}
                  >
                    {t('change')}
                  </button>
                </div>

                <div
                  className="bg-[#eef4ff] border border-[#c5d8f8] rounded-xl p-3 text-center"
                  data-testid="text-otp-sent-notice"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {channelIcon}
                    <span className="text-sm font-medium text-[#0d47a1]">
                      {channel === "sms" ? "OTP sent to your mobile" : "OTP sent to your email"}
                    </span>
                  </div>
                  <div className="text-sm text-[#1565c0] font-mono">{maskedTarget || identifier}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {channel === "sms" ? "Check your SMS messages" : "Check your inbox (and spam folder)"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
                    {t('enterOtp')}
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    placeholder={t('enter4DigitOtp')}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-12 text-xl text-center tracking-[0.5em] rounded-xl border-slate-200 focus-visible:ring-[#1565c0]"
                    data-testid="input-otp"
                  />
                </div>
                <Button
                  className="w-full h-12 text-base rounded-xl bg-[#0d47a1] hover:bg-[#1565c0] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                  onClick={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending || otp.length !== 4}
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t('verifyAndContinue')} <KeyRound className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-sm text-slate-600"
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
              <Button
                variant="ghost"
                className="w-full mt-1 text-slate-500 hover:text-slate-800"
                onClick={onBack}
                data-testid="button-login-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
