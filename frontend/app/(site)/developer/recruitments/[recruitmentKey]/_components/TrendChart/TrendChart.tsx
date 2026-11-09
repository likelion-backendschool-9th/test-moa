"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card/Card";
import { yTicks, type TrendPoint, type TrendRange } from "@/features/recruitment/types";
import styles from "./TrendChart.module.css";

/*
 * 시간대별 리뷰 수 꺾은선. 하루(3시간 간격)·일주일(하루 간격)·30일(3일 간격)로 바꿔 본다. 모두 어제까지다.
 * y축 위끝은 고른 범위에서 가장 많이 들어온 칸에 맞춘다. 그림은 읽는 프로그램에 숨기고 같은 값을 표로 알린다.
 */

const RANGES: Array<{ value: TrendRange; label: string; caption: string }> = [
  { value: "day", label: "하루", caption: "3시간 간격으로 분석해요." },
  { value: "week", label: "일주일", caption: "하루 간격으로 분석해요." },
  { value: "month", label: "30일", caption: "3일 간격으로 분석해요." },
];

/** 하루 범위의 x축 눈금 00, 03 … 24 */
const HOUR_TICKS = Array.from({ length: 9 }, (_, index) => index * 3);

export function TrendChart({ trends }: { trends: Record<TrendRange, TrendPoint[]> }) {
  const [range, setRange] = useState<TrendRange>("day");
  const gradientId = useId();
  const points = trends[range];
  const ticks = yTicks(points.map((point) => point.reviews));
  const top = ticks[ticks.length - 1];
  /* 점은 칸의 가운데에 찍는다(하루면 01:30, 04:30 …) */
  const x = (index: number) => ((index + 0.5) / points.length) * 100;
  const y = (value: number) => 100 - (value / top) * 100;
  const line = points.map((point, index) => `${x(index)},${y(point.reviews)}`).join(" ");
  const current = RANGES.find((item) => item.value === range) ?? RANGES[0];

  return (
    <Card as="figure" className={styles.chartCard}>
      <figcaption className={styles.chartCaption}>
        <span className={styles.chartText}>
          <span className={styles.chartTitle}>{current.caption}</span>
          <span className={styles.chartHint}>
            x축은 {range === "day" ? "시간" : "날짜"}, y축은 해당 구간의 리뷰 유입 건수입니다. y축 상한은 가장 많이 들어온 구간을 기준으로
            자동으로 조정돼요.
          </span>
        </span>
        <span role="group" aria-label="그래프 기간" className={styles.segment}>
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={range === item.value}
              onClick={() => setRange(item.value)}
              className={styles.segmentButton}
            >
              {item.label}
            </button>
          ))}
        </span>
      </figcaption>

      <div className={styles.chart} aria-hidden="true">
        <div className={styles.frame}>
          <div className={styles.yAxis}>
            {ticks.map((tick) => (
              <span key={tick} className={styles.yLabel} style={{ top: `${y(tick)}%` }}>
                {tick}
              </span>
            ))}
          </div>
          <div className={styles.plot}>
            {ticks.map((tick) => (
              <span key={tick} className={styles.gridLine} style={{ top: `${y(tick)}%` }} />
            ))}
            {/* 기간을 바꿀 때마다 새로 붙여 왼쪽부터 다시 그려지는 애니메이션을 돌린다 */}
            <div key={range} className={styles.drawing}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.line}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className={styles.areaTop} />
                    <stop offset="1" className={styles.areaBottom} />
                  </linearGradient>
                </defs>
                <polygon points={`${x(0)},100 ${line} ${x(points.length - 1)},100`} fill={`url(#${gradientId})`} />
                <polyline points={line} vectorEffect="non-scaling-stroke" />
              </svg>
              {points.map((point, index) => (
                <span
                  key={point.title}
                  title={`${point.title} ${point.reviews}건`}
                  className={styles.dot}
                  style={{ left: `${x(index)}%`, top: `${y(point.reviews)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div data-range={range} className={styles.xAxis}>
          {range === "day"
            ? HOUR_TICKS.map((hour) => (
                <span key={hour} className={styles.xLabel} style={{ left: `${(hour / 24) * 100}%` }}>
                  {String(hour).padStart(2, "0")}
                </span>
              ))
            : points.map((point, index) => (
                /* 30일은 칸이 많아 좁은 화면에서 한 칸 건너 하나만 보인다 */
                <span key={point.title} data-odd={index % 2 === 1} className={styles.xLabel} style={{ left: `${x(index)}%` }}>
                  {point.label}
                </span>
              ))}
        </div>
      </div>

      <table className={styles.srOnly}>
        <caption>{current.label} 구간별 리뷰 수</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.title}>
              <th scope="row">{point.title}</th>
              <td>{point.reviews}건</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
