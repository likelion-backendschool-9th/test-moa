import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/Button/button-class";

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link data-variant={variant ?? "primary"} className={buttonClass(variant, size, className)} {...props} />;
}
