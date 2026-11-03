import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { DetailSkeleton } from "@/features/project/components/ProjectDetail";
import { ProjectForm } from "@/features/project/components/ProjectForm";
import { getMyProject } from "@/features/project/service";

/* 프로젝트 수정 (/my/projects/:projectKey/edit). 등록과 같은 폼에 값을 채워 둔다 */

export const metadata: Metadata = { title: "프로젝트 수정" };

type Props = PageProps<"/my/projects/[projectKey]/edit">;

export default function EditProjectPage({ params }: Props) {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <h1 className="text-4xl font-extrabold tracking-[-0.035em]">프로젝트 수정</h1>
      <Suspense fallback={<DetailSkeleton />}>
        <FormSlot params={params} />
      </Suspense>
    </Container>
  );
}

async function FormSlot({ params }: Pick<Props, "params">) {
  const { projectKey } = await params;
  const { project } = await getMyProject(`/my/projects/${projectKey}/edit`, projectKey);
  const { name, summary, softwareType, accessUrl, description } = project;
  return (
    <ProjectForm
      projectKey={project.key}
      initialValues={{ name, summary, softwareType, accessUrl, description }}
      initialImages={project.images}
      initialLinks={project.links}
      initialAttachments={project.attachments}
      cancelHref={`/my/projects/${project.key}`}
    />
  );
}
