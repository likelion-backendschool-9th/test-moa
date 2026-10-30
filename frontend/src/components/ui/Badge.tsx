import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "accent" | "muted";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-strong text-text",
  accent: "bg-accent-soft text-accent",
  muted: "bg-surface-strong text-text-muted",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
