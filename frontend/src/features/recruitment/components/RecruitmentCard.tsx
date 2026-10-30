import Link from "next/link";
import { formatCredits, formatDate } from "@/lib/format";
import { SOFTWARE_TYPE_LABEL, type Recruitment } from "../types";
import { RecruitmentThumb } from "./RecruitmentThumb";

/** 갤러리 카드. 썸네일 아래 이름, 유형·보상, 모집 마감과 인원을 같은 자리에 둔다 */
export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  return (
    <Link
      href={`/recruitments/${recruitment.slug}`}
      data-testid="recruitment-card"
      className="group flex flex-col gap-3 rounded-2xl outline-offset-4"
    >
      <div className="transition-transform duration-500 ease-brand group-hover:-translate-y-1">
        <RecruitmentThumb recruitment={recruitment} />
      </div>
      <div className="flex flex-col gap-1 px-1">
        <p className="line-clamp-2 text-sm font-semibold">{recruitment.request}</p>
        <p className="text-sm text-text-muted">
          {SOFTWARE_TYPE_LABEL[recruitment.softwareType]} · {formatCredits(recruitment.baseReward)}
        </p>
        {recruitment.extraReward !== undefined && (
          <p className="text-sm font-bold text-accent">추가 보상 +{formatCredits(recruitment.extraReward)}</p>
        )}
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
