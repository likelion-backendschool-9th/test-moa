import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCredits, formatDate } from "@/lib/format";
import { isFull, SOFTWARE_TYPE_LABEL, type Recruitment } from "../types";
import { RecruitmentThumb } from "./RecruitmentThumb";

/** 갤러리 카드. 유형은 썸네일 배지로 올리고, 썸네일 아래 요청, 기본 보상(추가 보상이 있으면 옆에 배지), 모집 마감과 인원을 모든 카드에서 같은 높이에 둔다 */
export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  return (
    <Link
      href={`/recruitments/${recruitment.slug}`}
      data-testid="recruitment-card"
      className="group flex flex-col gap-3 rounded-2xl outline-offset-4"
    >
      <div className="transition-transform duration-500 ease-brand group-hover:-translate-y-1">
        <RecruitmentThumb
          recruitment={recruitment}
          stamp={isFull(recruitment) ? "모집 완료" : undefined}
          category={SOFTWARE_TYPE_LABEL[recruitment.softwareType]}
        />
      </div>
      <div className="flex flex-col gap-1 px-1">
        <p className="line-clamp-2 min-h-[2lh] text-sm font-semibold">{recruitment.request}</p>
        {/* 배지가 있어도 줄 높이(20px)가 같아야 메타 줄이 카드끼리 맞는다 */}
        <p className="flex h-5 items-center gap-2 text-sm text-text-muted">
          {formatCredits(recruitment.baseReward)}
          {recruitment.extraReward !== undefined && (
            <Badge tone="accent" className="font-bold">
              추가 보상
            </Badge>
          )}
        </p>
        <dl className="mt-1 flex gap-5 text-sm">
          <div>
            <dt className="text-xs text-text-muted">모집 마감</dt>
            <dd className="font-semibold tabular-nums">{formatDate(recruitment.recruitDeadline)}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">인원</dt>
            <dd className="font-semibold tabular-nums">
              {recruitment.confirmedCount} / {recruitment.capacity}명
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
