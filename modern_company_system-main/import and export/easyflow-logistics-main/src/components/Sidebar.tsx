import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Send,
  Users,
  ListChecks,
  ClipboardList,
  FileText,
  Home,
} from "lucide-react";
import { Logo } from "./Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/store/store";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { tasks, employees, reports } = useStore();
  const { isAdmin } = useAuth();

  const items = [
    { to: "/" as const, label: t.nav.home, icon: Home, adminOnly: false, employeeOnly: false },
    { to: "/" as const, label: t.nav.dashboard, icon: LayoutDashboard, adminOnly: false, employeeOnly: false, hidden: true },
    { to: "/my-tasks" as const, label: t.nav.myTasks, icon: ListChecks, adminOnly: false, employeeOnly: true },
    { to: "/checklist" as const, label: t.nav.checklist, icon: ClipboardList, adminOnly: false, employeeOnly: true },
    { to: "/send" as const, label: t.nav.send, icon: Send, adminOnly: true, employeeOnly: false },
    { to: "/team" as const, label: t.nav.team, icon: Users, adminOnly: true, employeeOnly: false },
    { to: "/reports" as const, label: t.nav.reports, icon: FileText, adminOnly: true, employeeOnly: false },
  ].filter((i) => !i.hidden && (isAdmin ? !i.employeeOnly : !i.adminOnly));

  const pending = tasks.filter((x) => x.status !== "completed").length;
  const completed = tasks.filter((x) => x.status === "completed").length;

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-e border-border bg-sidebar">
      <div className="px-7 py-6 border-b border-border">
        <Logo size={42} withText lightText />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
          {t.nav.group}
        </div>
        {items.map(({ to, label, icon: Icon }, idx) => {
          const active =
            (to === "/" && pathname === "/") || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={`${to}-${idx}`}
              to={to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                  : "text-white/70 hover:bg-sidebar-accent hover:text-white",
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 pb-6 space-y-3">
        <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-stable animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/80">
              {t.status.live}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-sidebar p-2">
              <div className="font-display font-bold text-2xl text-white">{pending}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/60">
                {t.kpi.pending}
              </div>
            </div>
            <div className="rounded-lg bg-sidebar p-2">
              <div className="font-display font-bold text-2xl text-stable">{completed}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/60">
                {t.kpi.completed}
              </div>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-white/60 text-center">
            {employees.length} {t.kpi.online}
            {isAdmin ? ` · ${reports.length} ${t.kpi.reports}` : ""}
          </div>
        </div>
      </div>
    </aside>
  );
}
