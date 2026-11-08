import Link from "next/link";
import { participationsPath } from "@/features/participation/paths";
import { PROJECTS_PATH } from "@/features/project/paths";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import type { Activity } from "@/features/member/types";
import { ActivityGroup } from "../ActivityGroup/ActivityGroup";
import { Card } from "@/components/ui/Card/Card";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./ActivitySummary.module.css";

type Stat = { label: string; count: number; href: string };

/** 테스트 참여와 내 프로젝트를 한 카드에. 한 계정이 둘 다 한다 */
export function ActivitySummary({ activity }: { activity: Activity }) {
  const { participation, project } = activity;
  const participationStats: Stat[] = [
    { label: "지원", count: participation.applied, href: participationsPath("applied") },
    { label: "참여 중", count: participation.ongoing, href: participationsPath("ongoing") },
    { label: "완료", count: participation.completed, href: participationsPath("history") },
  ];
  const projectStats: Stat[] = [
    { label: "프로젝트", count: project.projects, href: PROJECTS_PATH },
    { label: "모집 중", count: project.recruiting, href: PROJECTS_PATH },
    { label: "새 피드백", count: project.newFeedback, href: PROJECTS_PATH },
  ];
  return (
    <AccountCard as="section" aria-labelledby="my-activity-heading">
      <AccountCardTitle id="my-activity-heading">
        활동 요약
      </AccountCardTitle>
      <div className={styles.box}>
        <ActivityGroup kind="participation">
          <StatList stats={participationStats} />
        </ActivityGroup>
        <ActivityGroup kind="project">
          {project.projects > 0 ? (
            <StatList stats={projectStats} />
          ) : (
            <Card as="div" radius="lg" className={styles.box2}>
              <p className={styles.text}>아직 등록한 프로젝트가 없어요</p>
              <LinkButton href={PROJECTS_PATH} variant="secondary" size="sm">
                내 프로젝트
              </LinkButton>
            </Card>
          )}
        </ActivityGroup>
      </div>
    </AccountCard>
  );
}

function StatList({ stats }: { stats: Stat[] }) {
  return (
    <ul className={styles.statList}>
      {stats.map((stat) => (
        <li key={stat.label}>
          <Card as={Link} radius="lg"
            href={stat.href}
            aria-label={`${stat.label} ${stat.count}`}
            className={styles.statListLink}
          >
            <span className={styles.statListLabel}>{stat.label}</span>
            <span className={styles.statListCount}>{stat.count}</span>
          </Card>
        </li>
      ))}
    </ul>
  );
}
