"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import {
  BACKEND_REPORT_STATUS_LABEL,
  BACKEND_REPORT_TARGET_LABEL,
  type BackendReportStatus,
  evidenceHref,
  formatFileSize,
  type MyReport,
} from "@/features/report/types";
import styles from "./MyReportsDialog.module.css";

type StatusFilter = "all" | BackendReportStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "PENDING", label: BACKEND_REPORT_STATUS_LABEL.PENDING },
  { value: "REJECTED", label: BACKEND_REPORT_STATUS_LABEL.REJECTED },
  { value: "ACCEPTED", label: BACKEND_REPORT_STATUS_LABEL.ACCEPTED },
];

/**
 * "내 신고" 전체 보기 창(#85). 주소를 바꾸지 않고 마이페이지 위에 열린다.
 * 위에 처리 상태 필터를 두고, 목록은 창 안에서만 스크롤한다. 줄마다 사유 전체와 내가 올린 증거 파일을 보여 준다
 */
export function MyReportsDialog({ reports }: { reports: MyReport[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const ref = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (open) ref.current?.showModal();
  }, [open]);

  const count = (value: StatusFilter) => (value === "all" ? reports.length : reports.filter((report) => report.status === value).length);
  const shown = status === "all" ? reports : reports.filter((report) => report.status === status);
  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} className={styles.more}>
        전체 보기 {reports.length}건
      </button>
      {open && (
        <Card
          as="dialog"
          ref={ref}
          aria-labelledby={`${id}-title`}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => buttonRef.current?.focus());
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) ref.current?.close();
          }}
          className={styles.dialog}
        >
          <div className={styles.dialogBody}>
            <div className={styles.dialogHead}>
              <h2 id={`${id}-title`} className={styles.dialogTitle}>
                내 신고
              </h2>
              <Button variant="ghost" size="sm" onClick={() => ref.current?.close()}>
                닫기
              </Button>
            </div>
            <div role="group" aria-label="처리 상태" className={styles.chips}>
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={status === item.value}
                  onClick={() => setStatus(item.value)}
                  className={cn(styles.chip, status === item.value && styles.chipOn)}
                >
                  {item.label} <span className={styles.chipCount}>{count(item.value)}</span>
                </button>
              ))}
            </div>
            {/* 키보드로도 스크롤할 수 있게 포커스를 받는다 */}
            <div tabIndex={0} role="region" aria-label="신고 목록" className={styles.scroll}>
              {shown.length === 0 ? (
                <p className={styles.empty}>이 상태의 신고가 없어요.</p>
              ) : (
                <ul className={styles.dialogList}>
                  {shown.map((report) => (
                    <li key={report.id} className={styles.item}>
                      <div className={styles.itemHead}>
                        <span className={styles.target}>{BACKEND_REPORT_TARGET_LABEL[report.targetType]} 신고</span>
                        <span className={styles.status}>{BACKEND_REPORT_STATUS_LABEL[report.status]}</span>
                      </div>
                      <p className={styles.fullReason}>{report.reason}</p>
                      <p className={styles.dates}>
                        신고 {formatDate(report.createdAt)}
                        {report.reviewedAt && ` · 처리 ${formatDate(report.reviewedAt)}`}
                      </p>
                      {report.evidences.length > 0 && (
                        <ul aria-label="증거 파일" className={styles.files}>
                          {report.evidences.map((evidence) => (
                            <li key={evidence.id}>
                              <a href={evidenceHref(report.id, evidence.id)} target="_blank" rel="noreferrer" className={styles.file}>
                                {evidence.originalName}
                              </a>{" "}
                              <span className={styles.size}>{formatFileSize(evidence.size)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
