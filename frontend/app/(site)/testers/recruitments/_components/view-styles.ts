import type { ParticipationView } from "../../../../../features/participation/types";

/** 목록과 스켈레톤이 같은 배치로 자리를 잡는다. 그리드는 좁은 화면에서 1열, md 2열, lg 이상 3열이다 */
export const VIEW_LIST_CLASS: Record<ParticipationView, string> = {
  list: "flex flex-col gap-4",
  grid: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
};
