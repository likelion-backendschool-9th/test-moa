/** 홈 배너에 순환 노출하는 운영 소식 */
export type AnnouncementKind = "event" | "notice";

export const ANNOUNCEMENT_KIND_LABEL: Record<AnnouncementKind, string> = {
  event: "이벤트",
  notice: "공지",
};

export type Announcement = {
  slug: string;
  kind: AnnouncementKind;
  title: string;
  summary: string;
  href: string;
  /** 시연용 샘플이면 화면에 그렇게 표시한다 */
  isSample: boolean;
};
