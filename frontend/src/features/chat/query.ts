/** 채팅함의 검색 조건. URL 검색 파라미터와 1:1로 대응한다 */
export type ChatSort = "latest" | "oldest";

export type ChatQuery = {
  /** 채팅방 검색어. 프로젝트명과 요청자·응답자 닉네임에서 찾는다 */
  q: string;
  /** 프로젝트별 보기. 모집 건 slug */
  project: string | null;
  sort: ChatSort;
};

export const CHAT_SORT_LABEL: Record<ChatSort, string> = {
  latest: "최신순",
  oldest: "오래된순",
};

export const CHATS_PATH = "/my/chats";

const SORTS = Object.keys(CHAT_SORT_LABEL) as ChatSort[];

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseChatQuery(params: Params): ChatQuery {
  const sort = first(params.sort);
  return {
    q: (first(params.q) ?? "").trim(),
    project: first(params.project) || null,
    sort: SORTS.find((value) => value === sort) ?? "latest",
  };
}

/** 기본값은 URL에 남기지 않는다 */
export function toChatsHref(query: ChatQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.project) params.set("project", query.project);
  if (query.sort !== "latest") params.set("sort", query.sort);
  return params.size ? `${CHATS_PATH}?${params}` : CHATS_PATH;
}
