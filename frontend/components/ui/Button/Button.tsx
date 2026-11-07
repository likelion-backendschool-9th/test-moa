import type { ComponentProps } from "react";
import { buttonClass, type ButtonShape, type ButtonSize, type ButtonVariant } from "@/components/ui/Button/button-class";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
};

export function Button({ variant, size, shape, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} data-variant={variant ?? "primary"} className={buttonClass(variant, size, className, shape)} {...props} />;
}
