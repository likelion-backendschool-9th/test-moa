import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon } from "@/app/_components/ComingSoon/ComingSoon";
import { ApplyPanel, ApplyPanelSkeleton } from "@/app/(site)/recruitments/[slug]/apply/_components/ApplyPanel/ApplyPanel";
import { Container } from "@/components/ui/Container/Container";
import { getPublicRecruitment } from "@/features/recruitment/api";
import { requireMember } from "@/features/session/guard";
import { isBackendAuth } from "@/lib/backend";
import styles from "./page.module.css";

/* 테스트 지원 (/recruitments/:slug/apply). 목업에는 지원 저장소가 없어 준비 중으로 둔다 */

export const metadata: Metadata = { title: "테스트 지원" };

type Props = PageProps<"/recruitments/[slug]/apply">;

export default function ApplyPage({ params }: Props) {
  if (!isBackendAuth) return <ComingSoon pageName="테스트 지원" />;
  return (
    <Container className={styles.applyPage}>
      <Suspense fallback={<ApplyPanelSkeleton />}>
        <ApplySlot params={params} />
      </Suspense>
    </Container>
  );
}

/** 비로그인은 로그인으로 보낸다. 없거나 취소된 모집 건은 404 */
async function ApplySlot({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  await requireMember(`/recruitments/${slug}/apply`);
  const post = await getPublicRecruitment(slug);
  if (!post) notFound();
  return <ApplyPanel post={post} />;
}
