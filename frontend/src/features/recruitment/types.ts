/** 테스트 대상 소프트웨어의 형태 (GLOSSARY: 소프트웨어 유형) */
export const SOFTWARE_TYPES = ["web", "mobile", "game", "api"] as const;
export type SoftwareType = (typeof SOFTWARE_TYPES)[number];

export const SOFTWARE_TYPE_LABEL: Record<SoftwareType, string> = {
  web: "웹서비스",
  mobile: "모바일앱",
  game: "게임",
  api: "API·라이브러리",
};

/** 테스트 모집 건. 한 프로젝트에서 조건·일정을 정해 테스터를 모집하는 단위 */
export type Recruitment = {
  slug: string;
  /** 테스트할 소프트웨어(프로젝트) 이름 */
  projectName: string;
  /** 프로젝트 대표 이미지. 목록 API에서 프로젝트 이미지 URL을 연결한다 */
  projectImage?: string;
  /** 프로젝트 한 줄 소개 */
  summary: string;
  /** 테스터에게 요청하는 내용 한 줄 */
  request: string;
  softwareType: SoftwareType;
  /** 구독 개발자의 모집 건이면 상단 순환 노출과 추가 보상 대상 */
  isSubscription: boolean;
  createdAt: string;
  recruitDeadline: string;
  submitDeadline: string;
  confirmedCount: number;
  /** 기본 보상 크레딧 */
  baseReward: number;
  /** 추가 보상 크레딧. 구독 모집 건에만 있다 */
  extraReward?: number;
};

/** 전체 테스트 그리드의 한 페이지 */
export type RecruitmentPage = {
  items: Recruitment[];
  /** 조건에 맞는 전체 개수 */
  total: number;
  /** 실제로 보여 주는 페이지. 요청한 페이지가 마지막보다 크면 마지막 페이지다 */
  page: number;
  pageCount: number;
};
