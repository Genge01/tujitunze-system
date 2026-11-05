
import type { ComponentType, SVGProps } from "react";

interface StatisticCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  onClick?: () => void;
}

export default function StatisticCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: StatisticCardProps) {
  const clickable = Boolean(onClick);

  return (
    <div
    onClick={onClick}
    onKeyDown={(event) => {
      if (clickable && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onClick?.();
      }
    }}
    role={clickable ? "button" : undefined}
    tabIndex={clickable ? 0 : undefined}
    className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition ${
      clickable
      ? "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
      : "hover:-translate-y-0.5 hover:shadow-lg"
    }`}
    >
    <div className="flex items-start justify-between gap-3">
    <p className="text-sm font-medium text-slate-500">{label}</p>

    {Icon && (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#064E3B]">
      <Icon className="h-5 w-5" />
      </span>
    )}
    </div>

    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>

    {hint && (
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    )}
    </div>
  );
}
