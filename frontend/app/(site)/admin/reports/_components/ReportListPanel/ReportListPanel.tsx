"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { TextInput } from "@/components/ui/TextField/TextField";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/lib/format";
import { isOverdue, REPORT_DECISION_LABEL, REPORT_TARGET_LABEL, type Report, type ReportDecision } from "@/features/report/types";
import { reportDetailHref, type ListTab, type ReportTargetFilter } from "@/features/report/paths";
import { AdminListRow } from "@/app/(site)/admin/_components/AdminListRow/AdminListRow";
import styles from "./ReportListPanel.module.css";

type ResultFilter = "all" | ReportDecision;

const RESULT_FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "dismissed", label: REPORT_DECISION_LABEL.dismissed },
  { value: "upheld", label: REPORT_DECISION_LABEL.upheld },
];

/** 모집 이름·닉네임·사유 중 하나에 검색어가 있으면 true */
function matches(report: Report, query: string) {
  if (!query) return true;
  return [report.recruitmentName, report.reason, report.reporterNickname, report.targetNickname]
    .some((value) => value?.toLowerCase().includes(query));
}

/**
 * 신고 목록 상자. 상태 탭·대상 필터(주소에 남음) 아래에서 검색과 처리 결과(처리 완료 탭)로 더 좁히고,
 * 목록은 페이지 전체가 아니라 이 상자 안에서 스크롤한다. 검색·결과 필터는 주소에 남기지 않는다
 */
export function ReportListPanel({ reports, tab, target, now }: { reports: Report[]; tab: ListTab; target: ReportTargetFilter; now: Date }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResultFilter>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const shown = reports.filter(
    (report) => matches(report, deferredQuery) && (tab !== "done" || result === "all" || report.review?.decision === result),
  );

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <TextInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="신고 검색"
          placeholder="모집 이름·닉네임·사유로 찾기"
          className={styles.search}
        />
        {tab === "done" && (
          <div role="group" aria-label="처리 결과" className={styles.chips}>
            {RESULT_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={result === item.value}
                onClick={() => setResult(item.value)}
                className={cn(styles.chip, result === item.value && styles.chipOn)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <p aria-live="polite" className={styles.count}>
          {shown.length}건
        </p>
      </div>
      {/* 키보드로도 스크롤할 수 있게 포커스를 받는다 */}
      <div tabIndex={0} role="region" aria-label="신고 목록" className={styles.scroll}>
        {shown.length === 0 ? (
          <p className={styles.none}>조건에 맞는 신고가 없어요</p>
        ) : (
          <ul aria-label={tab === "pending" ? "검토 대기 신고" : "처리 완료 신고"} className={styles.root}>
            {shown.map((report) => (
              <li key={report.id}>
                <AdminListRow as={Link} href={reportDetailHref(report.id, { tab, target })} className={styles.link}>
                  <div className={styles.box}>
                    <div className={styles.box2}>
                      <Badge tone="muted">{REPORT_TARGET_LABEL[report.targetType]}</Badge>
                      <span className={styles.recruitmentName}>{report.recruitmentName}</span>
                    </div>
                    <span className={styles.reason}>{report.reason}</span>
                  </div>
                  <div className={styles.box3}>
                    {report.review ? (
                      <>
                        <Badge tone="neutral">{REPORT_DECISION_LABEL[report.review.decision]}</Badge>
                        <span className={styles.label}>처리 {formatElapsed(report.review.processedAt, now)}</span>
                      </>
                    ) : (
                      <>
                        {report.holdsReward && <Badge tone="muted">보상 보류</Badge>}
                        {isOverdue(report, now) && <Badge tone="neutral">72시간 지남</Badge>}
                        <span className={styles.label2}>접수 {formatElapsed(report.createdAt, now)}</span>
                      </>
                    )}
                  </div>
                </AdminListRow>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
