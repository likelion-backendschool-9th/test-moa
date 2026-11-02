import Image from "next/image";
import { cn } from "@/lib/cn";

type ChatThumbSize = "card" | "header";

/* card: 카드 왼쪽에서 높이를 다 채우는 칸. header: 채팅방 머리의 작은 4:3 이미지 */
const SIZE_CLASS: Record<ChatThumbSize, string> = {
  card: "w-24 self-stretch rounded-l-2xl sm:w-32 md:w-40",
  header: "h-12 w-16 rounded-xl",
};

const IMAGE_SIZES: Record<ChatThumbSize, string> = {
  card: "(min-width: 768px) 10rem, (min-width: 640px) 8rem, 6rem",
  header: "4rem",
};

/**
 * 채팅 카드 왼쪽과 채팅방 머리의 프로젝트 이미지 자리. 카드에서는 카드 높이를 다 채우고, 선이나 그라데이션 없이 바로 옆에 채팅방 정보가 온다.
 * 이미지가 있으면 면을 꽉 채우고(카드 hover 때 살짝 확대), 없으면 모집 카드의 활자 썸네일(RecruitmentThumb)과 같은 면·재단선 위에
 * 프로젝트 이름 첫 글자를 크게 앉힌다. 이름은 바로 옆 제목에 있으니 이미지는 장식으로 두고 보조 기술에는 숨긴다.
 */
export function ChatThumb({
  projectName,
  imageUrl,
  size = "card",
  eager = false,
}: {
  projectName: string;
  imageUrl?: string;
  size?: ChatThumbSize;
  /** 화면을 열자마자 보이는 가장 큰 이미지(목록 첫 카드)면 바로 불러온다 */
  eager?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-thumb
      className={cn(
        "@container relative grid shrink-0 place-items-center overflow-hidden bg-thumb text-on-thumb",
        SIZE_CLASS[size],
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES[size]}
          loading={eager ? "eager" : undefined}
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
