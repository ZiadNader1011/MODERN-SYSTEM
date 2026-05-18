import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun, Languages, Home, Lock, LogOut, Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useStore } from "@/store/store";
import { useAuth } from "@/auth/AuthProvider";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export function Header() {
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { employees, currentEmployeeId, setCurrentEmployeeId } = useStore();
  const { isAdmin, loginAdmin, logoutAdmin } = useAuth();
  const navigate = useNavigate();

  const [loginOpen, setLoginOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const me = employees.find((e) => e.id === currentEmployeeId) ?? employees[0];

  const submitLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginAdmin(pwd)) {
      setLoginOpen(false);
      setPwd("");
      setErr("");
      navigate({ to: "/" });
    } else {
      setErr(t.auth.wrong);
    }
  };

  return (
    <>
      <header className="h-16 sm:h-20 px-3 sm:px-6 lg:px-10 border-b border-border flex items-center justify-between gap-2 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
        {/* Left: brand + home */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 shrink-0"
            aria-label={t.header.home}
          >
            <Logo size={36} />
          </Link>
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-accent px-3 py-1.5 text-xs font-semibold text-foreground transition"
            title={t.header.home}
          >
            <Home className="size-3.5" />
            <span className="hidden md:inline">{t.header.home}</span>
          </Link>
          <div className="hidden md:block min-w-0">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              {t.header.title}
            </div>
            <div className="font-display text-base lg:text-lg font-semibold text-foreground leading-tight truncate">
              {lang === "ar" ? "مؤسسة مودرن للتجارة والتوريدات" : "Modern Enterprise"}
            </div>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Role pill */}
          <div
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border",
              isAdmin
                ? "bg-foreground text-background border-foreground"
                : "bg-surface-muted text-muted-foreground border-border",
            )}
          >
            <span className={cn("size-1.5 rounded-full", isAdmin ? "bg-stable" : "bg-medium")} />
            {isAdmin ? t.header.adminView : t.header.employeeView}
          </div>

          <button
            onClick={toggleLang}
            className="size-9 rounded-full border border-border bg-surface hover:bg-accent transition flex items-center justify-center text-foreground"
            aria-label="Toggle language"
            title={t.common.lang}
          >
            <Languages className="size-4" />
          </button>

          <button
            onClick={toggle}
            className="size-9 rounded-full border border-border bg-surface hover:bg-accent transition flex items-center justify-center text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          {isAdmin ? (
            <button
              onClick={() => {
                logoutAdmin();
                navigate({ to: "/" });
              }}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-urgent-soft hover:text-urgent transition px-3 py-2 text-xs font-semibold text-foreground"
            >
              <LogOut className="size-3.5" />
              <span>{t.header.logout}</span>
            </button>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:opacity-90 transition px-3 sm:px-4 py-2 text-xs font-semibold"
            >
              <Lock className="size-3.5" />
              <span className="hidden sm:inline">{t.header.adminLogin}</span>
            </button>
          )}

          {/* Employee selector — only when not admin (employees pick who they are) */}
          {!isAdmin && (
            <select
              value={currentEmployeeId}
              onChange={(e) => setCurrentEmployeeId(e.target.value)}
              className="hidden md:block bg-surface border border-border rounded-full px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring max-w-[160px]"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}

          <div className="hidden lg:flex items-center gap-3 ps-3 border-s border-border">
            <div className="text-end">
              <div className="text-xs font-semibold text-foreground leading-none">
                {isAdmin ? "Director" : (me?.name ?? "—")}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                {isAdmin ? "Admin Console" : (me?.role ?? "")}
              </div>
            </div>
            <div
              className="size-10 rounded-full bg-gradient-to-br from-brand-blue via-brand-purple to-brand-orange p-[2px]"
              aria-hidden
            >
              <div className="size-full rounded-full bg-surface flex items-center justify-center text-foreground font-bold text-sm">
                {(isAdmin ? "AD" : (me?.name ?? "E"))
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            </div>
          </div>

          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="lg:hidden size-9 rounded-full border border-border bg-surface hover:bg-accent flex items-center justify-center"
            aria-label="Menu"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <MobileDrawer
          onClose={() => setMenuOpen(false)}
          onLogin={() => {
            setMenuOpen(false);
            setLoginOpen(true);
          }}
        />
      )}

      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submitLogin}
            className="bg-surface border border-border rounded-3xl p-7 max-w-md w-full shadow-elevated"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="size-11 rounded-2xl bg-foreground text-background flex items-center justify-center">
                <Lock className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{t.auth.title}</h2>
                <p className="text-xs text-muted-foreground">{t.auth.subtitle}</p>
              </div>
            </div>
            <label className="block mt-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2 block">
                {t.auth.password}
              </span>
              <input
                type="password"
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setErr("");
                }}
                autoFocus
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </label>
            {err && (
              <p className="text-xs text-urgent bg-urgent-soft border border-urgent/30 rounded-xl px-3 py-2 mt-3">
                {err}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setLoginOpen(false);
                  setPwd("");
                  setErr("");
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                {t.auth.backEmployee}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:opacity-90"
              >
                {t.auth.enter}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function MobileDrawer({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const { t } = useI18n();
  const { isAdmin, logoutAdmin } = useAuth();
  const { employees, currentEmployeeId, setCurrentEmployeeId } = useStore();

  const links = [
    { to: "/" as const, label: t.nav.home },
    { to: "/my-tasks" as const, label: t.nav.myTasks },
    { to: "/checklist" as const, label: t.nav.checklist },
    ...(isAdmin
      ? [
          { to: "/send" as const, label: t.nav.send },
          { to: "/team" as const, label: t.nav.team },
          { to: "/reports" as const, label: t.nav.reports },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <nav className="absolute top-16 sm:top-20 inset-x-0 bg-surface border-b border-border shadow-elevated p-5 space-y-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            onClick={onClose}
            className="block px-4 py-3 rounded-xl text-sm font-semibold text-foreground hover:bg-accent transition"
          >
            {l.label}
          </Link>
        ))}
        {!isAdmin && (
          <select
            value={currentEmployeeId}
            onChange={(e) => setCurrentEmployeeId(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.role}
              </option>
            ))}
          </select>
        )}
        <div className="pt-3 border-t border-border">
          {isAdmin ? (
            <button
              onClick={() => {
                logoutAdmin();
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest hover:bg-urgent-soft hover:text-urgent"
            >
              <LogOut className="size-3.5" /> {t.header.logout}
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-widest"
            >
              <Lock className="size-3.5" /> {t.header.adminLogin}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
