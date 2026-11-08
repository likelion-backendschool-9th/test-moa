import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PROJECTS_PATH, projectPath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { DetailSkeleton, ProjectInfo, ProjectRecruitmentList } from "@/app/(site)/developer/_components/ProjectDetail/ProjectDetail";
import { SavedNotice } from "@/app/(site)/developer/projects/_components/SavedNotice/SavedNotice";
import { getMyProject } from "@/features/recruitment/api";
import styles from "./page.module.css";

/* 프로젝트 상세 (/developer/projects/:projectKey) */

export const metadata: Metadata = { title: "프로젝트 상세" };

type Props = PageProps<"/developer/projects/[projectKey]">;

export default function ProjectPage({ params, searchParams }: Props) {
  return (
    <Container className={styles.projectPage}>
      <Suspense fallback={<DetailSkeleton />}>
        <ProjectSlot params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ProjectSlot({ params, searchParams }: Props) {
  const { projectKey } = await params;
  const [{ project, recruitments }, { notice }] = await Promise.all([
    getMyProject(projectPath(projectKey), projectKey),
    searchParams,
  ]);
  return (
    <div className={styles.projectSlot}>
      <Link href={PROJECTS_PATH} className={styles.projectSlotLink}>
        내 프로젝트로 돌아가기
      </Link>
      <SavedNotice show={notice === "saved"} />
      <ProjectInfo project={project} />
      <section aria-labelledby="recruitments-heading" className={styles.projectSlotSection}>
        <h2 id="recruitments-heading" className={styles.projectSlotTitle}>
          모집글 관리
        </h2>
        <ProjectRecruitmentList projectKey={project.key} recruitments={recruitments} />
      </section>
    </div>
  );
}
