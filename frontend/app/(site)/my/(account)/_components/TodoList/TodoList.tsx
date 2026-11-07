import Link from "next/link";
import { PROJECTS_PATH } from "@/features/project/paths";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import type { Todo, TodoCategory } from "@/features/member/types";
import { ActivityGroup } from "../ActivityGroup/ActivityGroup";
import { Card } from "@/components/ui/Card/Card";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./TodoList.module.css";

/** 할 일이 없는 묶음에 보여 줄 안내와 이동 링크 */
const EMPTY: Record<TodoCategory, { text: string; href: string; label: string }> = {
  participation: { text: "지금 할 테스트가 없어요", href: "/recruitments", label: "테스트 둘러보기" },
  project: { text: "지금 할 프로젝트 일이 없어요", href: PROJECTS_PATH, label: "내 프로젝트" },
};

const CATEGORY_ORDER: TodoCategory[] = ["participation", "project"];

/** 테스트 참여·내 프로젝트에서 바로 처리할 일. 두 묶음은 항상 보이고, 묶음 안에서는 마감이 있는 항목이 먼저 온다 */
export function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <AccountCard as="section" aria-labelledby="my-todo-heading">
      <AccountCardTitle id="my-todo-heading">
        지금 할 일
      </AccountCardTitle>
      <div className={styles.box}>
        {CATEGORY_ORDER.map((category) => (
          <ActivityGroup key={category} kind={category}>
            <TodoItems category={category} items={todos.filter((todo) => todo.category === category)} />
          </ActivityGroup>
        ))}
      </div>
    </AccountCard>
  );
}

function TodoItems({ category, items }: { category: TodoCategory; items: Todo[] }) {
  if (items.length === 0) {
    const empty = EMPTY[category];
    return (
      <Card as="div" radius="lg" className={styles.todoItems}>
        <p className={styles.todoItemsText}>{empty.text}</p>
        <LinkButton href={empty.href} variant="secondary" size="sm">
          {empty.label}
        </LinkButton>
      </Card>
    );
  }
  return (
    <ol className={styles.todoItems2}>
      {items.map((todo) => (
        <li key={todo.id}>
          <Card as={Link} radius="lg"
            href={todo.href}
            className={styles.todoItemsLink}
          >
            <span className={styles.todoItemsTitle}>{todo.title}</span>
            <span
              className={todo.dueAt ? styles.todoItemsDetailDueAt : styles.todoItemsDetailNotDueAt}
            >
              {todo.detail}
            </span>
          </Card>
        </li>
      ))}
    </ol>
  );
}
