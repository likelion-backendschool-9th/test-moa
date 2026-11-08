import Link from "next/link";
import type { ProjectOverview, TodoItem } from "@/features/recruitment/types";
import { Card } from "@/components/ui/Card/Card";
import styles from "./ProjectDashboard.module.css";

/* 내 프로젝트 화면 위쪽의 "지금 확인할 일"과 "전체 현황" */

/** 손이 필요한 일 목록. 누르면 그 모집 건의 해당 탭으로 간다 */
export function TodoList({ todos }: { todos: TodoItem[] }) {
  return (
    <section aria-labelledby="todo-heading" className={styles.todoList}>
      <h2 id="todo-heading" className={styles.todoListTitle}>
        지금 확인할 일 {todos.length > 0 && `${todos.length}건`}
      </h2>
      {todos.length === 0 ? (
        <Card as="p" className={styles.todoListText}>지금 확인할 일이 없어요</Card>
      ) : (
        <Card as="ul" className={styles.todoListList}>
          {todos.map((todo) => (
            <li key={todo.href}>
              <Link
                href={todo.href}
                data-testid="todo"
                className={styles.todoListLink}
              >
                <span className={styles.todoListProjectName}>{todo.projectName}</span>
                <span className={styles.todoListText2}>{todo.text}</span>
                <span className={styles.todoListLabel}>{todo.kind === "applicants" ? "테스터 관리" : "피드백"}</span>
              </Link>
            </li>
          ))}
        </Card>
      )}
    </section>
  );
}

/** 모든 프로젝트를 합친 숫자 세 개 */
export function OverviewStats({ overview }: { overview: ProjectOverview }) {
  const tiles = [
    ["모집 중", `${overview.recruiting}건`],
    ["테스트 중", `${overview.testing}건`],
    ["신고 대기", `${overview.waitingReports}건`],
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
