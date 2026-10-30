/**
 * 채팅 카드의 작은 활자 썸네일. 모집 카드의 활자 썸네일(RecruitmentThumb)과 같은 교정지 면을 정사각형으로 줄이고,
 * 프로젝트 이름 첫 글자를 크게 앉힌다. 프로젝트 사진이 생기면 이 자리에 넣는다.
 * 이름은 카드 제목에 있으니 보조 기술에는 숨긴다.
 */
export function ChatThumb({ projectName }: { projectName: string }) {
  return (
    <div
      aria-hidden
      data-thumb
      className="@container relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-thumb text-on-thumb transition-transform duration-500 ease-brand group-hover:-translate-y-1 md:size-16"
    >
      <span className="absolute top-1.5 left-1.5 size-2 border-t border-l border-current opacity-30" />
      <span className="absolute right-1.5 bottom-1.5 size-2 border-r border-b border-current opacity-30" />
      <span className="text-[44cqw] leading-none font-extrabold tracking-[-0.04em]">{Array.from(projectName)[0]}</span>
    </div>
  );
}
