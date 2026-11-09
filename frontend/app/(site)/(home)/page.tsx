import { Suspense } from "react";
import { Container } from "@/components/ui/Container/Container";
import { HeroBanner, HeroBannerFallback } from "@/app/(site)/(home)/_components/HeroBanner/HeroBanner";
import { getLatestOpenRecruitments, getSubscriptionRecruitments, searchRecruitments } from "@/features/recruitment/api";
import { AllRecruitments } from "@/app/(site)/(home)/_components/AllRecruitments/AllRecruitments";
import { RecruitmentGridSkeleton } from "@/app/(site)/(home)/_components/RecruitmentGrid/RecruitmentGrid";
import { SubscriptionSection, SubscriptionSectionSkeleton } from "@/app/(site)/(home)/_components/SubscriptionSection/SubscriptionSection";
import { parseRecruitmentQuery } from "@/features/recruitment/query";
import styles from "./page.module.css";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Container className={styles.homePage}>
      <Suspense fallback={<HeroBannerFallback />}>
        <HeroSlot />
      </Suspense>

      <Suspense fallback={<SubscriptionSectionSkeleton />}>
        <SubscriptionSlot />
      </Suspense>

      <section id="all-tests" aria-labelledby="all-heading" className={styles.homePageSection}>
        {/* 홈의 핵심 목록이라 페이지 제목(h1)으로 쓴다. 다른 페이지도 핵심 목록 제목이 h1이다 */}
        <h1 id="all-heading" className={styles.homePageTitle}>
          전체 테스트
        </h1>
        <Suspense fallback={<RecruitmentGridSkeleton count={20} />}>
          <AllRecruitmentsSlot searchParams={searchParams} />
        </Suspense>
      </section>
    </Container>
  );
}

async function HeroSlot() {
  return <HeroBanner recent={await getLatestOpenRecruitments(3)} />;
}

async function SubscriptionSlot() {
  return <SubscriptionSection recruitments={await getSubscriptionRecruitments()} />;
}

async function AllRecruitmentsSlot({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const query = parseRecruitmentQuery(await searchParams);
  return <AllRecruitments query={query} result={await searchRecruitments(query)} />;
}
