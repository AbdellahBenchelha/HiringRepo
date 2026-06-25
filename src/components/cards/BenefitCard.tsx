import type { Benefit } from "@/config/content";
import { Icon, type IconName } from "@/components/Icon";

export function BenefitCard({ benefit }: { benefit: Benefit }) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-200 group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-600 group-hover:text-white group-hover:shadow-glow">
        <Icon name={benefit.icon as IconName} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-navy-900">{benefit.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-600">{benefit.description}</p>
    </div>
  );
}
