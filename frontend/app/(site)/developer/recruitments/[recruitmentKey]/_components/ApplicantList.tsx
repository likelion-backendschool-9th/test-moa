"use client";

import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { decideApplicants } from "@/features/recruitment/actions";
import type { ApplicationView } from "@/features/recruitment/types";
import {
  APPLICATION_STATUS_LABEL,
  SUBMISSION_STATUS_LABEL,
  type Application,
  type ApplicationStatus,
  type SelectionMode,
} from "@/features/recruitment/types";

/*
 * 테스터 관리 탭. 선발형 모집은 지원자를 직접 확정·거절하고, 선착순 모집은 보기만 한다.
 * 구독 모집은 체크박스로 여러 명을 골라 한 번에 확정할 수도 있다.
 * 테스트가 시작되면 확정된 테스터마다 피드백 제출 현황(제출함·미제출·미완료)을 보여 준다.
 * 구독 모집은 확정된 테스터와 채팅할 수 있어 채팅함으로 가는 바로가기를 둔다.
 * 확정·거절은 화면에 바로 반영하고 서버에 저장한다. 저장하면 요약·분석·내 프로젝트 화면도 같이 바뀐다.
 */

type ApplicantListProps = {
  applications: ApplicationView[];
  /** 구독 모집이고 모집 마감 전이면 true */
  canSelect: boolean;
  isSubscription: boolean;
  selectionMode: SelectionMode;
  recruitmentKey: string;
};

const TONE: Record<ApplicationStatus, "accent" | "neutral" | "muted"> = {
  applied: "neutral",
  confirmed: "accent",
  rejected: "muted",
  cancelled: "muted",
};

/** 응답을 받지 못했고 서버 목록을 다시 받은 뒤의 안내 */
const UNCERTAIN_ERROR = "연결이 불안정해 결과를 확인하지 못했어요. 지원자 목록을 다시 불러왔으니 상태를 확인해 주세요";
/** 서버에 닿지 않아 목록을 다시 받지 못하고 연결을 기다리는 동안의 안내 */
const DISCONNECTED_ERROR = "서버에 연결되지 않아 결과를 확인하지 못했어요. 연결되면 지원자 목록을 다시 불러올게요";
/** 서버에 다시 닿는지 확인하는 간격. 그 사이 online 이벤트가 오면 바로 확인한다 */
const RETRY_MS = 3_000;

/**
 * 현재 페이지에 가벼운 요청을 보내 서버에 닿는지 확인한다.
 * router.refresh()는 재조회가 실패해도 잡을 수 없어 페이지 전체 오류 화면으로 넘어가므로, 부르기 전에 먼저 확인한다.
 * navigator.onLine은 와이파이만 연결되고 인터넷이나 서버가 안 되는 경우를 구분하지 못해서 쓰지 않는다.
 */
async function canReachServer() {
  try {
    const response = await fetch(window.location.href, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(RETRY_MS) });
    return response.ok;
  } catch {
    return false;
  }
}

