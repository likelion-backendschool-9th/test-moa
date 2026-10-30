"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { APPLICATION_STATUS_LABEL, type Application, type ApplicationStatus } from "../types";

/*
 * 테스터 관리 탭. 구독 모집은 지원자를 직접 확정·거절하고, 무료 모집은 보기만 한다.
 * 목업이라 확정·거절은 화면에서만 바뀌고 새로고침하면 돌아온다.
 */

type ApplicantListProps = {
  applications: Application[];
  capacity: number;
  /** 구독 모집이고 모집 마감 전이면 true */
  canSelect: boolean;
  isSubscription: boolean;
};

const TONE: Record<ApplicationStatus, "accent" | "neutral" | "muted"> = {
  applied: "neutral",
  confirmed: "accent",
  rejected: "muted",
};

/** 지원자 목록과 확정·거절 버튼 */
export function ApplicantList({ applications, capacity, canSelect, isSubscription }: ApplicantListProps) {
  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>({});
  const [announcement, setAnnouncement] = useState("");

  const rows = applications.map((item) => ({ ...item, status: statuses[item.id] ?? item.status }));
  const confirmedCount = rows.filter((item) => item.status === "confirmed").length;
  const full = confirmedCount >= capacity;

  function decide(application: Application, status: ApplicationStatus) {
    setStatuses((prev) => ({ ...prev, [application.id]: status }));
    setAnnouncement(`${application.testerNickname}님을 ${APPLICATION_STATUS_LABEL[status]}했어요`);
  }

  if (applications.length === 0) return <EmptyState title="아직 지원자가 없어요" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <p className="font-bold" data-testid="confirmed-count">
          확정 {confirmedCount}명 · 정원 {capacity}명
        </p>
        {!isSubscription && <p className="text-text-muted">선착순 모집이라 지원 순서대로 자동 확정돼요</p>}
        {canSelect && full && <p className="text-text-muted">정원이 다 찼어요</p>}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface-muted">
        {rows.map((item) => (
          <li key={item.id} data-testid="applicant" className="flex flex-wrap items-center gap-3 px-5 py-4">
            <span className="font-bold">{item.testerNickname}</span>
            <Badge tone={TONE[item.status]}>{APPLICATION_STATUS_LABEL[item.status]}</Badge>
            <span className="text-sm text-text-muted">{formatDate(item.appliedAt)} 지원</span>
            {canSelect && item.status === "applied" && (
              <span className="ml-auto flex gap-2">
                <Button size="sm" disabled={full} onClick={() => decide(item, "confirmed")}>
                  확정
                </Button>
                <Button size="sm" variant="secondary" onClick={() => decide(item, "rejected")}>
                  거절
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
