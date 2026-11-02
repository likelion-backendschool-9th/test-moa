"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { decideApplicants } from "../actions";
import { APPLICATION_STATUS_LABEL, type Application, type ApplicationStatus } from "../types";

/*
 * 테스터 관리 탭. 구독 모집은 지원자를 직접 확정·거절하고, 무료 모집은 보기만 한다.
 * 구독 모집은 체크박스로 여러 명을 골라 한 번에 확정할 수도 있다.
 * 확정·거절은 화면에 바로 반영하고 서버에 저장한다. 저장하면 요약·분석·내 프로젝트 화면도 같이 바뀐다.
 */

type ApplicantListProps = {
  applications: Application[];
  capacity: number;
  /** 구독 모집이고 모집 마감 전이면 true */
  canSelect: boolean;
  isSubscription: boolean;
  projectKey: string;
  recruitmentKey: string;
};

const TONE: Record<ApplicationStatus, "accent" | "neutral" | "muted"> = {
  applied: "neutral",
  confirmed: "accent",
  rejected: "muted",
};

/** 지원자 목록, 개별 확정·거절 버튼, 일괄 확정 */
export function ApplicantList({ applications, capacity, canSelect, isSubscription, projectKey, recruitmentKey }: ApplicantListProps) {
  const [, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");

  const rows = applications.map((item) => ({ ...item, status: statuses[item.id] ?? item.status }));
  const confirmedCount = rows.filter((item) => item.status === "confirmed").length;
  const remaining = Math.max(0, capacity - confirmedCount);
  const full = remaining === 0;
  const pendingIds = rows.filter((item) => item.status === "applied").map((item) => item.id);
  /* 정원이 남은 구독 모집에서만 여러 명을 고를 수 있다 */
  const canBulk = canSelect && !full && pendingIds.length > 0;
  const selected = pendingIds.filter((id) => checked.has(id));
  const overCapacity = selected.length > remaining;

  /** 여러 지원을 한 번에 같은 상태로 바꾸고 결과를 알린다. 저장에 실패하면 되돌린다 */
  function decide(targets: Application[], status: "confirmed" | "rejected") {
    const ids = targets.map((item) => item.id);
    setStatuses((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, status])) }));
    setChecked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    const label = APPLICATION_STATUS_LABEL[status];
    setAnnouncement(targets.length === 1 ? `${targets[0].testerNickname}님을 ${label}했어요` : `${targets.length}명을 ${label}했어요`);
    startTransition(async () => {
      const { ok } = await decideApplicants(projectKey, recruitmentKey, ids, status);
      if (ok) return;
      setStatuses((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.includes(id))));
      setAnnouncement(`${label}하지 못했어요. 다시 시도해 주세요`);
    });
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked(selected.length === pendingIds.length ? new Set() : new Set(pendingIds));
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

      {canBulk && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface-strong px-5 py-3">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={selected.length === pendingIds.length}
              onChange={toggleAll}
              className="size-4 accent-accent"
            />
            전체 선택
          </label>
          {overCapacity && <p className="text-sm font-semibold">남은 자리는 {remaining}명이에요</p>}
          <Button
            size="sm"
            className="ml-auto"
            disabled={selected.length === 0 || overCapacity}
            onClick={() => decide(rows.filter((item) => selected.includes(item.id)), "confirmed")}
          >
            선택한 {selected.length}명 확정
          </Button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface-muted">
        {rows.map((item) => {
          const pending = item.status === "applied";
          return (
            <li key={item.id} data-testid="applicant" className="flex flex-wrap items-center gap-3 px-5 py-4">
              {canBulk && pending && (
                <input
                  type="checkbox"
                  aria-label={`${item.testerNickname} 선택`}
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="size-4 accent-accent"
                />
              )}
              <span className="font-bold">{item.testerNickname}</span>
              <Badge tone={TONE[item.status]}>{APPLICATION_STATUS_LABEL[item.status]}</Badge>
              <span className="text-sm text-text-muted">{formatDate(item.appliedAt)} 지원</span>
              {canSelect && pending && (
                <span className="ml-auto flex gap-2">
                  <Button size="sm" disabled={full} onClick={() => decide([item], "confirmed")}>
                    확정
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => decide([item], "rejected")}>
                    거절
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
