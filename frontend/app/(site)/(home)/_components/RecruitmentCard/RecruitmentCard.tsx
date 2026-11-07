import Link from "next/link";
import Image from "next/image";
import { ImageSquareIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge/Badge";
import { formatDate } from "@/lib/format";
import { SOFTWARE_TYPE_LABEL, type Recruitment } from "@/features/recruitment/types";
import styles from "./RecruitmentCard.module.css";

/**
 * 모집 카드. 프로젝트명을 본문 제목으로 표시하고, 보상은 추가 보상 배지만 보여 준다.
 * 날짜에는 짧은 마감 라벨을 표시한다.
 * relative는 절대 배치되는 sr-only 라벨도 카드 안에 묶어 가로 스크롤 밖으로 빠지지 않게 한다.
 */
export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  return (
    <Link
      href={`/recruitments/${recruitment.slug}`}
      data-testid="recruitment-card"
      className={styles.root}
    >
      <div data-thumb className={styles.thumb}>
        {recruitment.projectImage ? (
          <Image
            src={recruitment.projectImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 75vw"
            className={styles.image}
          />
        ) : (
          <div aria-hidden className={styles.box}>
            <ImageSquareIcon size={32} weight="light" />
          </div>
        )}
        <div className={styles.box2}>
          <Badge tone="outline" className={styles.badge}>{SOFTWARE_TYPE_LABEL[recruitment.softwareType]}</Badge>
          {recruitment.extraReward !== undefined && (
            <Badge tone="accentSolid">추가 보상</Badge>
          )}
        </div>
      </div>
      <div className={styles.box3}>
        <h3 className={styles.projectName}>{recruitment.projectName}</h3>
        <p className={styles.request}>{recruitment.request}</p>
        <dl className={styles.list}>
          <div className={styles.box4}>
            <dt>마감</dt>
            <dd className={styles.value}>{formatDate(recruitment.recruitDeadline)}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
