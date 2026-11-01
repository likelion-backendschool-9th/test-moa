import { cn } from "@/lib/cn";

/** strong: 먹 바탕 버튼. 되돌리기 어려운 행동(삭제 확인)처럼 강조색을 쓰면 안 되는 무거운 행동에 쓴다 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "strong";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-[background-color,color,transform] duration-300 ease-brand active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "bg-surface-strong text-text hover:bg-line",
  ghost: "text-text hover:bg-surface-strong",
  strong: "bg-text text-surface hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-5 py-3 text-base",
  sm: "px-4 py-2 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}
