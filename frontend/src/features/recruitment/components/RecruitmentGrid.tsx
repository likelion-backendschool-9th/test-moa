import { Skeleton } from "@/components/ui/Skeleton";
import type { Recruitment } from "../types";
import { RecruitmentCard } from "./RecruitmentCard";

const COLUMNS = {
  /* 한 페이지 20개가 2열·5열 모두 빈칸 없이 떨어진다 */
  five: "grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-5",
  /* 작은 화면은 가로로 넘기는 띠, 넓은 화면은 3열 */
  three:
    "flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-y-8 md:overflow-visible md:pb-0 md:[&_[data-thumb]]:aspect-[2/1] [&>li]:w-[72%] [&>li]:shrink-0 [&>li]:snap-start md:[&>li]:w-auto",
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
        <li key={index} data-skeleton="card" className="flex flex-col gap-3">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
