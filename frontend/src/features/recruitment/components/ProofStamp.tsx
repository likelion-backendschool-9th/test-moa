/** 교정 도장. 두 줄 테두리의 평면 표식으로, 이름 위에 겹쳐 찍힌다 */
export function ProofStamp({ label }: { label: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 160 64"
      className="pointer-events-none absolute top-1/2 right-[6%] w-[42%] -translate-y-1/2 -rotate-12 text-accent mix-blend-multiply dark:mix-blend-normal"
    >
      <rect x="3" y="3" width="154" height="58" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="10" y="10" width="140" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="80" y="40" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="800" letterSpacing="2">
        {label}
      </text>
    </svg>
  );
}
