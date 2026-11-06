import Link from "next/link";
import Image from "next/image";
import { ImageSquareIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { SOFTWARE_TYPE_LABEL, type Recruitment } from "../../../../features/recruitment/types";

/**
 * 모집 카드. 프로젝트명을 본문 제목으로 표시하고, 보상은 추가 보상 배지만 보여 준다.
 * 날짜에는 짧은 마감 라벨을 표시한다.
 * relative는 절대 배치되는 sr-only 라벨도 카드 안에 묶어 가로 스크롤 밖으로 빠지지 않게 한다.
 */
export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  return (
    <Link
      href={`/recruitments/${recruitment.slug}`}
      data-testid="recruitment-card"
      className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl bg-surface-card outline-offset-4 inset-ring inset-ring-line transition-transform duration-500 ease-brand hover:-translate-y-1"
    >
      <div data-thumb className="relative aspect-[16/10] overflow-hidden bg-surface-strong">
        {recruitment.projectImage ? (
          <Image
            src={recruitment.projectImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 75vw"
            className="object-cover"
          />
        ) : (
          <div aria-hidden className="flex h-full items-center justify-center text-text-muted">
            <ImageSquareIcon size={32} weight="light" />
          </div>
        )}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start gap-1.5">
          <Badge tone="outline" className="bg-surface-muted font-bold">{SOFTWARE_TYPE_LABEL[recruitment.softwareType]}</Badge>
          {recruitment.extraReward !== undefined && (
            <Badge tone="accentSolid" className="font-bold">추가 보상</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
        <h3 className="line-clamp-2 text-base leading-snug font-bold tracking-[-0.03em]">{recruitment.projectName}</h3>
        <p className="line-clamp-2 min-h-[2lh] text-sm text-text-muted">{recruitment.request}</p>
        <dl className="mt-auto flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3 text-sm text-text-muted sm:gap-x-5">
          <div className="flex items-baseline gap-1">
            <dt>마감</dt>
            <dd className="font-semibold tabular-nums">{formatDate(recruitment.recruitDeadline)}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
