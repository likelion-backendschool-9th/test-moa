/** 교정쇄의 네 모서리 재단선. 장식이라 보조 기술에서는 숨긴다 (고침 #60: 오른쪽 위 CMYK 색 막대를 뺐다) */
export function ProofMarks() {
  const corner = "absolute size-4 border-mark";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`${corner} top-3 left-3 border-t border-l`} />
      <span className={`${corner} top-3 right-3 border-t border-r`} />
      <span className={`${corner} bottom-3 left-3 border-b border-l`} />
      <span className={`${corner} right-3 bottom-3 border-r border-b`} />
    </div>
  );
}
