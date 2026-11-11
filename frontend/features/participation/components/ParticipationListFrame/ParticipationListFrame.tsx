import type { ComponentProps } from "react";
import type { ParticipationView } from "@/features/participation/types";
import { cn } from "@/lib/cn";
import styles from "./ParticipationListFrame.module.css";

const VIEW: Record<ParticipationView, string> = { list: styles.list, grid: styles.grid };

/** 목록과 스켈레톤이 같은 배치로 자리를 잡는다. 그리드는 좁은 화면에서 1열, md 2열, lg 이상 3열이다 */
export function ParticipationListFrame({ view, className, ...props }: { view: ParticipationView } & ComponentProps<"ul">) {
  return <ul {...props} className={cn(VIEW[view], className)} />;
}
