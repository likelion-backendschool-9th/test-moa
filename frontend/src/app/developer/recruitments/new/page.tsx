import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { recruitmentCreatePath } from "@/lib/project-paths";
import { Container } from "@/components/ui/Container";
import { DetailSkeleton } from "@/features/project/components/ProjectDetail";
import { RecruitmentForm } from "@/features/project/components/RecruitmentForm";
import { getRecruitmentFormInfo } from "@/features/project/service";

/* 테스트 모집 작성 (/developer/recruitments/new?project=:projectKey) */

export const metadata: Metadata = { title: "테스트 모집 작성" };

type Props = PageProps<"/developer/recruitments/new">;

export default function NewRecruitmentPage({ searchParams }: Props) {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <h1 className="text-4xl font-extrabold tracking-[-0.035em]">테스트 모집 작성</h1>
      <Suspense fallback={<DetailSkeleton />}>
        <FormSlot searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function FormSlot({ searchParams }: Pick<Props, "searchParams">) {
  const { project } = await searchParams;
  if (typeof project !== "string") notFound();
  const projectKey = project;
  const { project: projectInfo, ...info } = await getRecruitmentFormInfo(recruitmentCreatePath(projectKey), projectKey);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-text-muted">{projectInfo.name}</p>
      <RecruitmentForm projectKey={projectInfo.key} {...info} />
    </div>
  );
}
