import type { Benefit } from "@/config/content";
import { Icon, type IconName } from "@/components/Icon";

export function BenefitCard({ benefit }: { benefit: Benefit }) {
  return (
    <div className="card flex h-full flex-col transition hover:-translate-y-0.5 hover:shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
        <Icon name={benefit.icon as IconName} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-navy-900">{benefit.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-600">{benefit.description}</p>
    </div>
  );
}
