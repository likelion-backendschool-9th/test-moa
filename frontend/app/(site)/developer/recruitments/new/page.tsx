import { isBackendAuth } from "@/lib/backend";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { recruitmentCreatePath } from "@/features/project/paths";
import { Container } from "@/components/ui/Container/Container";
import { DetailSkeleton } from "@/app/(site)/developer/_components/ProjectDetail/ProjectDetail";
import { RecruitmentForm } from "@/app/(site)/developer/recruitments/new/_components/RecruitmentForm/RecruitmentForm";
import { getRecruitmentFormInfo } from "@/features/recruitment/api";
import styles from "./page.module.css";

/* 테스트 모집 작성 (/developer/recruitments/new?project=:projectKey) */

export const metadata: Metadata = { title: "테스트 모집 작성" };

type Props = PageProps<"/developer/recruitments/new">;

export default function NewRecruitmentPage({ searchParams }: Props) {
  return (
    <Container className={styles.newRecruitmentPage}>
      <h1 className={styles.newRecruitmentPageTitle}>테스트 모집 작성</h1>
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
    <div className={styles.formSlot}>
      <p className={styles.formSlotName}>{projectInfo.name}</p>
      <RecruitmentForm uploadEnabled={isBackendAuth} projectKey={projectInfo.key} {...info} />
    </div>
  );
}
