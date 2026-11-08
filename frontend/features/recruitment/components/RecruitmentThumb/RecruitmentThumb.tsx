import type { ReactNode } from "react";
import Image from "next/image";
import { ImageSquareIcon } from "@phosphor-icons/react/ssr";
import type { Recruitment } from "@/features/recruitment/types";
import { ProofStamp } from "@/features/recruitment/components/ProofStamp/ProofStamp";
import { cn } from "@/lib/cn";
import styles from "./RecruitmentThumb.module.css";

/**
 * 활자 썸네일. 가짜 스크린샷 대신 교정지 위에 서비스 이름을 크게 앉혀 이름 자체를 그림으로 쓴다.
 * stamp가 있으면 오른쪽 위에 교정 도장을 찍는다 (참여 내역의 '지급 완료').
 * category가 있으면 왼쪽 위에 테두리만 있는 연한 유형 배지를 붙인다 (홈 카드). 배지와 이름은 같은 안쪽 여백(12px, 640px 이상 16px)에 맞춘다.
 * badge가 있으면 왼쪽 위에 얹는다(참여 내역의 '추가 보상', 홈 카드와 같은 자리). 도장은 오른쪽 위라 겹치지 않아서 badge가 있어도 자리와 크기가 같다(#138).
 */
export function RecruitmentThumb({
  recruitment,
  stamp,
  category,
  badge,
  inset = false,
  showImage = false,
}: {
  recruitment: Recruitment;
  stamp?: string;
  category?: string;
  badge?: ReactNode;
  /** 카드 안에 들어갈 때. 카드가 외곽선을 가지므로 썸네일 자신의 외곽선을 빼고 모서리를 한 단계 줄인다 */
  inset?: boolean;
  /** 홈 배너용 이미지 모드. 기본 이미지 자산은 후속 PR에서 연결한다 */
  showImage?: boolean;
}) {
  const imageUrl = showImage ? recruitment.projectImage : undefined;
  return (
    <div
      data-thumb
      className={cn(styles.root, inset ? styles.inset : styles.framed)}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="(min-width: 1024px) 25vw, 75vw" className={styles.image} />
      ) : showImage ? (
        <div aria-hidden className={styles.box}>
          <ImageSquareIcon size={32} weight="light" />
        </div>
      ) : (
        <h3 className={styles.projectName}>{recruitment.projectName}</h3>
      )}
      {showImage && (
        <h3 className={styles.projectName2}>
          {recruitment.projectName}
        </h3>
      )}
      {category && (
        <span className={styles.category}>
          {category}
        </span>
      )}
      {stamp && <ProofStamp label={stamp} placement="corner" />}
      {badge && <div className={styles.badge}>{badge}</div>}
    </div>
  );
}
