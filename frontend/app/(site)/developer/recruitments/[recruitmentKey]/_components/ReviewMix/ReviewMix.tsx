"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card/Card";
import type { ReviewMixSlice, ReviewMixView } from "@/features/recruitment/types";
import styles from "./ReviewMix.module.css";

/*
 * 내 리뷰 성향 원형 그래프. 그룹에 묶인 리뷰가 태그·그룹·심각도 별로 어떻게 나뉘는지 보여 준다.
 * 가운데에 전체 수, 옆 범례에 조각마다 수와 비율을 둔다. 범례가 표 역할을 해서 그림은 읽는 프로그램에 숨긴다.
 */

const VIEWS: Array<{ value: ReviewMixView; label: string }> = [
  { value: "tag", label: "태그 별" },
  { value: "group", label: "그룹 별" },
  { value: "severity", label: "심각도 별" },
];

/* 지름 100 기준 도넛: 반지름 40, 두께 16. 조각 사이는 2px만큼 띄운다 */
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.2;

export function ReviewMix({ mix }: { mix: Record<ReviewMixView, ReviewMixSlice[]> }) {
  const [view, setView] = useState<ReviewMixView>("tag");
  const slices = mix[view];
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const percent = (count: number) => Math.round((count / Math.max(total, 1)) * 100);
  /* 조각마다 둘레에서 차지하는 길이와 시작 위치(12시 방향부터 시계 방향) */
  const lengthOf = (slice: ReviewMixSlice) => (slice.count / Math.max(total, 1)) * CIRCUMFERENCE;
  const arcs = slices.map((slice, index) => ({
    slice,
    length: lengthOf(slice),
    start: slices.slice(0, index).reduce((sum, item) => sum + lengthOf(item), 0),
  }));
  const gap = slices.length > 1 ? GAP : 0;

  return (
    <Card as="figure" className={styles.card}>
      <figcaption className={styles.caption}>
        <span className={styles.text}>
          <span className={styles.title}>어떤 리뷰가 많은지 나눠 봐요.</span>
          <span className={styles.hint}>AI가 그룹으로 묶은 리뷰 수를 기준으로 해요.</span>
        </span>
        <span role="group" aria-label="나눠 볼 기준" className={styles.segment}>
          {VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={view === item.value}
              onClick={() => setView(item.value)}
              className={styles.segmentButton}
            >
              {item.label}
            </button>
          ))}
        </span>
      </figcaption>

      {total === 0 ? (
        <p className={styles.empty}>나눠 볼 리뷰가 없어요</p>
      ) : (
        <div className={styles.body}>
          <div className={styles.donut}>
            {/* 기준을 바꿀 때마다 새로 붙여 한 바퀴 다시 그려지는 애니메이션을 돌린다 */}
            <svg key={view} viewBox="0 0 100 100" aria-hidden="true" className={styles.svg}>
              {arcs.map(({ slice, length, start }) => {
                const drawn = Math.max(length - gap, 0);
                return (
                  <circle
                    key={slice.key}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    data-color={slice.color}
                    className={styles.slice}
                    strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                    strokeDashoffset={-start}
                  >
                    <title>{`${slice.label} ${slice.count}건 (${percent(slice.count)}%)`}</title>
                  </circle>
                );
              })}
            </svg>
            <p className={styles.total}>
              <strong className={styles.totalValue}>{total}</strong>
              <span className={styles.totalLabel}>리뷰</span>
            </p>
          </div>

          <ul aria-label={`${VIEWS.find((item) => item.value === view)?.label} 리뷰 수`} className={styles.legend}>
            {slices.map((slice) => (
              <li key={slice.key} className={styles.legendItem}>
                <span aria-hidden="true" data-color={slice.color} className={styles.swatch} />
                <span className={styles.legendLabel}>{slice.label}</span>
                <span className={styles.legendValue}>
                  {slice.count}건 <span className={styles.legendPercent}>{percent(slice.count)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
