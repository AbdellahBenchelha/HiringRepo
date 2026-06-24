"use client";

import { useApply } from "./ApplyProvider";
import { Icon } from "@/components/Icon";

interface ApplyButtonProps {
  position?: string;
  label?: string;
  variant?: "primary" | "white" | "secondary" | "outline-white";
  className?: string;
  withIcon?: boolean;
}

const variantClass: Record<NonNullable<ApplyButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  white: "btn-white",
  secondary: "btn-secondary",
  "outline-white": "btn-outline-white",
};

export function ApplyButton({
  position,
  label = "Apply Now",
  variant = "primary",
  className = "",
  withIcon = true,
}: ApplyButtonProps) {
  const { openApply } = useApply();
  return (
    <button
      type="button"
      onClick={() => openApply(position)}
      className={`${variantClass[variant]} ${className}`}
    >
      {label}
      {withIcon ? <Icon name="arrowRight" className="h-4 w-4" /> : null}
    </button>
  );
}
