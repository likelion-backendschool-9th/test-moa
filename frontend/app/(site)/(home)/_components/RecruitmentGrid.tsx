import { Skeleton } from "@/components/ui/Skeleton";
import type { Recruitment } from "../../../../features/recruitment/types";
import { RecruitmentCard } from "./RecruitmentCard";

const COLUMNS = {
  /* 한 페이지 20개가 2열·4열 모두 빈칸 없이 떨어진다. 375px 미만은 1열 */
  five: "grid grid-cols-2 gap-x-4 gap-y-4 max-[23.4rem]:grid-cols-1 lg:grid-cols-4",
  /* 작은 화면은 가로로 넘기는 띠, 넓은 화면은 3열 */
  three:
    "flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-y-4 md:overflow-visible md:pb-0 [&>li]:w-[72%] [&>li]:shrink-0 [&>li]:snap-start md:[&>li]:w-auto",
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
        <li key={index} data-skeleton="card" className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface-card pb-4 inset-ring inset-ring-line">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <Skeleton className="mx-2 mt-2 h-5 w-1/3" />
          <Skeleton className="mx-2 h-6 w-2/3" />
          <Skeleton className="mx-2 h-10 w-3/4" />
          <Skeleton className="mx-2 h-4 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
