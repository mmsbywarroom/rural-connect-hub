import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared professional admin UI primitives — use across all admin modules. */

export function AdminPageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <div className="w-10 h-10 rounded-xl bg-[#eef4ff] text-[#0d47a1] flex items-center justify-center shrink-0">
              {icon}
            </div>
          ) : null}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {description ? <p className="text-sm text-slate-500 mt-0.5">{description}</p> : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div> : null}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  icon,
  hint,
  accent = "blue",
  testId,
  valueTestId,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  accent?: "blue" | "emerald" | "amber" | "violet" | "rose" | "slate";
  testId?: string;
  valueTestId?: string;
}) {
  const accents = {
    blue: "from-[#0a274f] to-[#1565c0] text-white",
    emerald: "from-emerald-600 to-teal-500 text-white",
    amber: "from-amber-500 to-orange-500 text-white",
    violet: "from-violet-600 to-indigo-500 text-white",
    rose: "from-rose-500 to-pink-500 text-white",
    slate: "from-slate-700 to-slate-500 text-white",
  };

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p
            className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900"
            data-testid={valueTestId}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm", accents[accent])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminSurface({
  children,
  className,
  title,
  description,
  action,
  testId,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden", className)}
      data-testid={testId}
    >
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2> : null}
            {description ? <p className="text-xs text-slate-500 mt-0.5">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function AdminEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{description}</p> : null}
    </div>
  );
}

export function AdminQuickLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:border-[#93c5fd] hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-[#eef4ff] text-[#0d47a1] flex items-center justify-center shrink-0 group-hover:bg-[#0d47a1] group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
        {subtitle ? <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p> : null}
      </div>
    </a>
  );
}
