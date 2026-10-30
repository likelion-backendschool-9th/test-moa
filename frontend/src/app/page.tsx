import { connection } from "next/server";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { getAnnouncements } from "@/features/announcement/api";
import { ClosingSoonPanel, ClosingSoonPanelSkeleton } from "@/features/home/components/ClosingSoonPanel";
import { HeroBanner, HeroBannerFallback } from "@/features/home/components/HeroBanner";
import { getClosingSoon, getSubscriptionRecruitments, searchRecruitments } from "@/features/recruitment/api";
import { AllRecruitments } from "@/features/recruitment/components/AllRecruitments";
import { RecruitmentGridSkeleton } from "@/features/recruitment/components/RecruitmentGrid";
import { SubscriptionSection } from "@/features/recruitment/components/SubscriptionSection";
import { parseRecruitmentQuery } from "@/features/recruitment/query";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Container className="flex flex-col gap-20 pt-8">
      <h1 className="sr-only">Test Moa 홈</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<HeroBannerFallback />}>
            <HeroSlot />
          </Suspense>
        </div>
        <Suspense fallback={<ClosingSoonPanelSkeleton />}>
          <ClosingSoonSlot />
        </Suspense>
      </div>

      <section aria-labelledby="subscription-heading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 id="subscription-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
            구독 모집
          </h2>
          <p className="text-sm text-text-muted">구독 개발자의 모집 글이에요. 기본 보상에 추가 보상이 붙어요.</p>
        </div>
        <Suspense fallback={<RecruitmentGridSkeleton count={3} columns="three" />}>
          <SubscriptionSlot />
        </Suspense>
      </section>

      <section id="all-tests" aria-labelledby="all-heading" className="flex scroll-mt-24 flex-col gap-6">
        <h2 id="all-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
          전체 테스트
        </h2>
        <Suspense fallback={<RecruitmentGridSkeleton count={10} />}>
          <AllRecruitmentsSlot searchParams={searchParams} />
        </Suspense>
      </section>
    </Container>
  );
}

async function HeroSlot() {
  return <HeroBanner announcements={await getAnnouncements()} />;
}

async function ClosingSoonSlot() {
  const recruitments = await getClosingSoon(5);
  await connection();
  return <ClosingSoonPanel recruitments={recruitments} now={new Date()} />;
}

async function SubscriptionSlot() {
  return <SubscriptionSection recruitments={await getSubscriptionRecruitments()} />;
}

async function AllRecruitmentsSlot({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const query = parseRecruitmentQuery(await searchParams);
  return <AllRecruitments query={query} recruitments={await searchRecruitments(query)} />;
}
