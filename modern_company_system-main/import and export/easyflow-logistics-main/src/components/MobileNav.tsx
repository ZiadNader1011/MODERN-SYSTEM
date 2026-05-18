import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, ClipboardList, Send, Users, FileText } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  const items = isAdmin
    ? [
        { to: "/" as const, label: t.nav.home, icon: Home },
        { to: "/send" as const, label: t.nav.send, icon: Send },
        { to: "/team" as const, label: t.nav.team, icon: Users },
        { to: "/reports" as const, label: t.nav.reports, icon: FileText },
      ]
    : [
        { to: "/" as const, label: t.nav.home, icon: Home },
        { to: "/my-tasks" as const, label: t.nav.myTasks, icon: ListChecks },
        { to: "/checklist" as const, label: t.nav.checklist, icon: ClipboardList },
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-lg border-t border-border shadow-elevated">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
        {items.map(({ to, label, icon: Icon }) => {
          const active = (to === "/" && pathname === "/") || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-[10px] font-semibold transition",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "text-foreground")} />
              <span className="truncate max-w-full">{label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 bg-foreground rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
