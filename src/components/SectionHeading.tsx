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
    <div className={`${centered ? "mx-auto text-center" : ""} max-w-2xl`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Heading className="mt-2 text-3xl sm:text-4xl">{title}</Heading>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-navy-600 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
