import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PublicRecruitment, PublicRecruitmentSkeleton } from "@/features/project/components/PublicRecruitment";
import { getPublicRecruitment } from "@/features/project/service";

/* 모집글 상세 (/recruitments/:slug). 누구나 볼 수 있다 */

export const metadata: Metadata = { title: "모집 상세" };

type Props = PageProps<"/recruitments/[slug]">;

export default function RecruitmentPage({ params }: Props) {
  return (
    <Container className="pt-8">
      <Suspense fallback={<PublicRecruitmentSkeleton />}>
        <DetailSlot params={params} />
      </Suspense>
    </Container>
  );
}

/** 없거나 취소된 모집 건은 404 */
async function DetailSlot({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const post = await getPublicRecruitment(slug);
  if (!post) notFound();
  return <PublicRecruitment post={post} />;
}
