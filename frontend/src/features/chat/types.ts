/** 채팅방 하나. 구독 모집 건의 개발자(요청자)와 선정된 테스터(응답자)의 1대1 대화 */
export type ChatRoom = {
  roomKey: string;
  /** 모집 건 slug. 프로젝트별 보기와 모집 글 링크에 쓴다 */
  recruitmentSlug: string;
  projectName: string;
  /** 채팅 요청자. 프로젝트 주인(개발자)의 닉네임 */
  requester: string;
  /** 채팅 응답자. 선정된 테스터의 닉네임 */
  responder: string;
  lastMessage: string;
  lastMessageAt: string;
};

/** 프로젝트별 드롭다운의 항목 하나 */
export type ChatProjectOption = {
  slug: string;
  name: string;
  count: number;
};

export type ChatInboxData = {
  /** 검색 조건을 적용한 채팅방 */
  rooms: ChatRoom[];
  /** 조건과 관계없이 내가 들어가 있는 채팅방 수 */
  total: number;
  projects: ChatProjectOption[];
  /** 일시 표시의 기준 시각 */
  now: string;
};
