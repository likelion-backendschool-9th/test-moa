import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatCredits } from "@/lib/format";
import { TAB_LABEL, type ParticipationItem, type ParticipationTab, type ParticipationView } from "../types";
import { ParticipationRow } from "./ParticipationRow";
import { ParticipationViewToggle } from "./ParticipationViewToggle";
import { VIEW_LIST_CLASS } from "./view-styles";

const EMPTY: Record<ParticipationTab, { title: string; description: string }> = {
  applied: {
    title: "지원한 테스트가 없어요",
    description: "구독 모집에 지원하면 선정 결과를 여기서 확인할 수 있어요.",
  },
  ongoing: {
    title: "참여 중인 테스트가 없어요",
    description: "참여가 확정된 테스트와 제출한 피드백이 여기 모여요.",
  },
  history: {
    title: "아직 끝난 테스트가 없어요",
    description: "지급이 끝났거나 마감된 테스트가 여기 남아요.",
  },
};

const browseAction = (
  <LinkButton href="/recruitments" variant="secondary">
    테스트 둘러보기
  </LinkButton>
);

type ParticipationListProps = {
  tab: ParticipationTab;
  view: ParticipationView;
  /** 주소에 적힌 탭. 보기 방식을 바꾼 뒤 같은 주소로 돌아오는 데 쓴다 */
  urlTab?: ParticipationTab;
  items: ParticipationItem[];
  now: Date;
};

/** 선택한 탭의 참여 목록. 맨 위 줄 오른쪽에 보기 방식을, 참여했던 테스트는 왼쪽에 받은 크레딧 합계를 둔다 */
export function ParticipationList({ tab, view, urlTab, items, now }: ParticipationListProps) {
  if (items.length === 0) return <EmptyState {...EMPTY[tab]} action={browseAction} />;

  const earned = items.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.earnedCredits, 0);
  return (
    <section aria-labelledby="participation-list-heading" className="flex flex-col gap-4">
      <h2 id="participation-list-heading" className="sr-only">
        {TAB_LABEL[tab]}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {tab === "history" && (
          <p className="text-sm text-text-muted">
            받은 크레딧 합계 <strong className="ml-1 text-base font-extrabold text-text tabular-nums">{formatCredits(earned)}</strong>
          </p>
        )}
        <ParticipationViewToggle active={view} tab={urlTab} />
      </div>
      <ul className={VIEW_LIST_CLASS[view]}>
        {items.map((item) => (
          <li key={item.key}>
            <ParticipationRow item={item} view={view} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 참여 내역이 하나도 없는 계정 (개발자·운영자) */
export function NoParticipations() {
  return (
    <EmptyState
      title="아직 참여한 테스트가 없어요"
      description="모집 글을 둘러보고 써 보고 싶은 테스트에 지원해 보세요."
      action={browseAction}
    />
  );
}
