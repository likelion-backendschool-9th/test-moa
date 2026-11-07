import type { Metadata } from "next";
import { Suspense } from "react";
import { projectPath, projectEditPath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { DetailSkeleton } from "@/app/(site)/developer/_components/ProjectDetail/ProjectDetail";
import { ProjectForm } from "@/app/(site)/developer/_components/ProjectForm/ProjectForm";
import { getMyProject } from "@/features/recruitment/api";

/* 프로젝트 수정 (/developer/projects/:projectKey/edit). 등록과 같은 폼에 값을 채워 둔다 */

export const metadata: Metadata = { title: "프로젝트 수정" };

type Props = PageProps<"/developer/projects/[projectKey]/edit">;

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
  const { project } = await getMyProject(projectEditPath(projectKey), projectKey);
  const { name, description } = project;
  return (
    <ProjectForm
      projectKey={project.key}
      initialValues={{ name, description }}
      initialImage={project.image}
      cancelHref={projectPath(project.key)}
    />
  );
}
