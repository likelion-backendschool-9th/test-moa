import { PROJECT_NEW_PATH, projectPath } from "@/features/project/paths";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { RecruitmentThumb } from "@/features/recruitment/components/RecruitmentThumb/RecruitmentThumb";
import type { ProjectSummary } from "@/features/recruitment/types";
import styles from "./ProjectList.module.css";

/* 내 프로젝트 목록 화면의 행 리스트. 참여 테스트 목록의 행(ParticipationRow)과 같은 모양이다 */

/** 내 프로젝트 행 목록. 비어 있으면 등록 안내를 보여 준다 */
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
          <Card className={styles.card}>
            <div className={styles.thumb}>
              <RecruitmentThumb recruitment={{ projectName: project.name, projectImage: project.image?.url }} />
            </div>
            <div className={styles.box}>
              <h3 className={styles.name}>{project.name}</h3>
              <p className={styles.badges}>
                <Badge tone={project.openRecruitmentCount > 0 ? "neutral" : "muted"}>
                  {project.openRecruitmentCount > 0 ? "모집 중" : "모집 없음"}
                </Badge>
              </p>
              <dl className={styles.list}>
                <div>
                  <dt className={styles.term}>전체 모집</dt>
                  <dd className={styles.value}>{project.recruitmentCount}건</dd>
                </div>
                <div>
                  <dt className={styles.term}>모집 중</dt>
                  <dd className={styles.value}>{project.openRecruitmentCount}건</dd>
                </div>
              </dl>
            </div>
            <LinkButton href={projectPath(project.key)} variant="secondary" size="sm" className={styles.button}>
              <span className={styles.srOnly}>{project.name} </span>
              상세 보기
            </LinkButton>
          </Card>
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
