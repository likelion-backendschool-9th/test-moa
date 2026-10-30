import type { Announcement } from "./types";

/*
 * 시연용 샘플. 실제 이벤트·공지가 아니며 금액이나 혜택을 약속하지 않는다.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    slug: "demo-week",
    kind: "event",
    title: "시연 기간 동안 새 모집 글이 매일 올라와요",
    summary: "팀 발표 시연을 위해 준비한 이벤트 자리예요. 진행 중인 이벤트는 이벤트 페이지에서 확인할 수 있어요.",
    href: "/events",
    isSample: true,
  },
  {
    slug: "feedback-guide",
    kind: "notice",
    title: "피드백 제출 기한과 미완료 처리 기준을 안내해요",
    summary: "제출 기한 안에 피드백을 내지 않으면 보상 없이 미완료로 처리돼요. 자세한 기준은 공지에서 확인해 주세요.",
    href: "/notices",
    isSample: true,
  },
];
