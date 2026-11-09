"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card/Card";
import { buildVersionBars, type ComparisonGroup, type VersionBarView } from "@/features/recruitment/types";
import styles from "./VersionBars.module.css";

/*
 * 버전 별 리뷰 수. 넓은 화면에서 반씩: 왼쪽은 기준(심각도·그룹·태그)마다 두 버전 막대를 나란히, 오른쪽은 그 기준이 무엇을 세는지와 칸별 증감 표.
 * 막대는 눈으로 견주는 용도라 읽는 프로그램에는 숨기고, 같은 숫자를 오른쪽 표로 읽힌다.
 */

const VIEW_LABEL: Record<VersionBarView, string> = { severity: "심각도 별", group: "그룹 별", tag: "태그 별" };

/** 표 첫 칸 제목 */
const VIEW_COLUMN: Record<VersionBarView, string> = { severity: "심각도", group: "그룹", tag: "태그" };

const viewText = (view: VersionBarView, before: string, after: string) =>
  ({
    severity: "그룹에 묶인 리뷰를 그룹 심각도(치명·높음·보통·사소)로 나눠 두 버전을 견줘요.",
    group: `같은 문제로 묶인 그룹마다 두 버전의 리뷰 수를 견줘요. 새로 생긴 그룹은 ${before}이, 리뷰가 들어오지 않은 그룹은 ${after}가 0건이에요.`,
    tag: "그룹에 묶인 리뷰를 버그·UX·요청으로 나눠 두 버전을 견줘요.",
  })[view];

type VersionBarsProps = {
  groups: ComparisonGroup[];
  previousVersion: number;
  currentVersion: number;
};

export function VersionBars({ groups, previousVersion, currentVersion }: VersionBarsProps) {
  const [view, setView] = useState<VersionBarView>("severity");
  const bars = buildVersionBars(groups)[view];
  const scale = Math.max(1, ...bars.flatMap((bar) => [bar.previous, bar.current]));
  const before = `v${previousVersion}`;
  const after = `v${currentVersion}`;
  const total = bars.reduce((sum, bar) => ({ previous: sum.previous + bar.previous, current: sum.current + bar.current }), { previous: 0, current: 0 });

  return (
    <div className={styles.split}>
      <section aria-labelledby="version-bars-heading" className={styles.section}>
        <div className={styles.head}>
          <h2 id="version-bars-heading" className={styles.title}>
            버전 별 리뷰 수
          </h2>
          <p className={styles.note}>그룹에 묶인 리뷰</p>
        </div>
        <Card as="div" className={styles.card}>
          <div className={styles.toolbar}>
            <div role="group" aria-label="막대 기준" className={styles.segment}>
              {(Object.keys(VIEW_LABEL) as VersionBarView[]).map((key) => (
                <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={styles.segmentButton}>
                  {VIEW_LABEL[key]}
                </button>
              ))}
            </div>
            <p aria-hidden="true" className={styles.legend}>
              <span data-side="previous" className={styles.legendItem}>
                <span className={styles.swatch} />
                {before} 이전
              </span>
              <span data-side="current" className={styles.legendItem}>
                <span className={styles.swatch} />
                {after} 이번
              </span>
            </p>
          </div>
          {bars.length === 0 ? (
            <p className={styles.empty}>두 버전 모두 묶인 리뷰가 없어요</p>
          ) : (
            /* 기준을 바꾸면 막대가 다시 자라도록 새로 그린다 */
            <ul key={view} aria-hidden="true" className={styles.chart}>
              {bars.map((bar) => (
                <li key={bar.key} className={styles.row}>
                  <span className={styles.label}>{bar.label}</span>
                  {(["previous", "current"] as const).map((side) => (
                    <span key={side} data-side={side} className={styles.bar}>
                      <span className={styles.fill} style={{ width: `${(bar[side] / scale) * 100}%` }} />
                      <span className={styles.value}>{bar[side]}</span>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="version-bars-guide-heading" className={styles.section}>
        <div className={styles.head}>
          <h2 id="version-bars-guide-heading" className={styles.title}>
            막대 기준 설명
          </h2>
          <p className={styles.note}>{VIEW_LABEL[view]}</p>
        </div>
        <Card as="div" className={styles.card}>
          <p className={styles.guide}>{viewText(view, before, after)}</p>
          {bars.length > 0 && (
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                {VIEW_LABEL[view]} {before}·{after} 리뷰 수
              </caption>
              <thead>
                <tr>
                  <th scope="col">{VIEW_COLUMN[view]}</th>
                  <th scope="col" className={styles.number}>
                    {before}
                  </th>
                  <th scope="col" className={styles.number}>
                    {after}
                  </th>
                  <th scope="col" className={styles.number}>
                    증감
                  </th>
                </tr>
              </thead>
              <tbody>
                {bars.map((bar) => (
                  <tr key={bar.key}>
                    <th scope="row" className={styles.rowLabel}>
                      {bar.label}
                    </th>
                    <td className={styles.number}>{bar.previous}</td>
                    <td className={styles.number}>{bar.current}</td>
                    <Delta value={bar.current - bar.previous} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">합계</th>
                  <td className={styles.number}>{total.previous}</td>
                  <td className={styles.number}>{total.current}</td>
                  <Delta value={total.current - total.previous} />
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}

/** 문제 리뷰라 늘면 나빠진 것이다(빨강), 줄면 초록 */
function Delta({ value }: { value: number }) {
  return (
    <td data-trend={value > 0 ? "up" : value < 0 ? "down" : "same"} className={styles.delta}>
      {value > 0 ? `+${value}` : value}
    </td>
  );
}
