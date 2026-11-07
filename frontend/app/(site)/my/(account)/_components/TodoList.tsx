import Link from "next/link";
import { PROJECTS_PATH } from "@/features/project/paths";
import { LinkButton } from "@/components/ui/LinkButton";
import type { Todo, TodoCategory } from "@/features/member/types";
import { ActivityGroup } from "./ActivityGroup";
import { cardClass, cardTitleClass } from "./card-styles";

/** 할 일이 없는 묶음에 보여 줄 안내와 이동 링크 */
const EMPTY: Record<TodoCategory, { text: string; href: string; label: string }> = {
  participation: { text: "지금 할 테스트가 없어요", href: "/recruitments", label: "테스트 둘러보기" },
  project: { text: "지금 할 프로젝트 일이 없어요", href: PROJECTS_PATH, label: "내 프로젝트" },
};

const CATEGORY_ORDER: TodoCategory[] = ["participation", "project"];

/** 테스트 참여·내 프로젝트에서 바로 처리할 일. 두 묶음은 항상 보이고, 묶음 안에서는 마감이 있는 항목이 먼저 온다 */
export function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <section aria-labelledby="my-todo-heading" className={cardClass}>
      <h2 id="my-todo-heading" className={cardTitleClass}>
        지금 할 일
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORY_ORDER.map((category) => (
          <ActivityGroup key={category} kind={category}>
            <TodoItems category={category} items={todos.filter((todo) => todo.category === category)} />
          </ActivityGroup>
        ))}
      </div>
    </section>
  );
}

function TodoItems({ category, items }: { category: TodoCategory; items: Todo[] }) {
  if (items.length === 0) {
    const empty = EMPTY[category];
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3">
        <p className="text-sm text-text-muted">{empty.text}</p>
        <LinkButton href={empty.href} variant="secondary" size="sm">
          {empty.label}
        </LinkButton>
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {items.map((todo) => (
        <li key={todo.id}>
          <Link
            href={todo.href}
            className="flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-3 transition-colors duration-300 ease-brand hover:bg-surface-strong"
          >
            <span className="flex-1 truncate text-sm font-semibold">{todo.title}</span>
            <span
              className={
                todo.dueAt
                  ? "rounded-md bg-accent-soft px-2 py-0.5 text-xs font-extrabold text-accent tabular-nums"
                  : "text-xs font-semibold text-text-muted tabular-nums"
              }
            >
              {todo.detail}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
