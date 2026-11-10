import type { Metadata } from "next";
import { Suspense } from "react";
import { PROJECTS_PATH, PROJECT_NEW_PATH } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { ProjectList, ProjectListSkeleton } from "@/app/(site)/developer/projects/_components/ProjectList/ProjectList";
import { SavedNotice } from "@/app/(site)/developer/projects/_components/SavedNotice/SavedNotice";
import { OverviewStats } from "@/app/(site)/developer/projects/_components/ProjectDashboard/ProjectDashboard";
import { readParticipationView } from "@/features/participation/view-preference";
import { getMyDashboard } from "@/features/recruitment/api";
import styles from "./page.module.css";

/* 내 프로젝트 목록 (/developer/projects) */

export const metadata: Metadata = { title: "내 프로젝트" };

export default function MyProjectsPage({ searchParams }: PageProps<"/developer/projects">) {
  return (
    <Container className={styles.myProjectsPage}>
      <div className={styles.myProjectsPageBox}>
        <h1 className={styles.myProjectsPageTitle}>내 프로젝트</h1>
        <LinkButton href={PROJECT_NEW_PATH}>프로젝트 등록</LinkButton>
      </div>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectsSlot searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

/* 위에서부터 전체 현황 → 프로젝트 카드. 프로젝트가 없으면 빈 상태만 보여 준다 */
async function ProjectsSlot({ searchParams }: Pick<PageProps<"/developer/projects">, "searchParams">) {
  const [{ projects, overview }, { notice }, view] = await Promise.all([getMyDashboard(PROJECTS_PATH), searchParams, readParticipationView()]);
  return (
    <div className={styles.projectsSlot}>
      <SavedNotice show={notice === "saved"} />
      {projects.length > 0 && <OverviewStats overview={overview} />}
      <section aria-labelledby="projects-heading" className={styles.projectsSlotSection}>
        {projects.length > 0 && (
          <h2 id="projects-heading" className={styles.projectsSlotTitle}>
            프로젝트 {projects.length}개
          </h2>
        )}
        <ProjectList projects={projects} view={view} />
      </section>
    </div>
  );
}
