import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { Recruitment } from "@/features/recruitment/types";
import { RecruitmentCard } from "../RecruitmentCard/RecruitmentCard";
import styles from "./RecruitmentGrid.module.css";

const COLUMNS = {
  /* 한 페이지 20개가 2열·4열 모두 빈칸 없이 떨어진다. 375px 미만은 1열 */
  five: styles.gridFive,
  /* 작은 화면은 가로로 넘기는 띠, 넓은 화면은 3열 */
  three:
    styles.gridThree,
};

type Columns = keyof typeof COLUMNS;

const gridClass = (columns: Columns) => COLUMNS[columns];

export function RecruitmentGrid({ recruitments, columns = "five" }: { recruitments: Recruitment[]; columns?: Columns }) {
  return (
    <ul className={gridClass(columns)}>
      {recruitments.map((recruitment) => (
        <li key={recruitment.slug}>
          <RecruitmentCard recruitment={recruitment} />
        </li>
      ))}
    </ul>
  );
}

export function RecruitmentGridSkeleton({ count = 5, columns = "five" }: { count?: number; columns?: Columns }) {
  return (
    <ul aria-busy="true" aria-label="모집 글 불러오는 중" className={gridClass(columns)}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} data-skeleton="card" className={styles.recruitmentGridSkeleton}>
          <Skeleton className={styles.recruitmentGridSkeletonSkeleton} />
          <Skeleton className={styles.recruitmentGridSkeletonSkeleton2} />
          <Skeleton className={styles.recruitmentGridSkeletonSkeleton3} />
          <Skeleton className={styles.recruitmentGridSkeletonSkeleton4} />
          <Skeleton className={styles.recruitmentGridSkeletonSkeleton5} />
        </li>
      ))}
    </ul>
  );
}
