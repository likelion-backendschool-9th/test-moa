import { CheckIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { cn } from "@/lib/cn";
import { formatCredits, formatDate, formatDday } from "@/lib/format";
import type { PublicRecruitmentView } from "@/features/recruitment/types";
import { DEFAULT_PROJECT_IMAGE_URL } from "@/features/project/types";
import { SELECTION_MODE_LABEL } from "@/features/recruitment/types";
import { ProjectDescription } from "@/features/project/components/ProjectDescription";
import { RecruitmentGallery, type GalleryImage } from "@/features/recruitment/components/RecruitmentGallery";
import { RecruitmentStatusBadge } from "@/features/recruitment/components/RecruitmentStatusBadge";
import { TestItemImages } from "@/features/recruitment/components/TestItemImages";

/** 지원할 수 없을 때의 안내. 모집 중이면 지원 버튼을 보여 준다 */
const CLOSED_MESSAGE = {
  testing: "모집이 마감됐어요",
  closed: "모집이 마감됐어요",
};

/** 넓은 화면에서 왼쪽에 이미지와 본문, 오른쪽에 요약을 둔다. 좁은 화면은 이미지 → 요약 → 본문 순서다 */
const LAYOUT_CLASS = "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]";
const SUMMARY_PLACE_CLASS = "lg:col-start-2 lg:row-span-2 lg:row-start-1";

/**
 * 공개 모집글. 테스터가 지원 전에 일정, 보상을 확인하는 화면이다 (PRODUCT: 보상과 일정은 숨기지 않는다).
 * 요약은 보상을 크게, 일정과 선정 방식을 작게 두어 먼저 볼 숫자가 드러나게 한다.
 * 접속 링크는 참여가 확정된 테스터에게만 안내하므로 보여 주지 않는다.
 */
export function PublicRecruitment({ post }: { post: PublicRecruitmentView }) {
  const { recruitment, detail, project, status, now } = post;
  const keyFacts: Array<{ term: string; value: string; accent?: boolean }> = [
    { term: "기본 보상", value: formatCredits(recruitment.baseReward) },
    ...(recruitment.extraReward !== undefined ? [{ term: "추가 보상", value: `+${formatCredits(recruitment.extraReward)}`, accent: true }] : []),
  ];
  const scheduleFacts: Array<[string, string]> = [
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["피드백 제출 마감", formatDate(recruitment.submitDeadline)],
    ...(detail ? ([["선정 방식", SELECTION_MODE_LABEL[detail.selectionMode]]] as Array<[string, string]>) : []),
  ];
  const description = project?.description || recruitment.summary;
  const conditions = detail?.conditions.split("\n").filter((line) => line.trim()) ?? [];
  const testItems = detail?.testItems ?? [];
  const requiredCount = testItems.filter((item) => item.required).length;
  /* 대표 이미지 다음에 모집글 이미지를 등록한 순서대로 잇는다. 테스트 항목 이미지는 각 항목 아래에만 둔다 (#124) */
  const gallery: GalleryImage[] = [
    {
      url: project?.image?.url ?? DEFAULT_PROJECT_IMAGE_URL,
      alt: project?.image ? `${recruitment.projectName} 대표 이미지` : "기본 프로젝트 이미지",
      badge: project?.image ? "대표 이미지" : undefined,
    },
    ...(detail?.images ?? []).map((image) => ({ url: image.url, alt: image.name })),
  ];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <RecruitmentStatusBadge status={status} />
          {recruitment.extraReward !== undefined && <Badge tone="muted">추가 보상</Badge>}
          <Badge tone="outline">{SOFTWARE_TYPE_LABEL[recruitment.softwareType]}</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">{detail?.title || recruitment.request}</h1>
        {detail?.title && <p className="text-lg text-text-muted">{recruitment.request}</p>}
      </header>

      <div data-project-body className={LAYOUT_CLASS}>
        <div className="min-w-0">
          <RecruitmentGallery images={gallery} label={`${recruitment.projectName} 이미지 ${gallery.length}장`} />
        </div>

        <aside aria-label="모집 요약" className={`flex flex-col gap-6 rounded-2xl bg-surface-muted p-6 lg:sticky lg:top-24 ${SUMMARY_PLACE_CLASS}`}>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-5">
            {keyFacts.map(({ term, value, accent }) => (
              <div key={term} className="flex flex-col gap-1">
                <dt className="text-sm text-text-muted">{term}</dt>
                <dd className={cn("text-xl font-extrabold tracking-[-0.03em] tabular-nums lg:text-3xl", accent && "text-accent")}>{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="flex flex-col gap-3 border-t border-line pt-5 text-sm">
            {scheduleFacts.map(([term, value]) => (
              <div key={term} className="flex items-baseline justify-between gap-4">
                <dt className="text-text-muted">{term}</dt>
                <dd className="text-right font-bold tabular-nums">
                  {value}
                  {term === "모집 마감" && status === "recruiting" && (
                    <span className="ml-2 font-semibold text-text-muted">{formatDday(recruitment.recruitDeadline, now)}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {status === "recruiting" ? (
            <LinkButton href={`/recruitments/${recruitment.slug}/apply`} className="w-full">
              지원하기
            </LinkButton>
          ) : (
            <p role="status" className="rounded-xl bg-surface-strong px-4 py-3 text-center text-sm font-bold">
              {CLOSED_MESSAGE[status]}
            </p>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-4 md:p-8">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{recruitment.projectName}</h2>
            <ProjectDescription text={description} />
          </Card>

          <Card className="flex flex-col gap-4 md:p-8">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">모집 조건</h2>
            {conditions.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {conditions.map((condition) => (
                  <li key={condition} className="flex gap-3">
                    <CheckIcon aria-hidden size={20} weight="bold" className="mt-0.5 shrink-0 text-text-muted" />
                    <span className="min-w-0 break-words">{condition}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted">따로 정한 조건이 없어요</p>
            )}
          </Card>

          {testItems.length > 0 && (
            <Card className="flex flex-col gap-6 md:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
                  테스트 항목 <span className="ml-1 text-text-muted tabular-nums">{testItems.length}</span>
                </h2>
                <p className="text-sm text-text-muted tabular-nums">
                  필수 {requiredCount} · 선택 {testItems.length - requiredCount}
                </p>
              </div>
              <ol className="flex flex-col divide-y divide-line">
                {testItems.map((item, index) => (
                  <li key={item.id} className="flex gap-3 py-6 first:pt-0 last:pb-0 md:gap-4">
                    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-sm font-bold tabular-nums">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex min-h-8 flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{item.title}</h3>
                        <Badge tone={item.required ? "neutral" : "outline"}>{item.required ? "필수" : "선택"}</Badge>
                      </div>
                      {item.description && <p className="max-w-prose leading-relaxed break-words text-text-muted">{item.description}</p>}
                      <div className="pt-2 empty:hidden">
                        <TestItemImages item={item} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </article>
  );
}

export function PublicRecruitmentSkeleton() {
  return (
    <div data-skeleton="recruitment" aria-busy="true" aria-label="모집글 불러오는 중" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-96 max-w-full" />
      </div>
      <div className={LAYOUT_CLASS}>
        <Skeleton className="aspect-[4/3] w-full max-w-md rounded-2xl" />
        <Skeleton className={`h-96 rounded-2xl ${SUMMARY_PLACE_CLASS}`} />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}
