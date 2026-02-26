import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, UserCheck, Shield, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-title">{t('patialaRural')}</h1>
      </div>

      <div className="w-full max-w-md space-y-3">
        <Link href="/admin">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base" data-testid="text-admin-title">{t('adminPanel')}</CardTitle>
                <CardDescription className="text-xs">{t('manageVolunteers')}</CardDescription>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/app">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base" data-testid="text-volunteer-title">{t('volunteerApp')}</CardTitle>
                <CardDescription className="text-xs">{t('mobileAppForField')}</CardDescription>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/office">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base" data-testid="text-office-title">{t('officePortal')}</CardTitle>
                <CardDescription className="text-xs">{t('recordVisitorGrievances')}</CardDescription>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <LanguageSwitcher variant="outline" className="mt-4" showLabel />
      <p className="text-xs text-muted-foreground mt-8">{t('eachPortalIndependent')}</p>
    </div>
  );
}
