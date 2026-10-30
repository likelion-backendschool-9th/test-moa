import { Carousel, type CarouselSlide } from "@/components/ui/Carousel";
import { ProofMarks } from "@/components/ui/ProofMarks";
import { ANNOUNCEMENT_KIND_LABEL, type Announcement } from "@/features/announcement/types";
import { AnnouncementSlide } from "./AnnouncementSlide";
import { ServiceIntroSlide } from "./ServiceIntroSlide";

const frameClass = "relative h-full min-h-80 overflow-hidden rounded-2xl bg-surface-muted p-8 md:p-12";

/** 홈 배너. 서비스 소개가 먼저 나오고 진행 중인 이벤트와 공지가 뒤따른다 */
export function HeroBanner({ announcements }: { announcements: Announcement[] }) {
  const slides: CarouselSlide[] = [
    { key: "intro", label: "소개", content: <ServiceIntroSlide /> },
    ...announcements.map((announcement) => ({
      key: announcement.slug,
      label: ANNOUNCEMENT_KIND_LABEL[announcement.kind],
      content: <AnnouncementSlide announcement={announcement} />,
    })),
  ];

  return (
    <div className="relative h-full">
      <Carousel slides={slides} label="홈 배너" className={frameClass} data-testid="hero-banner" />
      <ProofMarks />
    </div>
  );
}

/** 소식을 불러오는 동안 소개 슬라이드만 먼저 보여 준다 */
export function HeroBannerFallback() {
  return (
    <div className="relative h-full">
      <section aria-label="홈 배너" data-testid="hero-banner-fallback" className={frameClass}>
        <ServiceIntroSlide />
      </section>
      <ProofMarks />
    </div>
  );
}
