const PLACEMENT = {
  /* 썸네일 오른쪽 위에 이름과 겹치지 않게 겹쳐 찍는다 */
  corner: "absolute top-[7%] right-[5%] w-[max(30%,4.5rem)] -rotate-8",
  bottomRight: "absolute bottom-[7%] right-[5%] w-[max(45%,6rem)] -rotate-8",
  /* 오른쪽 위에 다른 배지가 있을 때(참여 내역의 '추가 보상') 오른쪽 가운데에 이름 위로 겹쳐 찍는다. #59의 배치 그대로 */
  middle: "absolute top-1/2 right-[6%] w-[42%] -translate-y-1/2 -rotate-12",
  /* 768px 이상에서 글줄 안에 놓는다 (예: 홈 배너 진행 흐름의 마지막 줄) */
  inline: "hidden w-24 shrink-0 -rotate-6 md:block lg:w-28",
  /* 768px 미만에서 면의 오른쪽 아래 가장자리에 걸쳐 찍는다. 좁은 글줄을 비워 두려고 inline과 짝으로 쓴다 */
  edge: "absolute -bottom-4 right-3 w-20 -rotate-6 md:hidden",
};

/** 교정 도장. 두 줄 테두리의 평면 표식 */
export function ProofStamp({ label, placement = "corner", paper = false }: { label: string; placement?: keyof typeof PLACEMENT; paper?: boolean }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 160 64"
      className={`pointer-events-none ${paper ? "text-paper-accent mix-blend-normal" : "text-accent mix-blend-multiply dark:mix-blend-normal"} ${PLACEMENT[placement]}`}
    >
      {paper && <rect x="3" y="3" width="154" height="58" rx="10" className="fill-thumb" />}
      <rect x="3" y="3" width="154" height="58" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="10" y="10" width="140" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="80" y="40" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="800" letterSpacing="2">
        {label}
      </text>
    </svg>
  );
}
