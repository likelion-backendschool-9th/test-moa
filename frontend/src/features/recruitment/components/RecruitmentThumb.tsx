import { isFull, type Recruitment } from "../types";
import { ProofStamp } from "./ProofStamp";

/**
 * 활자 썸네일. 가짜 스크린샷 대신 교정지 위에 서비스 이름을 크게 앉혀 이름 자체를 그림으로 쓴다.
 * 정원이 찬 모집에는 교정 도장 '모집 완료'를 겹쳐 찍는다.
 */
export function RecruitmentThumb({ recruitment }: { recruitment: Recruitment }) {
  return (
    <div
      data-thumb
      className="@container relative flex aspect-[16/10] items-end overflow-hidden rounded-2xl border border-line bg-thumb p-4 text-on-thumb sm:p-5"
    >
      <span aria-hidden className="absolute top-2.5 left-2.5 size-3 border-t border-l border-current opacity-30" />
      <span aria-hidden className="absolute right-2.5 bottom-2.5 size-3 border-r border-b border-current opacity-30" />
      <h3 className="text-[15cqw] leading-[1.02] font-extrabold tracking-[-0.04em] text-balance">{recruitment.projectName}</h3>
      {isFull(recruitment) && <ProofStamp label="모집 완료" />}
    </div>
  );
}
