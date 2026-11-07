import { ListBulletsIcon, SquaresFourIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";
import { setParticipationView } from "@/features/participation/actions";
import {
  PARTICIPATION_VIEWS,
  VIEW_LABEL,
  type ParticipationTab,
  type ParticipationView,
} from "@/features/participation/types";

const VIEW_ICON = { list: ListBulletsIcon, grid: SquaresFourIcon };

/** 보기 방식 선택. 채팅함 역할 탭과 같은 세그먼트 모양에 아이콘만 둔다. 서버 액션 폼이라 클라이언트 코드가 없다 */
export function ParticipationViewToggle({ active, tab }: { active: ParticipationView; tab?: ParticipationTab }) {
  return (
    <form action={setParticipationView} role="group" aria-label="보기 방식" className="ml-auto flex rounded-full bg-surface-strong p-1">
      {tab && <input type="hidden" name="tab" value={tab} />}
      {PARTICIPATION_VIEWS.map((view) => {
        const Icon = VIEW_ICON[view];
        const current = view === active;
        return (
          <button
            key={view}
            type="submit"
            name="view"
            value={view}
            aria-pressed={current}
            aria-label={VIEW_LABEL[view]}
            title={VIEW_LABEL[view]}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 transition-colors duration-300 ease-brand",
              current ? "bg-surface-muted text-text" : "text-text-muted hover:text-text",
            )}
          >
            <Icon aria-hidden size={20} />
          </button>
        );
      })}
    </form>
  );
}
