import type { Metadata } from "next";
import { Suspense } from "react";
import { PROJECTS_PATH, PROJECT_NEW_PATH } from "@/lib/project-paths";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/LinkButton";
import { ProjectList, ProjectListSkeleton } from "@/app/(site)/developer/projects/_components/ProjectList";
import { SavedNotice } from "@/app/(site)/developer/projects/_components/SavedNotice";
import { OverviewStats, TodoList } from "@/app/(site)/developer/projects/_components/ProjectDashboard";
import { getMyDashboard } from "@/features/project/service";

/* 내 프로젝트 목록 (/developer/projects) */

export const metadata: Metadata = { title: "내 프로젝트" };

export default function MyProjectsPage({ searchParams }: PageProps<"/developer/projects">) {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em]">내 프로젝트</h1>
        <LinkButton href={PROJECT_NEW_PATH}>프로젝트 등록</LinkButton>
      </div>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectsSlot searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

/* 위에서부터 지금 확인할 일 → 전체 현황 → 프로젝트 카드. 프로젝트가 없으면 빈 상태만 보여 준다 */
async function ProjectsSlot({ searchParams }: Pick<PageProps<"/developer/projects">, "searchParams">) {
  const [{ projects, todos, overview }, { notice }] = await Promise.all([getMyDashboard(PROJECTS_PATH), searchParams]);
  return (
    <div className="flex flex-col gap-10">
      <SavedNotice show={notice === "saved"} />
      {projects.length > 0 && <TodoList todos={todos} />}
      {projects.length > 0 && <OverviewStats overview={overview} />}
      <section aria-labelledby="projects-heading" className="flex flex-col gap-3">
        {projects.length > 0 && (
          <h2 id="projects-heading" className="text-xl font-extrabold tracking-[-0.03em]">
            프로젝트 {projects.length}개
          </h2>
        )}
        <ProjectList projects={projects} />
      </section>
    </div>
  );
}
