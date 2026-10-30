import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { formatDate } from "@/lib/format";
import type { RecruitmentView } from "../service";
import type { Project } from "../types";
import { RecruitmentStatusBadge } from "./StatusBadge";

/* 프로젝트 상세 화면: 프로젝트 정보와 모집 건 목록 */

/** 프로젝트 정보와 수정·모집 작성 버튼 */
export function ProjectInfo({ project }: { project: Project }) {
  const base = `/my/projects/${project.key}`;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">{SOFTWARE_TYPE_LABEL[project.softwareType]}</p>
      <h1 className="text-4xl font-extrabold tracking-[-0.035em]">{project.name}</h1>
      <p className="text-lg text-text-muted">{project.summary}</p>
      <a href={project.accessUrl} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold underline">
        {project.accessUrl}
        <span className="sr-only"> (새 탭)</span>
      </a>
      <div className="flex flex-wrap gap-2 pt-2">
        <LinkButton href={`${base}/recruitments/new`}>테스트 모집 작성</LinkButton>
        <LinkButton href={`${base}/edit`} variant="secondary">
          수정
        </LinkButton>
      </div>
    </div>
  );
}

/** 프로젝트의 모집 건 목록. 항목을 누르면 관리 화면으로 간다 */
export function ProjectRecruitmentList({ projectKey, recruitments }: { projectKey: string; recruitments: RecruitmentView[] }) {
  if (recruitments.length === 0) {
    return (
      <EmptyState
        title="아직 테스트 모집이 없어요"
        description="모집 조건과 일정을 정해 테스터를 모아 보세요."
        action={<LinkButton href={`/my/projects/${projectKey}/recruitments/new`}>테스트 모집 작성</LinkButton>}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {recruitments.map((item) => (
        <li key={item.slug} className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-5 md:flex-row md:items-center">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <RecruitmentStatusBadge status={item.status} />
              {item.isSubscription && <Badge tone="muted">구독 모집</Badge>}
            </div>
            <Link href={`/my/projects/${projectKey}/recruitments/${item.slug}`} className="font-bold hover:underline">
              {item.request}
            </Link>
            <p className="text-sm text-text-muted">
              확정 {item.confirmedCount} / 정원 {item.capacity}명 · 모집 마감 {formatDate(item.recruitDeadline)} · 제출 마감{" "}
              {formatDate(item.submitDeadline)}
            </p>
          </div>
          <Link href={`/recruitments/${item.slug}`} className="text-sm font-semibold text-text-muted hover:text-text">
            공개 페이지 보기
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** 상세 화면들을 불러오는 동안 보이는 자리 */
export function DetailSkeleton() {
  return (
    <div data-testid="project-skeleton" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-96 max-w-full" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
