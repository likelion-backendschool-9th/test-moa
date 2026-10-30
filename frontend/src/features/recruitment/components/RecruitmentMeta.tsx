import { cn } from "@/lib/cn";
import { formatCredits, formatDate } from "@/lib/format";
import type { Recruitment } from "../types";

type RecruitmentMetaProps = {
  recruitment: Recruitment;
  className?: string;
};

/** 모집 마감일, 제출 마감일, 인원, 기본 보상 */
export function RecruitmentMeta({ recruitment, className }: RecruitmentMetaProps) {
  const rows = [
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["제출 마감", formatDate(recruitment.submitDeadline)],
    ["인원", `${recruitment.confirmedCount} / ${recruitment.capacity}명`],
    ["보상", formatCredits(recruitment.baseReward)],
  ];

  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2 text-sm", className)}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-text-muted">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
