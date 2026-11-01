import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { DetailSkeleton, ProjectInfo, ProjectRecruitmentList } from "@/features/project/components/ProjectDetail";
import { SavedNotice } from "@/features/project/components/SavedNotice";
import { getMyProject } from "@/features/project/service";

/* 프로젝트 상세 (/my/projects/:projectKey) */

export const metadata: Metadata = { title: "프로젝트 상세" };

type Props = PageProps<"/my/projects/[projectKey]">;

export default function ProjectPage({ params, searchParams }: Props) {
  return (
    <Container className="py-10">
      <Suspense fallback={<DetailSkeleton />}>
        <ProjectSlot params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ProjectSlot({ params, searchParams }: Props) {
  const { projectKey } = await params;
  const [{ project, recruitments }, { notice }] = await Promise.all([
    getMyProject(`/my/projects/${projectKey}`, projectKey),
    searchParams,
  ]);
  return (
    <div className="flex flex-col gap-10">
      <SavedNotice show={notice === "saved"} />
      <ProjectInfo project={project} />
      <section aria-labelledby="recruitments-heading" className="flex flex-col gap-4">
        <h2 id="recruitments-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
          테스트 모집
        </h2>
        <ProjectRecruitmentList projectKey={project.key} recruitments={recruitments} />
      </section>
    </div>
  );
}
