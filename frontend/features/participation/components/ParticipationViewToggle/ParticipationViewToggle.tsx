import { ListBulletsIcon, SquaresFourIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";
import { setParticipationView } from "@/features/participation/actions";
import {
  PARTICIPATION_VIEWS,
  VIEW_LABEL,
  type ParticipationTab,
  type ParticipationView,
} from "@/features/participation/types";
import styles from "./ParticipationViewToggle.module.css";

const VIEW_ICON = { list: ListBulletsIcon, grid: SquaresFourIcon };

/** 보기 방식 선택. 채팅함 역할 탭과 같은 세그먼트 모양에 아이콘만 둔다. 서버 액션 폼이라 클라이언트 코드가 없다 */
export function ParticipationViewToggle({ active, tab, next }: { active: ParticipationView; tab?: ParticipationTab; /** 참여 테스트가 아닌 화면(내 프로젝트)에서 돌아올 주소 */ next?: string }) {
  return (
    <form action={setParticipationView} role="group" aria-label="보기 방식" className={styles.root}>
      {tab && <input type="hidden" name="tab" value={tab} />}
      {next && <input type="hidden" name="next" value={next} />}
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
            className={cn(styles.root2, current ? styles.root2Current : styles.root2NotCurrent)}
          >
            <Icon aria-hidden size={20} />
          </button>
        );
      })}
    </form>
  );
}
