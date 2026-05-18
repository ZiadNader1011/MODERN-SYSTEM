import logo from "@/assets/logo.jpg";

export function BrandHeader({
  subtitle,
  variant = "blue",
}: {
  subtitle?: string;
  variant?: "blue" | "white";
}) {
  const isWhite = variant === "white";
  return (
    <header
      className={
        isWhite
          ? "w-full border-b border-border bg-white text-primary"
          : "w-full border-b border-border text-primary-foreground"
      }
      style={isWhite ? undefined : { background: "var(--gradient-hero)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
        <img
          src={logo}
          alt="Modern Enterprise logo"
          className={`h-14 w-14 shrink-0 rounded-lg object-cover ring-2 sm:h-16 sm:w-16 ${
            isWhite ? "ring-primary/20" : "ring-white/40"
          }`}
        />
        <div className="min-w-0">
          <h1
            className={`truncate text-base font-semibold leading-tight sm:text-lg ${
              isWhite ? "text-primary" : ""
            }`}
          >
            Modern Enterprise
          </h1>
          <p
            className={`truncate text-xs sm:text-sm ${
              isWhite ? "text-primary/80" : "text-white/80"
            }`}
          >
            For Business and Supplies
          </p>
          {subtitle && (
            <p
              className={`mt-0.5 truncate text-[11px] sm:text-xs ${
                isWhite ? "text-primary/70" : "text-white/75"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
