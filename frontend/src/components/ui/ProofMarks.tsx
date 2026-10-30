/** 교정쇄의 재단선과 색 막대. 장식이라 보조 기술에서는 숨긴다. 색 막대는 라이트에만 보인다 */
export function ProofMarks() {
  const corner = "absolute size-4 border-mark";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`${corner} top-3 left-3 border-t border-l`} />
      <span className={`${corner} top-3 right-3 border-t border-r`} />
      <span className={`${corner} bottom-3 left-3 border-b border-l`} />
      <span className={`${corner} right-3 bottom-3 border-r border-b`} />
      <span className="absolute top-8 right-8 flex dark:hidden">
        <span className="h-2.5 w-5 bg-proof-c" />
        <span className="h-2.5 w-5 bg-proof-m" />
        <span className="h-2.5 w-5 bg-proof-y" />
        <span className="h-2.5 w-5 bg-mark" />
      </span>
    </div>
  );
}
