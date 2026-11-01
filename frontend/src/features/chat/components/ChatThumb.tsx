import Image from "next/image";

/**
 * 채팅 카드 왼쪽의 프로젝트 이미지 자리. 카드 높이를 다 채우고, 선이나 그라데이션 없이 바로 옆에 채팅방 정보가 온다.
 * 이미지가 있으면 면을 꽉 채우고(hover 때 살짝 확대), 없으면 모집 카드의 활자 썸네일(RecruitmentThumb)과 같은 면·재단선 위에
 * 프로젝트 이름 첫 글자를 크게 앉힌다. 이름은 카드 제목에 있으니 이미지는 장식으로 두고 보조 기술에는 숨긴다.
 */
export function ChatThumb({ projectName, imageUrl }: { projectName: string; imageUrl?: string }) {
  return (
    <div
      aria-hidden
      data-thumb
      className="@container relative grid w-24 shrink-0 place-items-center self-stretch overflow-hidden rounded-l-2xl bg-thumb text-on-thumb sm:w-32 md:w-40"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 10rem, (min-width: 640px) 8rem, 6rem"
          className="object-cover transition-transform duration-500 ease-brand group-hover:scale-105"
        />
      ) : (
        <>
          <span className="absolute top-2.5 left-2.5 size-3 border-t border-l border-current opacity-30" />
          <span className="text-[34cqw] leading-none font-extrabold tracking-[-0.04em] transition-transform duration-500 ease-brand group-hover:-translate-y-1">
            {Array.from(projectName)[0]}
          </span>
        </>
      )}
    </div>
  );
}
