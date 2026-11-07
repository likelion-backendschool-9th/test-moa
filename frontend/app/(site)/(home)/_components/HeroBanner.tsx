import { Carousel, type CarouselSlide } from "@/components/ui/Carousel";
import { ProofMarks } from "@/app/(site)/(home)/_components/ProofMarks";
import type { Recruitment } from "@/features/recruitment/types";
import { HowItWorksSlide } from "./HowItWorksSlide";
import { MatGrid } from "./MatGrid";
import { ServiceIntroSlide } from "./ServiceIntroSlide";

/*
 * 배너 높이는 내용이 아니라 화면 폭으로 정한다: 768px 미만 30rem, 768px부터 20rem, 1024px부터 22rem.
 * 두 장 모두 기본 글자 크기에서 이 높이 안에 들어가게 짰다(320px 폭 포함). 사용자가 글자를 키웠을 때만
 * 글이 잘리지 않게 늘어나도록 height 대신 min-height로 건다 (WCAG 1.4.4).
 */
const frameClass = "relative h-full min-h-120 p-8 md:min-h-80 md:p-12 lg:min-h-88";

/* 라이트는 진한 초록 재단 매트, 다크는 기존 패널 위 격자. 색과 격자는 globals.css에서 정한다. */
const shellClass = "hero-banner relative overflow-hidden rounded-2xl";

/*
 * 홈 배너. 전체 폭으로 서비스 소개 → 진행 흐름 순서다. 라이트 바탕은 진한 초록 재단 매트다.
 * 이벤트·공지 슬라이드는 뺐다 (#60). 내용이 정해지면 슬라이드를 새로 만든다.
 */
export function HeroBanner({ recent }: { recent: Recruitment[] }) {
  const slides: CarouselSlide[] = [
    { key: "intro", content: <ServiceIntroSlide recent={recent} /> },
    { key: "how", content: <HowItWorksSlide /> },
  ];
  return (
    <div className={shellClass}>
      <MatGrid />
      <Carousel slides={slides} label="홈 배너" className={frameClass} data-testid="hero-banner" />
      <ProofMarks />
    </div>
  );
}

/** 최근 모집 글을 불러오는 동안 소개 슬라이드만 먼저 보여 준다 */
export function HeroBannerFallback() {
  return (
    <div className={shellClass}>
      <MatGrid />
      <section aria-label="홈 배너" data-testid="hero-banner-fallback" className={frameClass}>
        <ServiceIntroSlide />
      </section>
      <ProofMarks />
    </div>
  );
}
