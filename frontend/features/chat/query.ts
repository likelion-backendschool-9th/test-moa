import { CHAT_ROLES, type ChatRole } from "@/features/chat/types";

/** 채팅함의 검색 조건. URL 검색 파라미터와 1:1로 대응한다 */
export type ChatSort = "latest" | "oldest";

export type ChatQuery = {
  /** 채팅방 검색어. 프로젝트명과 대화 상대 닉네임에서 찾는다 */
  q: string;
  /** 역할별 보기. 내 프로젝트의 채팅(개발자) 또는 테스터로 참여한 채팅(테스터). 전체면 null */
  role: ChatRole | null;
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
  const role = first(params.role);
  const sort = first(params.sort);
  return {
    q: (first(params.q) ?? "").trim(),
    role: CHAT_ROLES.find((value) => value === role) ?? null,
    sort: SORTS.find((value) => value === sort) ?? "latest",
  };
}

/** 기본값은 URL에 남기지 않는다 */
export function toChatsHref(query: ChatQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.sort !== "latest") params.set("sort", query.sort);
  return params.size ? `${CHATS_PATH}?${params}` : CHATS_PATH;
}
