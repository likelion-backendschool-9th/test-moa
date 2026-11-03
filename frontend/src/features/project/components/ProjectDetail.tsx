import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { formatDate } from "@/lib/format";
import { formatBytes } from "../media";
import type { RecruitmentView } from "../service";
import type { Project } from "../types";
import { RecruitmentStatusBadge } from "./StatusBadge";

/* 프로젝트 상세 화면: 프로젝트 정보와 모집 건 목록 */

export type ProjectBodyData = Pick<
  Project,
  "name" | "summary" | "softwareType" | "accessUrl" | "description" | "images" | "links" | "attachments"
>;

/** 새 탭으로 여는 링크. 화면 읽기 프로그램에 새 탭임을 알린다 */
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold underline">
      {children}
      <span className="sr-only"> (새 탭)</span>
    </a>
  );
}

/**
 * 프로젝트 내용(이미지, 이름, 소개, 링크, 설명, 첨부). 상세 화면과 등록 폼 미리보기가 같이 써서 보이는 모습이 같다.
 * 미리보기는 페이지 제목이 따로 있어서 이름을 h3로 내린다.
 */
export function ProjectBody({ project, titleAs: Title = "h1" }: { project: ProjectBodyData; titleAs?: "h1" | "h3" }) {
  const [cover, ...rest] = project.images;
  return (
    <div className="flex flex-col gap-4">
      {cover && (
        <div className="flex flex-col gap-2">
          {/* 등록 중인 이미지는 브라우저 안의 임시 주소(blob:)라 next/image를 쓸 수 없다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.url} alt={`${project.name || "프로젝트"} 대표 이미지`} className="aspect-video w-full rounded-2xl bg-surface-strong object-cover" />
          {rest.length > 0 && (
            <ul className="grid grid-cols-4 gap-2">
              {rest.map((image) => (
                <li key={image.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className="aspect-video w-full rounded-xl bg-surface-strong object-cover" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-sm text-text-muted">{SOFTWARE_TYPE_LABEL[project.softwareType]}</p>
      <Title className={Title === "h1" ? "text-4xl font-extrabold tracking-[-0.035em]" : "text-2xl font-extrabold tracking-[-0.03em]"}>
        {project.name || "프로젝트 이름"}
      </Title>
      <p className="text-lg text-text-muted">{project.summary || "한 줄 소개"}</p>
      {project.accessUrl && <ExternalLink href={project.accessUrl}>{project.accessUrl}</ExternalLink>}
      {project.description && <p className="whitespace-pre-line">{project.description}</p>}
      {project.links.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">링크</p>
          <ul className="flex flex-col gap-1">
            {project.links.map((link, index) => (
              <li key={index}>
                <ExternalLink href={link.url}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      )}
      {project.attachments.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">첨부파일</p>
          {/* 시연용이라 실제 파일이 없어 이름과 크기만 보여 준다 */}
          <ul className="flex flex-col gap-1">
            {project.attachments.map((file, index) => (
              <li key={index} className="text-sm">
                {file.name} <span className="text-text-muted">· {formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 프로젝트 정보와 수정·모집 작성 버튼 */
export function ProjectInfo({ project }: { project: Project }) {
  const base = `/my/projects/${project.key}`;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <ProjectBody project={project} />
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
              확정 {item.confirmedCount}명 · 정원 {item.capacity}명 · 모집 마감 {formatDate(item.recruitDeadline)} · 제출 마감{" "}
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
