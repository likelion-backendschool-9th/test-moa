import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { LinkButton } from "@/components/ui/LinkButton";
import type { Announcement } from "@/features/announcement/types";

/** 배너의 이벤트·공지 슬라이드 */
export function AnnouncementSlide({ announcement }: { announcement: Announcement }) {
  return (
    <div className="flex flex-col gap-5">
      <DisplayHeading className="md:text-4xl">{announcement.title}</DisplayHeading>
      <p className="max-w-xl text-lg text-text-muted">{announcement.summary}</p>
      <div className="flex flex-wrap items-center gap-3 pt-3">
        <LinkButton href={announcement.href} variant="secondary">
          자세히 보기
        </LinkButton>
        {announcement.isSample && <span className="text-sm font-semibold text-text-muted">시연용</span>}
      </div>
    </div>
  );
}
