import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { formatCredits, formatDate, formatDday } from "@/lib/format";
import type { PublicRecruitmentView } from "../service";
import { DEFAULT_PROJECT_IMAGE_URL, SELECTION_MODE_LABEL } from "../types";
import { ProjectDescription } from "./ProjectDescription";
import { RecruitmentStatusBadge } from "./StatusBadge";
import { TestItemImages } from "./TestItemImages";

/** 지원할 수 없을 때의 안내. 모집 중이면 지원 버튼을 보여 준다 */
const CLOSED_MESSAGE = {
  full: "정원이 모두 찼어요",
  testing: "모집이 마감됐어요",
  closed: "모집이 마감됐어요",
};

/**
 * 공개 모집글. 테스터가 지원 전에 일정, 인원, 보상을 확인하는 화면이다 (PRODUCT: 보상과 일정은 숨기지 않는다).
 * 넓은 화면은 오른쪽에 요약과 지원 버튼이 따라오고, 좁은 화면은 제목 바로 아래에 온다.
 * 접속 링크는 참여가 확정된 테스터에게만 안내하므로 보여 주지 않는다.
 */
export function PublicRecruitment({ post }: { post: PublicRecruitmentView }) {
  const { recruitment, detail, project, status, now } = post;
  const facts: Array<[string, string]> = [
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["피드백 제출 마감", formatDate(recruitment.submitDeadline)],
    ["인원", `${recruitment.confirmedCount} / ${recruitment.capacity}명`],
    ...(detail ? ([["선정 방식", SELECTION_MODE_LABEL[detail.selectionMode]]] as Array<[string, string]>) : []),
    ["기본 보상", formatCredits(recruitment.baseReward)],
  ];
  const description = project?.description || recruitment.summary;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <RecruitmentStatusBadge status={status} />
          {recruitment.isSubscription && <Badge tone="muted">구독 모집</Badge>}
          <Badge tone="outline">{SOFTWARE_TYPE_LABEL[recruitment.softwareType]}</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">{detail?.title || recruitment.request}</h1>
        {detail?.title && <p className="text-lg text-text-muted">{recruitment.request}</p>}
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside aria-label="모집 요약" className="flex flex-col gap-5 rounded-2xl bg-surface-muted p-6 lg:sticky lg:top-24 lg:order-last">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            {facts.map(([term, value]) => (
              <div key={term} className="flex flex-col gap-1">
                <dt className="text-xs text-text-muted">{term}</dt>
                <dd className="font-bold tabular-nums">
                  {value}
                  {term === "모집 마감" && status === "recruiting" && (
                    <span className="ml-2 text-sm font-semibold text-text-muted">{formatDday(recruitment.recruitDeadline, now)}</span>
                  )}
                </dd>
              </div>
            ))}
            {recruitment.extraReward !== undefined && (
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-text-muted">추가 보상</dt>
                <dd className="font-bold text-accent tabular-nums">+{formatCredits(recruitment.extraReward)}</dd>
              </div>
            )}
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

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="recruitment-project-heading" data-project-body className="flex flex-col gap-4">
            <h2 id="recruitment-project-heading" className="text-xl font-extrabold">
              {recruitment.projectName}
            </h2>
            {/* 등록 중인 이미지와 샘플 이미지를 같은 방식으로 보여 준다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project?.image?.url ?? DEFAULT_PROJECT_IMAGE_URL}
              alt={project?.image ? `${recruitment.projectName} 대표 이미지` : "기본 프로젝트 이미지"}
              className="aspect-[4/3] w-full max-w-md rounded-2xl bg-surface-muted object-contain outline -outline-offset-1 outline-line"
            />
            <ProjectDescription text={description} />
          </section>

          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold">모집 조건</h2>
            <p className="whitespace-pre-line text-sm text-text-muted">{detail?.conditions || "따로 정한 조건이 없어요"}</p>
          </Card>

          {detail && detail.testItems.length > 0 && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">
                테스트 항목 <span className="ml-1 text-text-muted tabular-nums">{detail.testItems.length}</span>
              </h2>
              <ol className="flex flex-col gap-3">
                {detail.testItems.map((item, index) => (
                  <li key={item.id} className="flex flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {index + 1}. {item.title}
                      <Badge tone={item.required ? "neutral" : "outline"}>{item.required ? "필수" : "선택"}</Badge>
                    </p>
                    {item.description && <p className="text-sm text-text-muted">{item.description}</p>}
                    <TestItemImages item={item} />
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
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-64 rounded-2xl lg:order-last" />
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-[4/3] w-full max-w-md rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
