/*
 * 재단 매트 격자. 작업대에 까는 재단 매트처럼 24px 잔눈금과 120px 굵은 눈금을 글자색으로 아주 옅게(5% / 10%) 그린다.
 * 다크에서는 밝은 선이 어두운 면 위에서 더 도드라져 60%로 한 단계 더 옅게 한다.
 * 배너 위 카드와 교정지가 매트 위에 놓인 종이처럼 보이게 하는 배경이라 보조 기술에서는 숨긴다.
 * 홈 배너 하나에만 쓰므로 패턴 id를 고정한다.
 */
export function MatGrid() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full text-text dark:opacity-60">
      <defs>
        <pattern id="hero-mat-minor" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.05" />
        </pattern>
        <pattern id="hero-mat-major" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect width="120" height="120" fill="url(#hero-mat-minor)" />
          <path d="M120 0H0V120" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-mat-major)" />
    </svg>
  );
}
