"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Card } from "@/components/ui/Card/Card";
import { compareVersionsAction, saveVersionLinksAction } from "@/features/recruitment/actions";
import { compareVersions, relinkGroup, toVersionLinks, type VersionComparison } from "@/features/recruitment/types";
import { AnalysisToolbar } from "../AnalysisToolbar/AnalysisToolbar";
import { ComparisonReport } from "../ComparisonReport/ComparisonReport";
import { GroupLinks } from "../GroupLinks/GroupLinks";
import { VersionBars } from "../VersionBars/VersionBars";
import styles from "./VersionComparisonPanel.module.css";

/*
 * 버전 별 분석 탭. 직전 버전과 이번 버전의 리뷰 그룹을 분류 코드로 이어, 어떤 문제가 이어지고 새로 생기고 보고되지 않았는지 보여 준다.
 * 위에서부터 비교 실행 버튼 → 핵심 분석(요약과 치명·새로 생김·보고 안 됨 수) → 미반영 안내 → 버전 별 리뷰 수 막대
 * → 그룹 전체 목록(v1 ↔ v2 짝) → 레포트(이번 버전 그룹 목록과 고른 그룹 레포트).
 * 짝은 그룹 전체 목록에서만 고치고, 저장해야 위의 수·막대와 아래 레포트에 반영된다.
 */

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Card as="section" className={styles.message}>
      <p className={styles.messageTitle}>{title}</p>
      <p className={styles.messageText}>{text}</p>
    </Card>
  );
}

export function VersionComparisonPanel({ comparison, recruitmentKey }: { comparison: VersionComparison; recruitmentKey: string }) {
  if (comparison.state === "noPrevious") {
    return (
      <Message
        title="비교할 이전 버전이 없어요"
        text={`v${comparison.currentVersion}이 이 프로젝트의 첫 모집이에요. 다음 버전 모집의 리뷰 분석을 마치면 이 버전과 견줘 볼 수 있어요.`}
      />
    );
  }
  const versions = `이전 버전 v${comparison.previousVersion}, 이번 버전 v${comparison.currentVersion}`;
  if (comparison.state === "notAnalyzed") {
    return <Message title={`${versions} 모두 리뷰 분석을 마쳐야 비교할 수 있어요`} text="리뷰 분석 탭에서 분석을 먼저 실행해 주세요." />;
  }
  if (comparison.state === "notCompared") {
    return (
      <Card as="section" className={styles.message}>
        <p className={styles.messageTitle}>아직 비교하지 않았어요</p>
        <p className={styles.messageText}>{`AI 비교 분석하기를 누르면 ${versions}의 리뷰 그룹을 견줘 볼 수 있어요.`}</p>
        <AnalysisToolbar analyzedAt={null} kind="comparison" onRun={() => compareVersionsAction(recruitmentKey)} />
      </Card>
    );
  }
  /* 다시 비교해 결과가 바뀌면 고친 짝을 버리고 새 결과로 그린다 */
  return <ReadyComparison key={comparison.comparedAt} comparison={comparison} recruitmentKey={recruitmentKey} />;
}

type ReadyComparisonProps = {
  comparison: Extract<VersionComparison, { state: "ready" }>;
  recruitmentKey: string;
};

function ReadyComparison({ comparison, recruitmentKey }: ReadyComparisonProps) {
  const { previousVersion, currentVersion } = comparison;
  const previous = comparison.groups.flatMap((group) => group.previous ?? []);
  const initial = comparison.groups.flatMap((group) => group.current ?? []);
  /* 저장한 짝(화면 전체가 쓴다)과 그룹 전체 목록에서 고치는 중인 짝. 저장하면 고친 짝이 저장한 짝이 된다 */
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const groups = compareVersions(previous, saved);
  const dirty = draft.some((group, index) => group.code !== saved[index].code);

  const countOf = (status: (typeof groups)[number]["status"]) => groups.filter((group) => group.status === status).length;
  const notReported = countOf("notReported");
  const stats: Array<[term: string, value: number, critical?: boolean]> = [
    ["치명 문제", groups.filter((group) => group.current && group.severity === 1).length, true],
    ["새로 생긴 그룹", countOf("new")],
    ["이번엔 보고 안 된 그룹", notReported],
  ];

  return (
    <div className={styles.root}>
      <AnalysisToolbar analyzedAt={comparison.comparedAt} kind="comparison" onRun={() => compareVersionsAction(recruitmentKey)} />
      <div className={styles.lead}>
        <section aria-labelledby="comparison-headline-heading" className={styles.headline}>
          <div className={styles.headlineText}>
            <h2 id="comparison-headline-heading" className={styles.headlineLabel}>
              v{previousVersion} 대비 이번 버전 한눈에
            </h2>
            <p className={styles.headlineTitle}>{comparison.summary}</p>
            {notReported > 0 && (
              <p className={styles.headlineNote}>
                v{previousVersion}에 있던 그룹 {notReported}개는 이번 버전에서 보고되지 않았어요. 해결됐다는 뜻은 아니니, 테스터
                구성이나 테스트 범위가 달랐는지 직접 한 번 확인해 보세요.
              </p>
            )}
          </div>
          <dl className={styles.stats}>
            {stats.map(([term, value, critical]) => (
              <div key={term} className={styles.stat}>
                <dt className={styles.statTerm}>{term}</dt>
                <dd className={critical && value > 0 ? styles.statCritical : styles.statValue}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        {comparison.unreflectedCount > 0 && (
          <p role="status" className={styles.pending}>
            <WarningCircleIcon aria-hidden="true" className={styles.pendingIcon} />새 피드백 {comparison.unreflectedCount}건이 아직 비교에
            반영되지 않았어요.
          </p>
        )}
        {comparison.stale && (
          <p role="status" className={styles.pending}>
            <WarningCircleIcon aria-hidden="true" className={styles.pendingIcon} />
            비교한 뒤 리뷰 분석이 다시 실행됐어요. 지금 분석과 다를 수 있으니 비교를 갱신해 주세요.
          </p>
        )}
      </div>

      <VersionBars groups={groups} previousVersion={previousVersion} currentVersion={currentVersion} />

      <GroupLinks
        groups={compareVersions(previous, draft)}
        previousVersion={previousVersion}
        currentVersion={currentVersion}
        dirty={dirty}
        onRelink={(currentId, previousCode) => setDraft((list) => relinkGroup(list, currentId, previousCode))}
        onSave={async () => {
          const result = await saveVersionLinksAction(recruitmentKey, toVersionLinks(previous, saved, draft));
          if (result.ok) setSaved(draft);
          return result;
        }}
        onDiscard={() => setDraft(saved)}
      />

      <ComparisonReport
        groups={groups}
        previousKey={comparison.previousKey}
        currentKey={recruitmentKey}
        previousVersion={previousVersion}
        currentVersion={currentVersion}
      />
    </div>
  );
}
