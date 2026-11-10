import { participationPath } from "@/features/participation/paths";
import { Card } from "@/components/ui/Card/Card";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatDate, formatDday, seoulDayKey } from "@/lib/format";
import type { ParticipationItem } from "@/features/participation/types";
import { DeadlineCalendar } from "../DeadlineCalendar/DeadlineCalendar";
import styles from "./DeadlinePanel.module.css";

/**
 * 내가 피드백을 제출해야 하는 참여의 마감. 왼쪽은 마감 캘린더, 오른쪽은 마감이 가까운 순서의 목록이고 좁으면 위아래로 쌓인다.
 * 이 화면의 주 버튼(강조색)은 목록 맨 위 하나뿐이고 나머지는 보조 버튼이다.
 */
export function DeadlinePanel({ items, now }: { items: ParticipationItem[]; now: Date }) {
  const deadlines = items.map((item) => ({ day: seoulDayKey(item.recruitment.submitDeadline), name: item.recruitment.projectName }));
  return (
    <div className={styles.layout}>
      <Card as="section" aria-labelledby="deadline-calendar-heading" className={styles.section}>
        <h2 id="deadline-calendar-heading" className={styles.title}>
          마감 캘린더
        </h2>
        <DeadlineCalendar deadlines={deadlines} today={seoulDayKey(now.toISOString())} />
      </Card>
      <Card as="section" aria-labelledby="deadline-list-heading" className={styles.section2}>
        <h2 id="deadline-list-heading" className={styles.title2}>
          마감 임박 테스트 <span className={styles.length}>{items.length}</span>
        </h2>
        {items.length === 0 && <p className={styles.text2}>제출이 임박한 테스트가 없어요</p>}
        <ul className={styles.list}>
          {items.map((item, index) => {
            const { recruitment } = item;
            return (
              <li key={item.key} data-testid="deadline-item" className={styles.root}>
                <div className={styles.box}>
                  <p className={styles.text}>
                    {recruitment.projectName}
                    <span className={styles.label}>{formatDday(recruitment.submitDeadline, now)}</span>
                  </p>
                  <p className={styles.text2}>
                    {recruitment.request} · 제출 마감 <span className={styles.label2}>{formatDate(recruitment.submitDeadline)}</span>
                  </p>
                </div>
                <LinkButton href={participationPath(item.key)} variant={index === 0 ? "primary" : "secondary"} size="sm">
                  <span className={styles.srOnly}>{recruitment.projectName} </span>
                  피드백 쓰기
                </LinkButton>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export function DeadlinePanelSkeleton() {
  return (
    <div data-skeleton="panel" aria-busy="true" aria-label="마감 일정 불러오는 중" className={styles.layout}>
      {Array.from({ length: 2 }, (_, index) => (
        <Card key={index} className={styles.deadlinePanelSkeleton}>
          <Skeleton className={styles.deadlinePanelSkeletonSkeleton} />
          <Skeleton className={styles.deadlinePanelSkeletonSkeleton2} />
        </Card>
      ))}
    </div>
  );
}
