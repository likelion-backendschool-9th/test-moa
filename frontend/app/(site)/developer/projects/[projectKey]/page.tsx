import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PROJECTS_PATH, projectPath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { DetailSkeleton, ProjectInfo, ProjectRecruitmentList } from "@/app/(site)/developer/_components/ProjectDetail/ProjectDetail";
import { SavedNotice } from "@/app/(site)/developer/projects/_components/SavedNotice/SavedNotice";
import { DeleteProjectButton } from "./_components/DeleteProjectButton/DeleteProjectButton";
import { getProjectDetail } from "@/features/recruitment/api";
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
    getProjectDetail(projectPath(projectKey), projectKey),
    searchParams,
  ]);
  return (
    <div className={styles.projectSlot}>
      <Link href={PROJECTS_PATH} className={styles.projectSlotLink}>
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        내 프로젝트로 돌아가기
      </Link>
      <SavedNotice show={notice === "saved"} />
      <ProjectInfo project={project} />
      <section aria-labelledby="recruitments-heading" className={styles.projectSlotSection}>
        <div className={styles.projectSlotHeader}>
          <h2 id="recruitments-heading" className={styles.projectSlotTitle}>
            모집글 관리
          </h2>
          {recruitments.length > 0 && <p className={styles.projectSlotCount}>모집글 {recruitments.length}개</p>}
        </div>
        <ProjectRecruitmentList projectKey={project.key} recruitments={recruitments} />
      </section>
      {/* 모집글이 하나도 없을 때만 지울 수 있다. 취소한 모집글도 버전과 참여 기록이 있어 센다 */}
      <section aria-labelledby="delete-heading" className={styles.projectSlotDelete}>
        <h2 id="delete-heading" className={styles.projectSlotDeleteTitle}>
          프로젝트 삭제
        </h2>
        {recruitments.length === 0 ? (
          <>
            <p className={styles.projectSlotDeleteText}>모집글을 올리기 전에만 삭제할 수 있어요. 삭제하면 되돌릴 수 없어요.</p>
            <div className={styles.projectSlotDeleteAction}>
              <DeleteProjectButton projectKey={project.key} projectName={project.name} />
            </div>
          </>
        ) : (
          <p className={styles.projectSlotDeleteText}>모집글이 있는 프로젝트는 삭제할 수 없어요.</p>
        )}
      </section>
    </div>
  );
}
