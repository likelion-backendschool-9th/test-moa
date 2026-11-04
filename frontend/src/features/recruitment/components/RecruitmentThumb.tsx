import type { ReactNode } from "react";
import type { Recruitment } from "../types";
import { ProofStamp } from "./ProofStamp";

/**
 * 활자 썸네일. 가짜 스크린샷 대신 교정지 위에 서비스 이름을 크게 앉혀 이름 자체를 그림으로 쓴다.
 * stamp가 있으면 오른쪽 위에 교정 도장을 찍는다 (정원이 찬 모집의 '모집 완료', 참여 내역의 '지급 완료').
 * category가 있으면 왼쪽 위에 테두리만 있는 연한 유형 배지를 붙인다 (홈 카드). 배지와 이름은 같은 안쪽 여백(12px, 640px 이상 16px)에 맞춘다.
 * badge가 있으면 오른쪽 위에 얹고(참여 내역의 '추가 보상'), 도장은 오른쪽 가운데로 옮긴다.
 * badge가 길어("추가 보상 +300 크레딧") 192px 리스트 썸네일에서는 도장과 같은 높이에 둘 자리가 없어서, #59에서 맞춘 배치를 그대로 쓴다.
 */
export function RecruitmentThumb({
  recruitment,
  stamp,
  category,
  badge,
}: {
  recruitment: Recruitment;
  stamp?: string;
  category?: string;
  badge?: ReactNode;
}) {
  return (
    <div
      data-thumb
      className="@container relative flex aspect-[16/10] items-end overflow-hidden rounded-2xl border border-line bg-thumb p-3 text-on-thumb sm:p-4"
    >
      <h3 className="text-[15cqw] leading-[1.02] font-extrabold tracking-[-0.04em] text-balance">{recruitment.projectName}</h3>
      {category && (
        <span className="absolute top-3 left-3 rounded-full px-2 py-1 text-xs font-bold whitespace-nowrap inset-ring inset-ring-on-thumb/25 sm:top-4 sm:left-4 sm:px-2.5">
          {category}
        </span>
      )}
      {stamp && <ProofStamp label={stamp} placement={badge ? "middle" : "corner"} />}
      {badge && <div className="absolute top-2.5 right-2.5">{badge}</div>}
    </div>
  );
}
