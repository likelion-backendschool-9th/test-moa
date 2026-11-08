import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "accent" | "accentSolid" | "muted" | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: styles.tonesNeutral,
  accent: styles.tonesAccent,
  accentSolid: styles.tonesAccentSolid,
  muted: styles.tonesMuted,
  /* 바탕 없이 1px 재단 회색 테두리. 안쪽 링이라 다른 배지와 크기가 같다 */
  outline: styles.tonesOutline,
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(styles.root, tones[tone], className)}
      {...props}
    />
  );
}
