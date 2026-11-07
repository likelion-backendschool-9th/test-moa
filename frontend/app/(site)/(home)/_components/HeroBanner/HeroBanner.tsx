import { Carousel, type CarouselSlide } from "@/components/ui/Carousel/Carousel";
import { ProofMarks } from "@/app/(site)/(home)/_components/ProofMarks/ProofMarks";
import type { Recruitment } from "@/features/recruitment/types";
import { HowItWorksSlide } from "../HowItWorksSlide/HowItWorksSlide";
import { MatGrid } from "../MatGrid/MatGrid";
import { ServiceIntroSlide } from "../ServiceIntroSlide/ServiceIntroSlide";
import styles from "./HeroBanner.module.css";

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
    <div className={styles.shell}>
      <MatGrid />
      <Carousel slides={slides} label="홈 배너" className={styles.frame} data-testid="hero-banner" />
      <ProofMarks />
    </div>
  );
}

/** 최근 모집 글을 불러오는 동안 소개 슬라이드만 먼저 보여 준다 */
export function HeroBannerFallback() {
  return (
    <div className={styles.shell}>
      <MatGrid />
      <section aria-label="홈 배너" data-testid="hero-banner-fallback" className={styles.frame}>
        <ServiceIntroSlide />
      </section>
      <ProofMarks />
    </div>
  );
}
