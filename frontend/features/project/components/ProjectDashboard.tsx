import Link from "next/link";
import type { ProjectOverview, TodoItem } from "../service";

/* 내 프로젝트 화면 위쪽의 "지금 확인할 일"과 "전체 현황" */

/** 손이 필요한 일 목록. 누르면 그 모집 건의 해당 탭으로 간다 */
export function TodoList({ todos }: { todos: TodoItem[] }) {
  return (
    <section aria-labelledby="todo-heading" className="flex flex-col gap-3">
      <h2 id="todo-heading" className="text-xl font-extrabold tracking-[-0.03em]">
        지금 확인할 일 {todos.length > 0 && `${todos.length}건`}
      </h2>
      {todos.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted px-5 py-4 text-text-muted">지금 확인할 일이 없어요</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface-muted">
          {todos.map((todo) => (
            <li key={todo.href}>
              <Link
                href={todo.href}
                data-testid="todo"
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-300 ease-brand hover:bg-surface-strong"
              >
                <span className="w-32 shrink-0 text-sm font-bold text-text-muted">{todo.projectName}</span>
                <span className="min-w-0 flex-1">{todo.text}</span>
                <span className="text-sm font-semibold text-text-muted">{todo.kind === "applicants" ? "테스터 관리" : "피드백"}</span>
              </Link>
            </li>
          ))}
        </ul>
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
    <section aria-labelledby="overview-heading" className="flex flex-col gap-3">
      <h2 id="overview-heading" className="text-xl font-extrabold tracking-[-0.03em]">
        전체 현황
      </h2>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-5">
            <dt className="text-sm text-text-muted">{term}</dt>
            <dd className="text-3xl font-extrabold tracking-[-0.03em] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