/** 지원자 목록, 개별 확정·거절 버튼, 일괄 확정 */
export function ApplicantList({ applications, canSelect, isSubscription, selectionMode, recruitmentKey }: ApplicantListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  /** 서버에 닿지 않아 연결을 기다리는 중이면, 목록을 다시 받은 뒤 보여 줄 안내. 기다리지 않으면 null */
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
  /** 확정·거절을 누를 때마다 1 늘린다. 늦게 끝난 앞선 확인이 이번 결과를 덮지 않게 한다 */
  const attempt = useRef(0);

  const rows = applications.map((item) => ({ ...item, status: statuses[item.id] ?? item.status }));
  const confirmedCount = rows.filter((item) => item.status === "confirmed").length;
  const pendingIds = rows.filter((item) => item.status === "applied").map((item) => item.id);
  const canBulk = canSelect && pendingIds.length > 0;
  const selected = pendingIds.filter((id) => checked.has(id));

  /**
   * 서버에 닿으면 최신 지원자 목록을 다시 받고 message를 보여 준다.
   * 닿지 않으면 화면과 안내를 그대로 두고, 연결이 돌아올 때까지 기다린다.
   */
  const syncWithServer = useCallback(
    async (message: string, current: number) => {
      const reachable = await canReachServer();
      if (current !== attempt.current) return;
      if (reachable) {
        setWaitingMessage(null);
        setError(message);
        router.refresh();
        return;
      }
      setError(DISCONNECTED_ERROR);
      setWaitingMessage(message);
    },
    [router],
  );

  /* 연결을 기다리는 동안 online 이벤트와 일정 간격으로 서버에 다시 닿는지 확인한다. 서버만 내려간 경우는 online 이벤트가 오지 않는다 */
  useEffect(() => {
    if (waitingMessage === null) return;
    const current = attempt.current;
    const retry = () => void syncWithServer(waitingMessage, current);
    const timer = window.setInterval(retry, RETRY_MS);
    window.addEventListener("online", retry);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", retry);
    };
  }, [waitingMessage, syncWithServer]);

  /**
   * 여러 지원을 한 번에 같은 상태로 바꾸고 결과를 알린다.
   * 서버가 거절하면 그사이 지원이나 모집 상태가 바뀌었을 수 있어서, 표시를 되돌리고 서버의 최신 목록을 다시 받는다.
   * 응답을 받지 못하면 저장됐는지 알 수 없어서 역시 최신 목록을 다시 받는다. 서버에 닿지 않으면 연결될 때까지 미룬다.
   */
  function decide(targets: Application[], status: "confirmed" | "rejected") {
    const ids = targets.map((item) => item.id);
    /** 먼저 바꿔 둔 표시를 지워 서버에서 받은 상태가 보이게 한다 */
    const undo = () => setStatuses((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.includes(id))));
    setStatuses((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, status])) }));
    setChecked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    setError("");
    /* 앞선 실패의 연결 대기를 끝내, 이번 확정 뒤에 늦게 끝난 확인이 목록을 다시 받지 않게 한다 */
    const current = ++attempt.current;
    setWaitingMessage(null);
    const label = APPLICATION_STATUS_LABEL[status];
    setAnnouncement(targets.length === 1 ? `${targets[0].testerNickname}님을 ${label}했어요` : `${targets.length}명을 ${label}했어요`);
    startTransition(async () => {
      try {
        const { ok } = await decideApplicants(recruitmentKey, ids, status);
        if (ok) return;
        undo();
        setAnnouncement("");
        await syncWithServer(`${label}하지 못했어요. 그사이 이미 처리됐거나 모집이 끝났을 수 있어 지원자 목록을 다시 불러왔어요`, current);
      } catch (caught) {
        /* 로그인 이동(redirect)·notFound는 연결 문제가 아니므로 Next가 처리하게 다시 던진다 */
        unstable_rethrow(caught);
        undo();
        setAnnouncement("");
        await syncWithServer(UNCERTAIN_ERROR, current);
      }
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

  /* 제출 현황은 테스트가 시작된 뒤에만 값이 있다 */
  const submissions = rows.map((item) => item.submission).filter((value) => value !== null);
  const countOf = (status: keyof typeof SUBMISSION_STATUS_LABEL) => submissions.filter((value) => value === status).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <p className="font-bold" data-testid="confirmed-count">
          확정 {confirmedCount}명
        </p>
        {selectionMode === "firstCome" && <p className="text-text-muted">선착순 모집이라 지원하면 바로 확정돼요</p>}
        {submissions.length > 0 && (
          <p data-testid="submission-summary" className="text-text-muted">
            피드백 제출 {countOf("submitted")}명 · 미제출 {countOf("pending")}명 · 미완료 {countOf("incomplete")}명
          </p>
        )}
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
          <Button
            size="sm"
            className="ml-auto"
            disabled={selected.length === 0}
            onClick={() => decide(rows.filter((item) => selected.includes(item.id)), "confirmed")}
          >
            선택한 {selected.length}명 확정
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-surface-strong px-5 py-3 text-sm font-semibold">
          {error}
        </p>
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
              <span className="min-w-16 font-bold">{item.testerNickname}</span>
              <Badge tone={TONE[item.status]}>{APPLICATION_STATUS_LABEL[item.status]}</Badge>
              <span className="text-sm text-text-muted">{formatDate(item.appliedAt)} 지원</span>
              {item.submission && <Badge tone="muted">{SUBMISSION_STATUS_LABEL[item.submission]}</Badge>}
              {isSubscription && item.status === "confirmed" && (
                <Link
                  href={`/my/chats?q=${encodeURIComponent(item.testerNickname)}`}
                  aria-label={`${item.testerNickname}님과 채팅`}
                  className="ml-auto text-sm font-semibold text-text-muted hover:text-text"
                >
                  채팅
                </Link>
              )}
              {canSelect && pending && (
                <span className="ml-auto flex gap-2">
                  <Button size="sm" onClick={() => decide([item], "confirmed")}>
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
