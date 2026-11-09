"use client";

import { SparkleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { formatDateTime } from "@/lib/format";
import styles from "./AnalysisToolbar.module.css";

/*
 * 리뷰 분석·버전 별 분석 탭 맨 위. 왼쪽에 실행 버튼, 그 옆에 마지막 실행 시각을 둔다.
 * 분석은 백엔드에서 따로 돌고(POST /analysis, 202), 비교는 바로 결과를 준다(POST /version-comparison). 끝나면 조회 결과가 바뀐다.
 * onRun을 주면 실행하고 화면을 다시 읽는다. 실패하면 백엔드 문구를 보이고 다시 누를 수 있다.
 * running(백엔드가 분석 중)이면 5초마다 화면을 다시 읽어 DONE·FAILED로 바뀌면 멈춘다.
 * onRun 없이 누르면(목업) "요청했어요"만 보여 준다.
 */

const POLL_MS = 5000;

const TEXT = {
  analysis: {
    run: "AI 분석하기",
    rerun: "AI 분석 갱신하기",
    pending: "분석 중…",
    requested: "분석을 요청했어요. 끝나면 결과가 바뀌어요",
    none: "아직 분석하지 않았어요",
    failed: "지난 분석에 실패했어요. 다시 실행해 주세요",
  },
  comparison: {
    run: "AI 비교 분석하기",
    rerun: "AI 비교 분석 갱신하기",
    pending: "비교 중…",
    requested: "비교를 요청했어요. 끝나면 결과가 바뀌어요",
    none: "아직 비교하지 않았어요",
    failed: "",
  },
};

type AnalysisToolbarProps = {
  /** 마지막으로 분석·비교한 시각. 아직 안 했으면 null */
  analyzedAt: string | null;
  kind?: keyof typeof TEXT;
  /** 실행 요청. 실패하면 화면에 보일 문구를 준다 */
  onRun?: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** 백엔드가 지금 분석 중인지. true인 동안 5초마다 다시 읽는다 */
  running?: boolean;
  /** 마지막 분석 요청이 실패했는지 */
  failed?: boolean;
};

export function AnalysisToolbar({ analyzedAt, kind = "analysis", onRun, running = false, failed = false }: AnalysisToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = TEXT[kind];
  const busy = running || isPending || requested;
  const status = error ?? (busy ? text.requested : failed ? text.failed : analyzedAt ? `${formatDateTime(analyzedAt)} 기준` : text.none);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, router]);

  function run() {
    setError(null);
    if (!onRun) {
      setRequested(true);
      return;
    }
    startTransition(async () => {
      const result = await onRun();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      /* 새 결과로 다시 읽을 때까지 실행 중 표시를 유지한다 */
      router.refresh();
    });
  }

  return (
    <div className={styles.toolbar}>
      <Button size="sm" variant="secondary" disabled={busy} onClick={run} className={styles.button}>
        <SparkleIcon aria-hidden="true" weight="fill" />
        {busy ? text.pending : analyzedAt ? text.rerun : text.run}
      </Button>
      <p aria-live="polite" className={styles.status}>
        {status}
      </p>
    </div>
  );
}
