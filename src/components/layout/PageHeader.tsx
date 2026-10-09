import type { ReactNode } from "react";
import { Arc, DotGrid, Glow, SectionLabel } from "@/components/ui/marketing";

/** The top of every inner page, in the same style as the home page's sections. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-cream-300 bg-gradient-to-b from-cream-100 to-[#FBF6EC]">
      <Glow className="-right-40 -top-48 h-[30rem] w-[30rem]" />
      <Arc className="-right-56 -top-64 hidden h-[30rem] w-[30rem] md:block" opacity={0.4} />
      <DotGrid className="bottom-8 right-10 hidden md:block" cols={6} rows={3} />
      <div className="container-page relative py-14 sm:py-20">
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <h1 className="h-display mt-4 max-w-3xl text-balance !text-[clamp(2rem,1.4rem+2.6vw,3.25rem)]">
          {title}
        </h1>
        {description ? <p className="lead mt-4 max-w-2xl text-pretty">{description}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </header>
  );
}
