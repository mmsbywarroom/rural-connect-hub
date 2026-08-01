import { Link } from "wouter";
import { Building2, Users, UserCheck, Shield, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

const portals = [
  {
    href: "/admin",
    titleKey: "adminPanel" as const,
    descKey: "manageVolunteers" as const,
    icon: Users,
    accent: "from-[#0a274f] to-[#1565c0]",
    testId: "text-admin-title",
  },
  {
    href: "/app",
    titleKey: "volunteerApp" as const,
    descKey: "mobileAppForField" as const,
    icon: UserCheck,
    accent: "from-[#0d47a1] to-[#42a5f5]",
    testId: "text-volunteer-title",
  },
  {
    href: "/office",
    titleKey: "officePortal" as const,
    descKey: "recordVisitorGrievances" as const,
    icon: Building2,
    accent: "from-[#1565c0] to-[#64b5f6]",
    testId: "text-office-title",
  },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen app-page flex flex-col items-center justify-center p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#0a274f] to-[#1565c0] rounded-2xl mb-4 shadow-lg shadow-blue-900/20">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0a274f]" data-testid="text-title">
          {t("patialaRural")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Choose a portal to continue</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link key={portal.href} href={portal.href}>
              <div className="app-task-card cursor-pointer flex items-center gap-4 p-4 mb-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${portal.accent} rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-blue-900/10`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-slate-900" data-testid={portal.testId}>
                    {t(portal.titleKey)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t(portal.descKey)}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      <LanguageSwitcher variant="outline" className="mt-5" showLabel />
      <p className="text-xs text-slate-400 mt-6">{t("eachPortalIndependent")}</p>
    </div>
  );
}
