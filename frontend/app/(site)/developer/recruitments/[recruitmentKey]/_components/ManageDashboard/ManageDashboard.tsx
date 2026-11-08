import { Card } from "@/components/ui/Card/Card";
import styles from "./ManageDashboard.module.css";

/*
 * 모집 관리 탭 맨 위 현황 한 줄. 왼쪽은 "값 / 전체" 게이지, 흐린 세로선 뒤로 숫자 몇 개를 둔다.
 * 테스터 관리(확정 / 지원)와 피드백(제출 / 확정)이 같이 쓴다
 */

type ManageDashboardProps = {
  id: string;
  /** 게이지 제목. 예: "확정 / 지원" */
  title: string;
  value: number;
  total: number;
  /** 값 앞 이름. 예: "확정" → "확정 13명" */
  valueLabel: string;
  /** 전체 이름. 읽는 프로그램에 "지원자 22명 중 13명 확정"으로 알린다 */
  totalLabel: string;
  valueTestId?: string;
  stats: Array<[term: string, value: string]>;
};

export function ManageDashboard({ id, title, value, total, valueLabel, totalLabel, valueTestId, stats }: ManageDashboardProps) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <Card as="section" aria-labelledby={id} className={styles.dashboard}>
      <div className={styles.gauge}>
        <div className={styles.gaugeHead}>
          <h2 id={id} className={styles.gaugeTitle}>
            {title}
          </h2>
          <p className={styles.gaugeValue}>
            <span data-testid={valueTestId}>
              {valueLabel} {value}명
            </span>
            <span className={styles.gaugeTotal}>
              {" "}
              / {total}명 · {percent}%
            </span>
          </p>
        </div>
        <div
          role="meter"
          aria-labelledby={id}
          aria-valuemin={0}
          aria-valuemax={Math.max(total, 1)}
          aria-valuenow={value}
          aria-valuetext={`${totalLabel} ${total}명 중 ${value}명 ${valueLabel}`}
          className={styles.gaugeTrack}
        >
          <div className={styles.gaugeFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
      <dl className={styles.stats}>
        {stats.map(([term, statValue]) => (
          <div key={term} className={styles.stat}>
            <dt className={styles.statTerm}>{term}</dt>
            <dd className={styles.statValue}>{statValue}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
