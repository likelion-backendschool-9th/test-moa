import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ApplyForm } from "@/app/(site)/recruitments/[slug]/apply/_components/ApplyForm/ApplyForm";
import { Card } from "@/components/ui/Card/Card";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getApplyBlockedMessage, SELECTION_MODE_LABEL, type PublicRecruitmentView, type SelectionMode } from "@/features/recruitment/types";
import { formatCredits, formatDate } from "@/lib/format";
import styles from "./ApplyPanel.module.css";

/* 지원 화면. 지원하기 전에 보상, 일정, 선정 방식을 한 번 더 확인한다 */

const SELECTION_HINT: Record<SelectionMode, string> = {
  firstCome: "지원하면 바로 참여가 확정돼요.",
  selection: "개발자가 지원자를 확정하면 참여가 시작돼요.",
};

export function ApplyPanel({ post }: { post: PublicRecruitmentView }) {
  const { recruitment, detail, status, myRegisterStatus } = post;
  const selectionMode = detail?.selectionMode ?? "firstCome";
  const blockedMessage = getApplyBlockedMessage(status, myRegisterStatus);
  const detailPath = `/recruitments/${recruitment.slug}`;
  const facts: Array<[string, string]> = [
    ["기본 보상", formatCredits(recruitment.baseReward)],
    ...(recruitment.extraReward !== undefined ? ([["추가 보상", `+${formatCredits(recruitment.extraReward)}`]] as Array<[string, string]>) : []),
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["피드백 제출 마감", formatDate(recruitment.submitDeadline)],
    ["선정 방식", SELECTION_MODE_LABEL[selectionMode]],
    ["테스트 항목", `${detail?.testItems.length ?? 0}개`],
  ];
  return (
    <div className={styles.root}>
      <Link href={detailPath} className={styles.back}>
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        모집글로 돌아가기
      </Link>
      <header className={styles.header}>
        <p className={styles.project}>{recruitment.projectName}</p>
        <h1 className={styles.title}>{detail?.title || recruitment.request}</h1>
      </header>
      <Card className={styles.card}>
        <dl className={styles.list}>
          {facts.map(([term, value]) => (
            <div key={term} className={styles.row}>
              <dt className={styles.term}>{term}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
        <ApplyForm slug={recruitment.slug} hint={SELECTION_HINT[selectionMode]} blockedMessage={blockedMessage} />
      </Card>
    </div>
  );
}

export function ApplyPanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="지원 정보 불러오는 중" className={styles.root}>
      <Skeleton className={styles.skeletonTitle} />
      <Skeleton className={styles.skeletonCard} />
    </div>
  );
}
