import type { ProjectOverview } from "@/features/recruitment/types";
import { Card } from "@/components/ui/Card/Card";
import styles from "./ProjectDashboard.module.css";

/* 내 프로젝트 화면 위쪽의 "전체 현황" */

/** 모든 프로젝트를 합친 숫자 세 개. 완료는 테스트까지 마친 모집글이다 */
export function OverviewStats({ overview }: { overview: ProjectOverview }) {
  const tiles = [
    ["모집 중", `${overview.recruiting}건`],
    ["테스트 중", `${overview.testing}건`],
    ["테스트까지 완료", `${overview.closed}건`],
  ];
  return (
    <section aria-labelledby="overview-heading" className={styles.overviewStats}>
      <h2 id="overview-heading" className={styles.overviewStatsTitle}>
        전체 현황
      </h2>
      <dl className={styles.overviewStatsList}>
        {tiles.map(([term, value]) => (
          <Card as="div" key={term} className={styles.overviewStats2}>
            <dt className={styles.overviewStatsTerm}>{term}</dt>
            <dd className={styles.overviewStatsValue}>{value}</dd>
          </Card>
        ))}
      </dl>
    </section>
  );
}
