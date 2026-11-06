import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PROJECTS_PATH, projectPath } from "@/lib/project-paths";
import { Container } from "@/components/ui/Container";
import { DetailSkeleton, ProjectInfo, ProjectRecruitmentList } from "@/app/(site)/developer/_components/ProjectDetail";
import { SavedNotice } from "@/app/(site)/developer/projects/_components/SavedNotice";
import { getMyProject } from "@/features/project/service";

/* 프로젝트 상세 (/developer/projects/:projectKey) */

export const metadata: Metadata = { title: "프로젝트 상세" };

type Props = PageProps<"/developer/projects/[projectKey]">;

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
    getMyProject(projectPath(projectKey), projectKey),
    searchParams,
  ]);
  return (
    <div className="flex flex-col gap-10">
      <Link href={PROJECTS_PATH} className="w-fit text-sm font-semibold text-text-muted hover:text-text">
        내 프로젝트로 돌아가기
      </Link>
      <SavedNotice show={notice === "saved"} />
      <ProjectInfo project={project} />
      <section aria-labelledby="recruitments-heading" className="flex flex-col gap-4">
        <h2 id="recruitments-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
          모집글 관리
        </h2>
        <ProjectRecruitmentList projectKey={project.key} recruitments={recruitments} />
      </section>
    </div>
  );
}
