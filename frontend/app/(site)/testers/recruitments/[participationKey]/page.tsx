import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { participationPath } from "@/lib/participation-paths";
import { Container } from "@/components/ui/Container";
import { getParticipation } from "@/features/participation/api";
import {
  ParticipationDetail,
  ParticipationDetailSkeleton,
} from "@/app/(site)/testers/recruitments/[participationKey]/_components/ParticipationDetail";
import { requireMember } from "@/lib/auth";

/* 내 참여 상세 (/testers/recruitments/:participationKey) */

export const metadata: Metadata = { title: "내 참여 상세" };

type Props = PageProps<"/testers/recruitments/[participationKey]">;

export default function ParticipationPage({ params, searchParams }: Props) {
  return (
    <Container className="pt-8">
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
  await connection();
  return <ParticipationDetail item={item} now={new Date()} justSubmitted={notice === "submitted"} />;
}
