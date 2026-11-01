import { Badge } from "@/components/ui/Badge";
import { RECRUITMENT_STATUS_LABEL, type RecruitmentStatus } from "../types";

/* 모집 건 상태 배지. 지금 움직이는 상태(모집 중)만 강조색을 쓴다 */

const TONE: Record<RecruitmentStatus, "accent" | "neutral" | "muted"> = {
  recruiting: "accent",
  full: "neutral",
  testing: "neutral",
  closed: "muted",
};

/** 모집 건 상태 배지 */
export function RecruitmentStatusBadge({ status }: { status: RecruitmentStatus }) {
  return <Badge tone={TONE[status]}>{RECRUITMENT_STATUS_LABEL[status]}</Badge>;
}
