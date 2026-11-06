import { FlaskIcon, FolderSimpleIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { TODO_CATEGORY_LABEL, type TodoCategory } from "../types";

const ICONS: Record<TodoCategory, typeof FlaskIcon> = {
  participation: FlaskIcon,
  project: FolderSimpleIcon,
};

/** 테스트 참여·내 프로젝트 묶음. 지금 할 일과 활동 요약이 같은 아이콘·면으로 두 활동을 구분한다 */
export function ActivityGroup({ kind, children }: { kind: TodoCategory; children: ReactNode }) {
  const Icon = ICONS[kind];
  const title = TODO_CATEGORY_LABEL[kind];
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <h3 className="flex items-center gap-2 text-sm font-extrabold">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-strong">
          <Icon aria-hidden size={16} weight="bold" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}
