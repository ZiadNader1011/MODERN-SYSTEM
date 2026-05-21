const LOGO_URL = "https://i.postimg.cc/N0VY5rgN/logo-for-blal.jpg";

export function Logo({ size = 40, withText = false, lightText = false }: { size?: number; withText?: boolean; lightText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={LOGO_URL}
        alt="Modern Enterprise"
        width={size}
        height={size}
        className="rounded-xl ring-1 ring-border bg-surface object-cover shadow-soft"
        style={{ width: size, height: size }}
      />
      {withText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-display text-lg font-semibold tracking-tight ${lightText ? "text-white" : "text-foreground"}`}>
            Modern Enterprise
          </span>
          <span className={`text-[10px] uppercase tracking-[0.22em] font-medium ${lightText ? "text-white/80" : "text-muted-foreground"}`}>
            Business &amp; Supplies
          </span>
        </div>
      )}
    </div>
  );
}
