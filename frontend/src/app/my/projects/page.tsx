import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/LinkButton";
import { ProjectList, ProjectListSkeleton } from "@/features/project/components/ProjectList";
import { SavedNotice } from "@/features/project/components/SavedNotice";
import { getMyProjects } from "@/features/project/service";

/* 내 프로젝트 목록 (/my/projects) */

export const metadata: Metadata = { title: "내 프로젝트" };

export default function MyProjectsPage({ searchParams }: PageProps<"/my/projects">) {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em]">내 프로젝트</h1>
        <LinkButton href="/my/projects/new">프로젝트 등록</LinkButton>
      </div>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectsSlot searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ProjectsSlot({ searchParams }: Pick<PageProps<"/my/projects">, "searchParams">) {
  const [projects, { notice }] = await Promise.all([getMyProjects("/my/projects"), searchParams]);
  return (
    <div className="flex flex-col gap-6">
      <SavedNotice show={notice === "saved"} />
      <ProjectList projects={projects} />
    </div>
  );
}
