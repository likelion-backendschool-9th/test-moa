import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "muted" | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-strong text-text",
  accent: "bg-accent-soft text-accent",
  muted: "bg-surface-strong text-text-muted",
  /* 바탕 없이 1px 재단 회색 테두리. 안쪽 링이라 다른 배지와 크기가 같다 */
  outline: "text-text inset-ring inset-ring-line",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
