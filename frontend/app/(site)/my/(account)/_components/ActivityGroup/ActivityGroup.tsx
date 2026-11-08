import { FlaskIcon, FolderSimpleIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { TODO_CATEGORY_LABEL, type TodoCategory } from "@/features/member/types";
import styles from "./ActivityGroup.module.css";

const ICONS: Record<TodoCategory, typeof FlaskIcon> = {
  participation: FlaskIcon,
  project: FolderSimpleIcon,
};

/** 테스트 참여·내 프로젝트 묶음. 지금 할 일과 활동 요약이 같은 아이콘·면으로 두 활동을 구분한다 */
export function ActivityGroup({ kind, children }: { kind: TodoCategory; children: ReactNode }) {
  const Icon = ICONS[kind];
  const title = TODO_CATEGORY_LABEL[kind];
  return (
    <section aria-label={title} className={styles.root}>
      <h3 className={styles.title}>
        <span className={styles.label}>
          <Icon aria-hidden size={16} weight="bold" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}
