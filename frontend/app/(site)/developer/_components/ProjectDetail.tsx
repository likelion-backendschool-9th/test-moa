import Link from "next/link";
import type { ReactNode } from "react";
import { projectEditPath, recruitmentCreatePath, recruitmentManagePath } from "@/features/project/paths";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import type { RecruitmentView } from "@/features/recruitment/types";
import { DEFAULT_PROJECT_IMAGE_URL, type Project } from "@/features/project/types";
import { ProjectDescription } from "@/features/project/components/ProjectDescription";
import { RecruitmentStatusBadge } from "@/features/recruitment/components/RecruitmentStatusBadge";

/* 프로젝트 상세 화면: 프로젝트 정보와 모집 건 목록 */

export type ProjectBodyData = Pick<Project, "name" | "description" | "image">;

/** 새 탭으로 여는 링크. 화면 읽기 프로그램에 새 탭임을 알린다 */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold underline">
      {children}
      <span className="sr-only"> (새 탭)</span>
    </a>
  );
}

/**
 * 프로젝트 내용(이름, 설명, 이미지). 상세 화면과 등록 폼 미리보기가 같이 써서 보이는 모습이 같다.
 * 미리보기는 페이지 제목이 따로 있어서 이름을 h3로 내린다.
 */
export function ProjectBody({
  project,
  titleAs: Title = "h1",
  children,
}: {
  project: ProjectBodyData;
  titleAs?: "h1" | "h3";
  children?: ReactNode;
}) {
  return (
    <div data-project-body className="@container">
      {/*
        좁은 화면과 미리보기는 이름·설명 → 이미지 → 버튼 순서로 쌓고,
        넓은 상세 화면은 왼쪽에 설명과 버튼, 오른쪽에 이미지를 나란히 둔다. 이미지는 이름 아래, 설명과 같은 높이에서 시작한다.
        글이 이미지보다 짧아도 버튼이 글 바로 아래에 오도록 마지막 줄이 남는 높이를 받는다.
      */}
      <div
        className="flex flex-col gap-4 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_41.6667%] @3xl:grid-rows-[auto_auto_1fr] @3xl:gap-x-6"
      >
        <div className="flex min-w-0 flex-col gap-4 @3xl:col-span-2">
          <Title className={Title === "h1" ? "text-4xl font-extrabold tracking-[-0.035em]" : "text-2xl font-extrabold tracking-[-0.03em]"}>
            {project.name || "프로젝트 이름"}
          </Title>
        </div>
        {project.description && (
          <div className="min-w-0 @3xl:col-start-1 @3xl:row-start-2">
            <ProjectDescription text={project.description} />
          </div>
        )}
        <div className="w-full max-w-md @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-2 @3xl:max-w-none">
          {/* 등록 중인 이미지는 브라우저 안의 임시 주소(blob:)라 next/image를 쓸 수 없다 */}
          {/* 이미지마다 비율이 달라도 잘리지 않게 칸 안에 맞춘다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.image?.url ?? DEFAULT_PROJECT_IMAGE_URL}
            alt={project.image ? `${project.name || "프로젝트"} 대표 이미지` : "기본 프로젝트 이미지"}
            className="aspect-[4/3] w-full rounded-2xl bg-surface-muted object-contain outline -outline-offset-1 outline-line"
          />
        </div>
        {children && <div className="flex min-w-0 flex-col gap-4 @3xl:col-start-1 @3xl:row-start-3">{children}</div>}
      </div>
    </div>
  );
}

/** 프로젝트 정보와 수정·모집글 작성 버튼 */
export function ProjectInfo({ project }: { project: Project }) {
  return (
    <ProjectBody project={project}>
      <div className="flex flex-wrap gap-2 pt-2">
        <LinkButton href={recruitmentCreatePath(project.key)}>모집글 작성</LinkButton>
        <LinkButton href={projectEditPath(project.key)} variant="secondary">
          수정
        </LinkButton>
      </div>
    </ProjectBody>
  );
}

/** 프로젝트의 모집 건 목록. 항목을 누르면 관리 화면으로 간다 */
export function ProjectRecruitmentList({ projectKey, recruitments }: { projectKey: string; recruitments: RecruitmentView[] }) {
  if (recruitments.length === 0) {
    return (
      <EmptyState
        title="아직 테스트 모집이 없어요"
        description="모집 조건과 일정을 정해 테스터를 모아 보세요."
        action={<LinkButton href={recruitmentCreatePath(projectKey)}>모집글 작성</LinkButton>}
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
            <Link href={recruitmentManagePath(item.slug)} className="font-bold hover:underline">
              {item.title || item.request}
            </Link>
            <p className="text-sm text-text-muted">
              확정 {item.confirmedCount}명 · 모집 마감 {formatDate(item.recruitDeadline)} · 제출 마감{" "}
              {formatDate(item.submitDeadline)}
            </p>
          </div>
          {/* 취소된 모집은 공개 페이지가 없다 */}
          {item.status !== "cancelled" && (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/recruitments/${item.slug}`} className="text-sm font-semibold text-text-muted hover:text-text">
                공개 페이지 보기
              </Link>
              {/* 동작은 아직 정하지 않았다 (#64) */}
              <Button size="sm" variant="secondary">
                <span className="sr-only">{item.title || item.request} </span>
                분석하기
              </Button>
            </div>
          )}
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
