import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { Loader2, Mail, KeyRound, ArrowRight, ArrowLeft, Phone, Smartphone } from "lucide-react";
import type { AppUser } from "@shared/schema";
import { MinisterImageWithFallback, MinisterTextBlock } from "@/components/minister-image";
import { AppAuthShell, AppAuthCard, AppPortraitCard, AppPortraitMedia } from "@/components/app-auth-shell";

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
      setOtp("");
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

  const handleVerifyOtp = (otpCode = otp) => {
    const cleanOtp = otpCode.replace(/\D/g, "").trim();
    if (!/^\d{4}$/.test(cleanOtp)) {
      toast({ title: t('invalid'), description: t('invalidOtp'), variant: "destructive" });
      return;
    }
    verifyOtpMutation.mutate({ input: identifier.trim(), otpCode: cleanOtp });
  };

  const inputIcon = inputType === "mobile"
    ? <Smartphone className="h-5 w-5 text-[#0d47a1]" />
    : <Mail className="h-5 w-5 text-[#0d47a1]" />;
  const channelIcon = channel === "sms"
    ? <Phone className="h-3.5 w-3.5 text-[#1565c0]" />
    : <Mail className="h-3.5 w-3.5 text-[#1565c0]" />;

  return (
    <AppAuthShell>
      {/* Same as reference: portrait + name overlay + slogan, then white OTP card */}
      <AppPortraitCard>
        <AppPortraitMedia>
          <MinisterImageWithFallback compact showOverlay />
        </AppPortraitMedia>
        <MinisterTextBlock compact />
      </AppPortraitCard>

      <AppAuthCard className="bg-white">
        <div className="px-4 pt-4 pb-1 text-center">
          <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-white border border-[#c5d8f8] flex items-center justify-center shadow-sm">
            {step === "otp" && channel === "sms" ? (
              <Phone className="h-5 w-5 text-[#0d47a1]" />
            ) : (
              inputIcon
            )}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#0a274f]">
            {t('patialaRural')}
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Secure OTP login</p>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {step === "input" && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
                  Email or Mobile Number
                </label>
                <Input
                  type="text"
                  inputMode={inputType === "mobile" ? "numeric" : "email"}
                  placeholder="Enter email or mobile number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 text-base rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1565c0]"
                  data-testid="input-email-or-mobile"
                  autoFocus
                />
                {identifier.trim() && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {inputType === "email" && "OTP will be sent to your email"}
                    {inputType === "mobile" && "OTP will be sent via SMS"}
                    {inputType === "unknown" && "Enter a valid email or 10-digit mobile number"}
                  </p>
                )}
              </div>
              <Button
                className="w-full h-11 text-sm rounded-xl bg-[#0d47a1] hover:bg-[#1565c0] text-white shadow-md shadow-blue-900/20 transition-all active:scale-[0.98]"
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending || !isValidInput}
                data-testid="button-send-otp"
              >
                {sendOtpMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t('sendOtp')} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="text-center text-xs text-slate-600">
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
                className="bg-[#eef4ff] border border-[#c5d8f8] rounded-xl p-2.5 text-center"
                data-testid="text-otp-sent-notice"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  {channelIcon}
                  <span className="text-xs font-medium text-[#0d47a1]">
                    {channel === "sms" ? "OTP sent to your mobile" : "OTP sent to your email"}
                  </span>
                </div>
                <div className="text-xs text-[#1565c0] font-mono">{maskedTarget || identifier}</div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2 block text-center">
                  {t('enterOtp')}
                </label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(value) => {
                      const next = value.replace(/\D/g, "").slice(0, 4);
                      setOtp(next);
                      if (next.length === 4) {
                        handleVerifyOtp(next);
                      }
                    }}
                    containerClassName="gap-3"
                    data-testid="input-otp"
                  >
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-12 w-12 rounded-xl border border-slate-200 text-lg font-semibold text-slate-900 first:rounded-xl first:border-l last:rounded-xl shadow-sm"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                className="w-full h-11 text-sm rounded-xl bg-[#0d47a1] hover:bg-[#1565c0] text-white shadow-md shadow-blue-900/20 transition-all active:scale-[0.98]"
                onClick={() => handleVerifyOtp()}
                disabled={verifyOtpMutation.isPending || otp.length !== 4}
                data-testid="button-verify-otp"
              >
                {verifyOtpMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t('verifyAndContinue')} <KeyRound className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-xs text-slate-600 h-9"
                onClick={() => sendOtpMutation.mutate(identifier.trim())}
                disabled={sendOtpMutation.isPending}
                data-testid="button-resend-otp"
              >
                {sendOtpMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Resend OTP
              </Button>
            </>
          )}

          {onBack && (
            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-800 h-9 text-sm"
              onClick={onBack}
              data-testid="button-login-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
            </Button>
          )}
        </div>
      </AppAuthCard>
    </AppAuthShell>
  );
}
