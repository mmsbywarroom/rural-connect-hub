import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { InstallBanner } from "@/components/install-banner";
import NotFound from "@/pages/not-found";
import OfficePage from "@/pages/office";
import OfficeLogin from "@/pages/office/login";
import AdminPage from "@/pages/admin";
import VolunteerLoginPage from "@/pages/volunteer/login";
import VolunteerDashboardPage from "@/pages/volunteer/dashboard";
import VolunteerPortal from "@/pages/app";

function OfficeAuthWrapper() {
  const [manager, setManager] = useState<{ id: string; name: string; userId: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("officeManager");
    if (stored) {
      setManager(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("officeManager");
    setManager(null);
  };

  if (!manager) {
    return <OfficeLogin onLogin={setManager} />;
  }

  return <OfficePage manager={manager} onLogout={handleLogout} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={VolunteerPortal} />
      <Route path="/profile" component={VolunteerPortal} />
      <Route path="/leaderboard" component={VolunteerPortal} />
      <Route path="/task/:taskId" component={VolunteerPortal} />
      <Route path="/office" component={OfficeAuthWrapper} />
      <Route path="/office/portal" component={OfficeAuthWrapper} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/form-builder" component={AdminPage} />
      <Route path="/admin/:section" component={AdminPage} />
      <Route path="/volunteer-login" component={VolunteerLoginPage} />
      <Route path="/volunteer/dashboard" component={VolunteerDashboardPage} />
      <Route path="/app" component={VolunteerPortal} />
      <Route path="/app/chat" component={VolunteerPortal} />
      <Route path="/app/profile" component={VolunteerPortal} />
      <Route path="/app/leaderboard" component={VolunteerPortal} />
      <Route path="/app/task/:taskId" component={VolunteerPortal} />
      <Route path="/chat" component={VolunteerPortal} />
      <Route path="/survey/:surveyId" component={VolunteerPortal} />
      <Route path="/app/survey/:surveyId" component={VolunteerPortal} />
      <Route path="/survey-leaderboard" component={VolunteerPortal} />
      <Route path="/app/survey-leaderboard" component={VolunteerPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <InstallBanner />
          <Toaster />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
