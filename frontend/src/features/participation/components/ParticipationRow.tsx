import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { RecruitmentThumb } from "@/features/recruitment/components/RecruitmentThumb";
import { cn } from "@/lib/cn";
import { daysUntil, formatCredits, formatDate, formatDateTime, formatDday } from "@/lib/format";
import {
  keyDateOf,
  participationPath,
  STATUS_LABEL,
  tabOf,
  type ParticipationItem,
  type ParticipationStatus,
  type ParticipationView,
} from "../types";

/** D-3 이하는 굵기로 급함을 알린다 */
const URGENT_DAYS = 3;

/** 끝난 상태는 흐린 배지로 둔다 */
const ENDED: ParticipationStatus[] = ["notSelected", "incomplete", "excluded"];

/** 참여 중 상태의 동작 이름. 나머지는 상세 보기다 */
const ONGOING_ACTION: Partial<Record<ParticipationStatus, string>> = {
  beforeSubmit: "피드백 쓰기",
  payoutPending: "제출 내용 보기",
  underReview: "제출 내용 보기",
};

function actionOf(item: ParticipationItem) {
  if (tabOf(item.status) === "applied") return { label: "모집 글 보기", href: `/recruitments/${item.recruitment.slug}` };
  return { label: ONGOING_ACTION[item.status] ?? "상세 보기", href: participationPath(item.key) };
}

/**
 * 참여 행. 활자 썸네일 → 요청 문구 → 상태 → 날짜 → 보상 → 동작 순서로 고정한다.
 * 리스트는 lg 이상에서 썸네일 | 내용 | 동작 한 줄, 그보다 좁으면 위아래로 쌓인다.
 * 그리드는 항상 위아래로 쌓고, 내용이 남는 높이를 채워 같은 줄 카드의 동작 버튼 위치를 맞춘다.
 */
export function ParticipationRow({ item, view = "list", now }: { item: ParticipationItem; view?: ParticipationView; now: Date }) {
  const { recruitment, status } = item;
  const keyDate = keyDateOf(item);
  const action = actionOf(item);
  const urgent = status === "beforeSubmit" && daysUntil(recruitment.submitDeadline, now) <= URGENT_DAYS;
  const grid = view === "grid";

  return (
    <Card
      data-testid="participation-row"
      className={cn("flex flex-col gap-4", grid ? "h-full" : "lg:flex-row lg:items-center lg:gap-6")}
    >
      <div className={grid ? "w-full" : "w-36 shrink-0 lg:w-48"}>
        <RecruitmentThumb recruitment={recruitment} stamp={status === "paid" ? "지급 완료" : undefined} />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <p className="text-sm font-semibold">{recruitment.request}</p>
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone={ENDED.includes(status) ? "muted" : "neutral"}>{STATUS_LABEL[status]}</Badge>
          {status === "beforeSubmit" && (
            <span className={urgent ? "text-xs font-extrabold text-text tabular-nums" : "text-xs font-semibold text-text-muted tabular-nums"}>
              {formatDday(recruitment.submitDeadline, now)}
            </span>
          )}
          {status === "paid" && <span className="text-sm font-bold tabular-nums">+{formatCredits(item.earnedCredits)}</span>}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-text-muted">{keyDate.label}</dt>
            <dd className="font-semibold tabular-nums">
              {status === "payoutPending" ? formatDateTime(keyDate.at) : formatDate(keyDate.at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">기본 보상</dt>
            <dd className="font-semibold tabular-nums">{formatCredits(recruitment.baseReward)}</dd>
          </div>
        </dl>
        {recruitment.extraReward !== undefined && (
          <p className="text-sm font-bold text-accent">추가 보상 +{formatCredits(recruitment.extraReward)}</p>
        )}
        {status === "payoutPending" && <p className="text-xs text-text-muted">72시간 동안 신고가 없으면 자동으로 지급돼요</p>}
      </div>
      <LinkButton href={action.href} variant="secondary" size="sm" className={grid ? "self-start" : "self-start lg:self-center"}>
        <span className="sr-only">{recruitment.projectName} </span>
        {action.label}
      </LinkButton>
    </Card>
  );
}
