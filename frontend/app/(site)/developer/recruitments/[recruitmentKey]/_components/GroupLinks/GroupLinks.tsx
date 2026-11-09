"use client";

import { ArrowRightIcon, DotsSixVerticalIcon } from "@phosphor-icons/react";
import { type DragEvent, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { COMPARISON_STATUS_LABEL, type ComparisonGroup, type ComparisonStatus, type ReviewGroupView } from "@/features/recruitment/types";
import { SeverityTag } from "../SeverityTag/SeverityTag";
import styles from "./GroupLinks.module.css";

/*
 * 그룹 전체 목록. 직전 버전과 이번 버전 그룹이 어떻게 묶였는지 한 줄에 짝(v1 → v2)으로 보여 준다.
 * 칸은 이전 버전과 묶인 그룹(둘 다) → 새로 생긴 그룹(이번 버전만) → 리뷰가 들어오지 않은 그룹(직전 버전만) 순서다.
 * AI가 이은 짝은 여기서만 고친다: 이번 버전 그룹이 있는 줄을 "리뷰가 들어오지 않은 그룹" 줄 위에 놓으면 묶이고, 묶인 줄을 "새로 생긴 그룹" 칸에 놓으면 풀린다.
 * 끌 수 없는 키보드·터치에서는 줄의 손잡이 버튼으로 줄을 집고, 놓을 곳에 생기는 버튼을 누른다.
 * 고친 짝은 맨 아래 저장을 눌러야 위의 수·막대와 아래 레포트에 반영된다.
 */

const STATUSES: ComparisonStatus[] = ["continued", "new", "notReported"];

const EMPTY_TEXT: Record<ComparisonStatus, string> = {
  continued: "이전 버전과 묶인 그룹이 없어요",
  new: "새로 생긴 그룹이 없어요",
  notReported: "이전 버전 그룹 모두 이번에도 리뷰가 들어왔어요",
};

type GroupLinksProps = {
  /** 고치는 중인 짝(저장 전) */
  groups: ComparisonGroup[];
  previousVersion: number;
  currentVersion: number;
  /** 저장하지 않은 변경이 있는지 */
  dirty: boolean;
  /** 이번 버전 그룹을 직전 그룹(분류 코드)과 묶는다. null이면 짝을 푼다 */
  onRelink: (currentId: string, previousCode: string | null) => void;
  /** 고친 짝을 저장한다. 실패하면 화면에 보일 문구를 준다 */
  onSave: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** 저장하지 않은 변경을 버린다 */
  onDiscard: () => void;
};

export function GroupLinks({ groups, previousVersion, currentVersion, dirty, onRelink, onSave, onDiscard }: GroupLinksProps) {
  /** 끌거나 손잡이로 집은 이번 버전 그룹 id와, 끌어 올린 곳 */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = groups.find((group) => group.current?.id === pickedId);
  const before = `v${previousVersion}`;
  const after = `v${currentVersion}`;

  function endPick() {
    setPickedId(null);
    setOverKey(null);
  }

  /** 집은 그룹을 놓는다: 직전 코드와 묶고, null이면 짝을 푼다 */
  function place(previousCode: string | null) {
    if (pickedId) {
      onRelink(pickedId, previousCode);
      setSaved(false);
      setError(null);
    }
    endPick();
  }

  /** 끄는 그룹을 여기에 놓을 수 있으면 놓기를 받고, 위에 올라와 있는 동안 표시한다 */
  const dropTarget = (key: string, allowed: boolean, previousCode: string | null) =>
    allowed
      ? {
          onDragOver: (event: DragEvent) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOverKey(key);
          },
          onDragLeave: (event: DragEvent) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverKey(null);
          },
          onDrop: (event: DragEvent) => {
            event.preventDefault();
            place(previousCode);
          },
        }
      : {};

  return (
    <section
      aria-labelledby="group-links-heading"
      onKeyDown={(event) => event.key === "Escape" && pickedId && endPick()}
      className={styles.section}
    >
      <div className={styles.head}>
        <h2 id="group-links-heading" className={styles.title}>
          그룹 전체 목록
        </h2>
        <p className={styles.note}>줄을 끌어 놓아 짝을 고치고 저장해요</p>
      </div>
      <Card as="div" className={styles.list}>
        {STATUSES.map((status) => {
          const items = groups.filter((group) => group.status === status);
          /* 묶인 줄을 이 칸에 놓으면 짝이 풀린다 */
          const droppable = status === "new" && picked?.status === "continued";
          return (
            <div
              key={status}
              role="group"
              aria-labelledby={`group-links-${status}`}
              data-droppable={droppable}
              data-over={overKey === status}
              className={styles.part}
              {...dropTarget(status, droppable, null)}
            >
              <div className={styles.partHead}>
                <h3 id={`group-links-${status}`} className={styles.partTitle}>
                  {COMPARISON_STATUS_LABEL[status]}
                  <span className={styles.partCount}>{items.length}</span>
                </h3>
                {droppable && (
                  <button type="button" onClick={() => place(null)} className={styles.placeButton}>
                    여기로 옮겨 짝 풀기
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <p className={styles.partEmpty}>{EMPTY_TEXT[status]}</p>
              ) : (
                <ul className={styles.items}>
                  {items.map((group) => {
                    const key = group.current?.id ?? group.previous?.id ?? group.code;
                    const isPicked = Boolean(group.current) && group.current?.id === pickedId;
                    /* 리뷰가 들어오지 않은 줄에 이번 버전 그룹을 놓으면 묶인다 */
                    const target = !group.current && Boolean(picked);
                    return (
                      <li
                        key={key}
                        draggable={Boolean(group.current)}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", group.name);
                          setPickedId(group.current?.id ?? null);
                        }}
                        onDragEnd={endPick}
                        data-picked={isPicked}
                        data-droppable={target}
                        data-over={overKey === key}
                        className={styles.item}
                        {...dropTarget(key, target, group.code)}
                      >
                        <Side version={before} group={group.previous} area="previous" />
                        <ArrowRightIcon aria-hidden="true" className={styles.arrow} />
                        <Side version={after} group={group.current} area="current" />
                        {target ? (
                          <button type="button" onClick={() => place(group.code)} className={styles.placeButton}>
                            여기에 묶기
                          </button>
                        ) : (
                          <span className={styles.counts}>
                            <span aria-hidden="true">
                              {group.previous?.reviews.length ?? 0} → {group.current?.reviews.length ?? 0}건
                            </span>
                            <span className={styles.srOnly}>
                              리뷰 {before} {group.previous?.reviews.length ?? 0}건, {after} {group.current?.reviews.length ?? 0}건
                            </span>
                          </span>
                        )}
                        {/* 손잡이: 마우스는 줄을 끌고, 키보드·터치는 눌러서 집은 뒤 놓을 곳의 버튼을 누른다 */}
                        {group.current && (
                          <button
                            type="button"
                            aria-pressed={isPicked}
                            aria-label={`${group.name} 짝 고치기`}
                            onClick={() => (isPicked ? endPick() : setPickedId(group.current?.id ?? null))}
                            className={styles.handle}
                          >
                            <DotsSixVerticalIcon aria-hidden="true" weight="bold" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </Card>

      <div className={styles.footer}>
        <p role="status" className={styles.footerNote}>
          {error ?? (dirty ? "저장하지 않은 변경이 있어요" : saved ? "저장했어요" : "")}
        </p>
        <Button variant="secondary" disabled={!dirty || saving} onClick={onDiscard}>
          되돌리기
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            const result = await onSave();
            setSaving(false);
            if (result.ok) setSaved(true);
            else setError(result.message);
          }}
        >
          {saving ? "저장 중…" : "저장"}
        </Button>
      </div>
    </section>
  );
}

/** 줄의 한쪽 버전: 버전 이름, 심각도, 그룹 이름. 그 버전에 그룹이 없으면 "없음" */
function Side({ version, group, area }: { version: string; group: ReviewGroupView | null; area: "previous" | "current" }) {
  return (
    <span data-area={area} className={styles.side}>
      <span className={styles.version}>{version}</span>
      {group ? (
        <>
          <SeverityTag severity={group.severity} />
          <span className={styles.name}>{group.name}</span>
        </>
      ) : (
        <span className={styles.none}>없음</span>
      )}
    </span>
  );
}
