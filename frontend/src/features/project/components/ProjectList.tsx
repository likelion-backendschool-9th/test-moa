import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import type { ProjectSummary } from "../service";

/* 내 프로젝트 목록 화면의 카드 그리드 */

/** 내 프로젝트 카드 목록. 비어 있으면 등록 안내를 보여 준다 */
export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="아직 등록한 프로젝트가 없어요"
        description="테스트받고 싶은 서비스를 프로젝트로 등록하면 테스터를 모집할 수 있어요."
        action={<LinkButton href="/my/projects/new">프로젝트 등록</LinkButton>}
      />
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.key}>
          <Link
            href={`/my/projects/${project.key}`}
            className="group block h-full rounded-2xl"
          >
            <Card className="flex h-full flex-col gap-3 border border-line transition-colors duration-300 ease-brand group-hover:bg-surface-strong">
              <p className="text-xs text-text-muted">{SOFTWARE_TYPE_LABEL[project.softwareType]}</p>
              <h3 className="text-lg font-extrabold">{project.name}</h3>
              <p className="text-sm text-text-muted">{project.summary}</p>
              <p className="mt-auto text-sm font-semibold">
                모집 {project.recruitmentCount}건 · 모집 중 {project.openRecruitmentCount}건
              </p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** 목록을 불러오는 동안 보이는 카드 모양 자리 */
export function ProjectListSkeleton() {
  return (
    <div data-testid="project-skeleton" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-44 rounded-2xl" />
      ))}
    </div>
  );
}
