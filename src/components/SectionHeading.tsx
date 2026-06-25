import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = true,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  centered?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={`flex max-w-2xl flex-col ${
        centered ? "mx-auto items-center text-center" : "items-start"
      }`}
    >
      {eyebrow ? (
        <span className="pill uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {eyebrow}
        </span>
      ) : null}
      <Heading className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
        {title}
      </Heading>
      {description ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
