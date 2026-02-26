import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, User, Lock, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

const loginSchema = z.object({
  userId: z.string().min(1, "User ID required"),
  password: z.string().min(1, "Password required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface OfficeLoginProps {
  onLogin: (manager: { id: string; name: string; userId: string }) => void;
}

export default function OfficeLogin({ onLogin }: OfficeLoginProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/office-managers/login", data);
      const result = await response.json();
      if (result.success) {
        localStorage.setItem("officeManager", JSON.stringify(result.manager));
        onLogin(result.manager);
        toast({ title: `Welcome, ${result.manager.name}!` });
        setLocation("/office/portal");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Invalid credentials";
      toast({ title: t('loginFailed'), description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center gap-3">
        <Building2 className="h-5 w-5 text-amber-400" />
        <h1 className="text-amber-400 font-semibold">{t('officePortal')}</h1>
        <LanguageSwitcher variant="ghost" className="text-white/70 ml-auto" iconClassName="text-white/70" />
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto bg-[#0f172a] p-4 rounded-full w-fit mb-4">
              <Building2 className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">{t('welcomeBack')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('signInToContinue')}</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          placeholder={t('userId')} 
                          className="pl-11 h-12 text-base bg-slate-50 border-slate-200" 
                          {...field} 
                          data-testid="input-user-id"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder={t('password')} 
                          className="pl-11 pr-11 h-12 text-base bg-slate-50 border-slate-200" 
                          {...field} 
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-[#0f172a] hover:bg-[#1e293b]" 
                disabled={isLoading} 
                data-testid="button-login"
              >
                {isLoading ? t('signingIn') : t('signIn')}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
