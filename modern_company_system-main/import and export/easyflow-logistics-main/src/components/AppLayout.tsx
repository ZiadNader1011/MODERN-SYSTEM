import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Wheat } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GlobalSearch } from './GlobalSearch';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-4 border-b bg-card/50 px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="hidden md:flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden shrink-0">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-semibold text-foreground hidden lg:inline text-xs leading-tight">
                Modern enterprise<br/>for business and supplies
              </span>
            </div>
            
            <div className="flex-1 flex justify-center max-w-xl mx-auto">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <LanguageSwitcher />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );






  
}
