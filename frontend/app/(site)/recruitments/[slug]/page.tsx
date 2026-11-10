import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container/Container";
import {
  PublicRecruitment,
  PublicRecruitmentSkeleton,
} from "@/app/(site)/recruitments/[slug]/_components/PublicRecruitment/PublicRecruitment";
import { getPublicRecruitment } from "@/features/recruitment/api";
import { getSession } from "@/features/session/session";
import styles from "./page.module.css";

/* 모집글 상세 (/recruitments/:slug). 누구나 볼 수 있다 */

export const metadata: Metadata = { title: "모집 상세" };

type Props = PageProps<"/recruitments/[slug]">;

export default function RecruitmentPage({ params }: Props) {
  return (
    <Container className={styles.recruitmentPage}>
      <Suspense fallback={<PublicRecruitmentSkeleton />}>
        <DetailSlot params={params} />
      </Suspense>
    </Container>
  );
}

/** 없거나 취소된 모집 건은 404 */
async function DetailSlot({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [post, session] = await Promise.all([getPublicRecruitment(slug), getSession()]);
  if (!post) notFound();
  /* 신고는 로그인한 회원만. 자기 모집 글은 백엔드가 막고 이유를 알린다 */
  return <PublicRecruitment post={post} canReport={session.role !== "guest"} />;
}
