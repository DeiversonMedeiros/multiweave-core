import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { CompanySelector } from "./CompanySelector";
import { Button } from "./ui/button";
import { LogOut, User, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-context";
import { UserPermissionsCompact } from "./UserPermissions";
import { TrainingNotificationsBadge } from "./rh/TrainingNotificationsBadge";
import { TrainingNotificationScheduler } from "./rh/TrainingNotificationScheduler";

export const Layout = () => {
  const { user, signOut } = useAuth();
  const { selectedCompany } = useCompany();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-6 overflow-x-auto">
            <SidebarTrigger className="relative z-50 flex-shrink-0" />
            <div className="hidden sm:block flex-1 min-w-0">
              <Breadcrumbs />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:block">
                <CompanySelector />
              </div>
              <div className="sm:hidden flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate max-w-20">{selectedCompany?.nome_fantasia}</span>
              </div>
              <TrainingNotificationsBadge />
              <UserPermissionsCompact />
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium truncate max-w-32">{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="flex-shrink-0">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          <TrainingNotificationScheduler />
          <main className="flex-1 p-3 sm:p-6">
            {selectedCompany ? (
              <Outlet />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground">
                    Selecione uma empresa para continuar
                  </p>
                  <CompanySelector />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
