import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/translations";

export function timeAgo(ts: number, lang: Lang): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (lang === "ar") {
    if (m < 1) return "الآن";
    if (m < 60) return `منذ ${m} د`;
    if (h < 24) return `منذ ${h} س`;
    return `منذ ${d} ي`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function useFormatters() {
  const { lang } = useI18n();
  return {
    ago: (ts: number) => timeAgo(ts, lang),
    date: (s?: string | number) => {
      if (!s) return null;
      const d = new Date(s);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    },
    datetime: (s?: string | number) => {
      if (!s) return null;
      const d = new Date(s);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    },
  };
}
