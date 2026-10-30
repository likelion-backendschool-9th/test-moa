import { SOFTWARE_TYPES, type SoftwareType } from "./types";

/** 전체 테스트 그리드의 검색 조건. URL 검색 파라미터와 1:1로 대응한다 */
export type RecruitmentSort = "latest" | "deadline" | "reward";

export type RecruitmentQuery = {
  q: string;
  type: SoftwareType | null;
  open: boolean;
  sort: RecruitmentSort;
};

export const SORT_LABEL: Record<RecruitmentSort, string> = {
  latest: "최신순",
  deadline: "마감 임박순",
  reward: "보상 많은순",
};

const SORTS = Object.keys(SORT_LABEL) as RecruitmentSort[];

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRecruitmentQuery(params: Params): RecruitmentQuery {
  const type = first(params.type);
  const sort = first(params.sort);
  return {
    q: (first(params.q) ?? "").trim(),
    type: SOFTWARE_TYPES.find((value) => value === type) ?? null,
    open: first(params.open) === "1",
    sort: SORTS.find((value) => value === sort) ?? "latest",
  };
}

/** 기본값은 URL에 남기지 않는다 */
export function toSearchParams(query: RecruitmentQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (query.open) params.set("open", "1");
  if (query.sort !== "latest") params.set("sort", query.sort);
  return params;
}
