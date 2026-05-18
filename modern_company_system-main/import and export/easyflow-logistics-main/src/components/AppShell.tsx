import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <div className="print:hidden"><Sidebar /></div>
      <main className="flex-1 flex flex-col min-w-0 print:block">
        <div className="print:hidden"><Header /></div>
        <div className="flex-1 bg-paper-texture pb-20 lg:pb-0 print:bg-white print:pb-0 print:block">{children}</div>
      </main>
      <div className="print:hidden"><MobileNav /></div>
    </div>
  );
}
