import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "me.auth.v1";
const ADMIN_PASSWORD = "Modern@2026$";

export type Role = "admin" | "employee";

interface AuthState {
  role: Role;
  isAdmin: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  setEmployeeMode: () => void;
}

const Ctx = createContext<AuthState | null>(null);

interface Persisted {
  role: Role;
}

function load(): Persisted {
  if (typeof window === "undefined") return { role: "employee" };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return { role: "employee" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("employee");

  useEffect(() => {
    setRole(load().role);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role }));
  }, [role]);

  const loginAdmin = useCallback((password: string) => {
    if (password === ADMIN_PASSWORD) {
      setRole("admin");
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => setRole("employee"), []);
  const setEmployeeMode = useCallback(() => setRole("employee"), []);

  const value = useMemo<AuthState>(
    () => ({ role, isAdmin: role === "admin", loginAdmin, logoutAdmin, setEmployeeMode }),
    [role, loginAdmin, logoutAdmin, setEmployeeMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
