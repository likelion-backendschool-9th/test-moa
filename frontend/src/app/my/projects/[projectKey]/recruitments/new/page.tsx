import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { DetailSkeleton } from "@/features/project/components/ProjectDetail";
import { RecruitmentForm } from "@/features/project/components/RecruitmentForm";
import { getRecruitmentFormInfo } from "@/features/project/service";

/* 테스트 모집 작성 (/my/projects/:projectKey/recruitments/new) */

export const metadata: Metadata = { title: "테스트 모집 작성" };

type Props = PageProps<"/my/projects/[projectKey]/recruitments/new">;

export default function NewRecruitmentPage({ params }: Props) {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <h1 className="text-4xl font-extrabold tracking-[-0.035em]">테스트 모집 작성</h1>
      <Suspense fallback={<DetailSkeleton />}>
        <FormSlot params={params} />
      </Suspense>
    </Container>
  );
}

async function FormSlot({ params }: Pick<Props, "params">) {
  const { projectKey } = await params;
  const { project, ...info } = await getRecruitmentFormInfo(`/my/projects/${projectKey}/recruitments/new`, projectKey);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-text-muted">{project.name}</p>
      <RecruitmentForm projectKey={project.key} {...info} />
    </div>
  );
}
