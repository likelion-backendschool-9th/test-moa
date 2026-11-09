import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { participationPath } from "@/features/participation/paths";
import { Container } from "@/components/ui/Container/Container";
import { getParticipation } from "@/features/participation/api";
import { findPublicRecruitment } from "@/features/recruitment/api";
import {
  ParticipationDetail,
  ParticipationDetailSkeleton,
} from "@/app/(site)/testers/recruitments/[participationKey]/_components/ParticipationDetail/ParticipationDetail";
import { requireMember } from "@/features/session/guard";
import styles from "./page.module.css";

/* 내 참여 상세 (/testers/recruitments/:participationKey) */

export const metadata: Metadata = { title: "내 참여 상세" };

type Props = PageProps<"/testers/recruitments/[participationKey]">;

export default function ParticipationPage({ params, searchParams }: Props) {
  return (
    <Container className={styles.participationPage}>
      <Suspense fallback={<ParticipationDetailSkeleton />}>
        <DetailSlot params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

/** 비로그인은 로그인으로 보내고, 없거나 내 참여가 아니면 404 */
async function DetailSlot({ params, searchParams }: Props) {
  const [{ participationKey }, { notice }] = await Promise.all([params, searchParams]);
  await requireMember(participationPath(participationKey));
  const item = await getParticipation(participationKey);
  if (!item) notFound();
  /* 모집 조건과 선정 방식은 참여 API에 없어 공개 모집글에서 읽는다. 취소됐거나 읽지 못하면 그 칸을 숨긴다 */
  const post = item.recruitmentCancelled ? null : await findPublicRecruitment(item.recruitment.slug);
  const conditions = post?.detail ? post.detail.conditions.split("\n").map((line) => line.trim()).filter(Boolean) : null;
  await connection();
  return (
    <ParticipationDetail
      item={item}
      now={new Date()}
      justSubmitted={notice === "submitted"}
      conditions={conditions}
      selectionMode={post?.detail?.selectionMode}
    />
  );
}
