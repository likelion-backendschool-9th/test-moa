import type { Metadata } from "next";
import { Suspense } from "react";
import { PROJECTS_PATH, PROJECT_NEW_PATH } from "@/features/project/paths";
import { Container } from "@/components/ui/Container";
import { DetailSkeleton } from "@/app/(site)/developer/_components/ProjectDetail";
import { ProjectForm } from "@/app/(site)/developer/_components/ProjectForm";
import { requireRole } from "@/features/project/service";

/* 프로젝트 등록 (/developer/projects/new) */

export const metadata: Metadata = { title: "프로젝트 등록" };

export default function NewProjectPage() {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <h1 className="text-4xl font-extrabold tracking-[-0.035em]">프로젝트 등록</h1>
      <Suspense fallback={<DetailSkeleton />}>
        <FormSlot />
      </Suspense>
    </Container>
  );
}

async function FormSlot() {
  await requireRole(PROJECT_NEW_PATH);
  return <ProjectForm projectKey={null} cancelHref={PROJECTS_PATH} />;
}
