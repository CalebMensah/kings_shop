import Link from "next/link";
import type { IconType } from "react-icons";
import { HiOutlineCheckCircle, HiOutlineClock } from "react-icons/hi";

type Option = { value: "" | "available" | "preorder"; label: string; icon?: IconType };

const OPTIONS: Option[] = [
  { value: "", label: "All" },
  { value: "available", label: "Available now", icon: HiOutlineCheckCircle },
  { value: "preorder", label: "Preorder", icon: HiOutlineClock },
];

export function AvailabilityFilter({
  basePath,
  current,
  params = {},
}: {
  basePath: string;
  current?: string;
  params?: Record<string, string | undefined>;
}) {
  function href(value: string) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val) query.set(key, val);
    }
    if (value) query.set("availability", value);
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by availability">
      {OPTIONS.map((option) => {
        const active = (current ?? "") === option.value;
        const Icon = option.icon;
        return (
          <Link
            key={option.value || "all"}
            href={href(option.value)}
            aria-current={active ? "true" : undefined}
            className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition ${
              active
                ? "bg-navy-800 text-white border-navy-800"
                : "border-navy-100 text-navy-600 hover:bg-navy-50"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
