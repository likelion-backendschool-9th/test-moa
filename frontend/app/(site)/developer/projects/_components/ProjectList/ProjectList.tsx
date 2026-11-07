import Link from "next/link";
import { PROJECT_NEW_PATH, projectPath } from "@/features/project/paths";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { ProjectSummary } from "@/features/recruitment/types";
import styles from "./ProjectList.module.css";

/* 내 프로젝트 목록 화면의 카드 그리드 */

/** 내 프로젝트 카드 목록. 비어 있으면 등록 안내를 보여 준다 */
export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="아직 등록한 프로젝트가 없어요"
        description="테스트받고 싶은 서비스를 프로젝트로 등록하면 테스터를 모집할 수 있어요."
        action={<LinkButton href={PROJECT_NEW_PATH}>프로젝트 등록</LinkButton>}
      />
    );
  }
  return (
    <ul className={styles.root}>
      {projects.map((project) => (
        <li key={project.key}>
          <Link
            href={projectPath(project.key)}
            className={styles.link}
          >
            <Card className={styles.card}>
              <h3 className={styles.name}>{project.name}</h3>
              <p className={styles.text}>
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
    <div data-testid="project-skeleton" className={styles.projectListSkeleton}>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className={styles.projectListSkeleton2} />
      ))}
    </div>
  );
}
