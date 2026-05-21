import { useI18n } from "@/i18n/I18nProvider";
import type { Priority, TaskStatus } from "@/store/store";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n();
  const map = {
    urgent: { label: t.priority.urgent, cls: "bg-urgent-soft text-urgent border-urgent/30" },
    medium: { label: t.priority.medium, cls: "bg-medium-soft text-medium border-medium/30" },
    low: { label: t.priority.low, cls: "bg-stable-soft text-stable border-stable/30" },
  } as const;
  const v = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest",
        v.cls,
      )}
    >
      {v.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useI18n();
  const map = {
    pending: {
      label: t.statusLabel.pending,
      cls: "bg-surface-muted text-muted-foreground border-border",
    },
    acknowledged: {
      label: t.statusLabel.acknowledged,
      cls: "bg-medium-soft text-medium border-medium/30",
    },
    completed: {
      label: t.statusLabel.completed,
      cls: "bg-stable-soft text-stable border-stable/30",
    },
  } as const;
  const v = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest",
        v.cls,
      )}
    >
      {v.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  const cls =
    priority === "urgent" ? "bg-urgent" : priority === "medium" ? "bg-medium" : "bg-stable";
  return <span className={cn("size-3 rounded-full", cls)} />;
}
