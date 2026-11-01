/** 채팅방에서의 역할. 개발자는 프로젝트 주인(채팅 요청자), 테스터는 선정된 테스터(채팅 응답자)다. 탭 순서이기도 하다 */
export const CHAT_ROLES = ["tester", "developer"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export const CHAT_ROLE_LABEL: Record<ChatRole, string> = {
  tester: "테스터",
  developer: "개발자",
};

/** 대화방 이름 변경에서 받는 최대 글자 수 */
export const CHAT_ROOM_NAME_MAX = 30;

/** 채팅방 하나. 구독 모집 건의 개발자와 선정된 테스터의 1대1 대화를 보는 사람 기준으로 정리했다 */
export type ChatRoom = {
  roomKey: string;
  /** 모집 건 slug */
  recruitmentSlug: string;
  projectName: string;
  /** 회원이 바꾼 대화방 이름. 없으면 프로젝트명을 이름으로 쓴다 */
  roomName?: string;
  /** 프로젝트 대표 이미지 주소. 없으면 프로젝트 이름 첫 글자 썸네일을 보여 준다 */
  projectImage?: string;
  /** 이 방에서 나의 역할. 내 프로젝트의 채팅이면 개발자, 테스터로 참여한 채팅이면 테스터 */
  myRole: ChatRole;
  /** 대화 상대 */
  partner: { nickname: string; role: ChatRole };
  lastMessage: string;
  lastMessageAt: string;
};

/** 역할 탭에 붙는 채팅방 수. 검색어를 적용한 뒤, 역할을 적용하기 전의 수다 */
export type ChatRoleCounts = Record<"all" | ChatRole, number>;

export type ChatInboxData = {
  /** 검색 조건을 적용한 채팅방 */
  rooms: ChatRoom[];
  /** 조건과 관계없이 내가 들어가 있는 채팅방 수 */
  total: number;
  counts: ChatRoleCounts;
  /** 일시 표시의 기준 시각 */
  now: string;
};
