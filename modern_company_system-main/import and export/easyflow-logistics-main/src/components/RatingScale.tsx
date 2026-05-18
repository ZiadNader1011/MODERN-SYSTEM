import { cn } from "@/lib/utils";

export function RatingScale({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (v: number) => void;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="flex items-center gap-1.5 sm:gap-2"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(n)}
            className={cn(
              "h-10 w-10 shrink-0 rounded-full border text-sm font-semibold transition-all sm:h-11 sm:w-11",
              "touch-manipulation select-none",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-md scale-105"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
