"use client";

import { ArrowRightIcon, DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react";
import { type DragEvent, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { COMPARISON_STATUS_LABEL, type ComparisonGroup, type ComparisonStatus, type ReviewGroupView } from "@/features/recruitment/types";
import { SeverityTag } from "../SeverityTag/SeverityTag";
import styles from "./GroupLinks.module.css";

/*
 * 그룹 전체 목록. 이번 버전 그룹마다 한 줄이고, 왼쪽에 이어진 직전 버전 그룹을 모두 보여 준다(v1 → v2, N:M).
 * 칸은 이전 버전과 묶인 그룹(둘 다) → 새로 생긴 그룹(이번 버전만) → 리뷰가 들어오지 않은 그룹(직전 버전만) 순서다.
 * AI가 이은 짝은 여기서만 고친다: 이번 버전 그룹 줄을 아무 줄의 직전 그룹 위에 놓으면 그 그룹과도 묶이고(직전 그룹 하나를 여러 줄에 이어도 된다),
 * 직전 그룹 옆 풀기 버튼으로 하나씩 풀며, 묶인 줄을 "새로 생긴 그룹" 칸에 놓으면 모두 풀린다.
 * 끌 수 없는 키보드·터치에서는 줄의 손잡이 버튼으로 줄을 집고, 놓을 곳에 생기는 버튼을 누른다.
 * 고친 짝은 맨 아래 저장을 눌러야 위의 수·막대와 아래 레포트에 반영된다. 저장한 짝은 다시 비교해도 바뀌지 않는다.
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
  /** 이번 버전 그룹에 직전 그룹을 더 잇는다 */
  onLink: (currentId: string, previousId: string) => void;
  /** 이번 버전 그룹의 짝을 푼다. previousId가 없으면 모두 푼다 */
  onUnlink: (currentId: string, previousId?: string) => void;
  /** 고친 짝을 저장한다. 실패하면 화면에 보일 문구를 준다 */
  onSave: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** 저장하지 않은 변경을 버린다 */
  onDiscard: () => void;
};

export function GroupLinks({ groups, previousVersion, currentVersion, dirty, onLink, onUnlink, onSave, onDiscard }: GroupLinksProps) {
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

  /** 고친 뒤 저장 상태를 지운다 */
  function edited() {
    setSaved(false);
    setError(null);
  }

  /** 집은 그룹을 놓는다: 직전 그룹 id를 주면 그 그룹과 잇고, null이면 짝을 모두 푼다 */
  function place(previousId: string | null) {
    if (pickedId) {
      if (previousId === null) onUnlink(pickedId);
      else onLink(pickedId, previousId);
      edited();
    }
    endPick();
  }

  /** 끄는 그룹을 여기에 놓을 수 있으면 놓기를 받고, 위에 올라와 있는 동안 표시한다 */
  const dropTarget = (key: string, allowed: boolean, previousId: string | null) =>
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
            event.stopPropagation();
            place(previousId);
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
        <p className={styles.note}>줄을 직전 그룹 위로 끌어 놓아 짝을 더하고, 풀기로 하나씩 풀어 저장해요</p>
      </div>
      <Card as="div" className={styles.list}>
        {STATUSES.map((status) => {
          const items = groups.filter((group) => group.status === status);
          /* 묶인 줄을 이 칸에 놓으면 짝이 모두 풀린다 */
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
                    여기로 옮겨 짝 모두 풀기
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <p className={styles.partEmpty}>{EMPTY_TEXT[status]}</p>
              ) : (
                <ul className={styles.items}>
                  {items.map((group) => {
                    const current = group.current;
                    const isPicked = Boolean(current) && current?.id === pickedId;
                    const previousCount = group.previous.reduce((sum, item) => sum + item.reviews.length, 0);
                    return (
                      <li
                        key={group.key}
                        draggable={Boolean(current)}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", group.name);
                          setPickedId(current?.id ?? null);
                        }}
                        onDragEnd={endPick}
                        data-picked={isPicked}
                        className={styles.item}
                      >
                        <ul aria-label={`이어진 ${before} 그룹`} className={styles.previousList}>
                          {group.previous.length === 0 ? (
                            <li className={styles.side}>
                              <span className={styles.version}>{before}</span>
                              <span className={styles.none}>없음</span>
                            </li>
                          ) : (
                            group.previous.map((item) => {
                              /* 집은 그룹과 아직 이어지지 않은 직전 그룹이면 여기에 놓아 묶는다 */
                              const target = Boolean(picked) && !picked?.previous.some((linked) => linked.id === item.id);
                              const key = `${group.key}-${item.id}`;
                              return (
                                <li
                                  key={item.id}
                                  data-droppable={target}
                                  data-over={overKey === key}
                                  className={styles.side}
                                  {...dropTarget(key, target, item.id)}
                                >
                                  <Side version={before} group={item} />
                                  {target ? (
                                    <button type="button" onClick={() => place(item.id)} className={styles.placeButton}>
                                      여기에 묶기
                                    </button>
                                  ) : (
                                    current && (
                                      <button
                                        type="button"
                                        aria-label={`${item.name} 짝 풀기`}
                                        onClick={() => {
                                          onUnlink(current.id, item.id);
                                          edited();
                                        }}
                                        className={styles.unlink}
                                      >
                                        <XIcon aria-hidden="true" weight="bold" />
                                      </button>
                                    )
                                  )}
                                </li>
                              );
                            })
                          )}
                        </ul>
                        <ArrowRightIcon aria-hidden="true" className={styles.arrow} />
                        <span data-area="current" className={styles.side}>
                          {current ? <Side version={after} group={current} /> : <><span className={styles.version}>{after}</span><span className={styles.none}>없음</span></>}
                        </span>
                        <span className={styles.counts}>
                          <span aria-hidden="true">
                            {previousCount} → {current?.reviews.length ?? 0}건
                          </span>
                          <span className={styles.srOnly}>
                            리뷰 {before} {previousCount}건, {after} {current?.reviews.length ?? 0}건
                          </span>
                        </span>
                        {/* 손잡이: 마우스는 줄을 끌고, 키보드·터치는 눌러서 집은 뒤 놓을 곳의 버튼을 누른다 */}
                        {current && (
                          <button
                            type="button"
                            aria-pressed={isPicked}
                            aria-label={`${group.name} 짝 고치기`}
                            onClick={() => (isPicked ? endPick() : setPickedId(current.id))}
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

/** 그룹 하나: 버전 이름, 심각도, 그룹 이름 */
function Side({ version, group }: { version: string; group: ReviewGroupView }) {
  return (
    <>
      <span className={styles.version}>{version}</span>
      <SeverityTag severity={group.severity} />
      <span className={styles.name}>{group.name}</span>
    </>
  );
}
