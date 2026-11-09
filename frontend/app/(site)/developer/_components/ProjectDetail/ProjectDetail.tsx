import { ArrowUpRightIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { projectEditPath, recruitmentCreatePath, recruitmentManagePath } from "@/features/project/paths";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatDate, formatShortDate } from "@/lib/format";
import type { ProjectRecruitmentRow } from "@/features/recruitment/types";
import { DEFAULT_PROJECT_IMAGE_URL, type Project } from "@/features/project/types";
import { ProjectDescription } from "@/features/project/components/ProjectDescription/ProjectDescription";
import { RecruitmentStatusBadge } from "@/features/recruitment/components/RecruitmentStatusBadge/RecruitmentStatusBadge";
import { Card } from "@/components/ui/Card/Card";
import styles from "./ProjectDetail.module.css";

/* 프로젝트 상세 화면: 프로젝트 정보와 모집 건 목록 */

export type ProjectBodyData = Pick<Project, "name" | "description" | "image">;

/** 새 탭으로 여는 링크. 화면 읽기 프로그램에 새 탭임을 알린다 */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
      {children}
      <span className={styles.externalLinkSrOnly}> (새 탭)</span>
    </a>
  );
}

/**
 * 프로젝트 내용(이름, 설명, 이미지). 상세 화면과 등록 폼 미리보기가 같이 써서 보이는 모습이 같다.
 * 미리보기는 페이지 제목이 따로 있어서 이름을 h3로 내린다.
 */
export function ProjectBody({
  project,
  titleAs: Title = "h1",
  children,
}: {
  project: ProjectBodyData;
  titleAs?: "h1" | "h3";
  children?: ReactNode;
}) {
  return (
    <div data-project-body className={styles.projectBody}>
      {/*
        좁은 화면과 미리보기는 이름·설명 → 이미지 → 버튼 순서로 쌓고,
        넓은 상세 화면은 왼쪽에 이름·설명과 버튼, 오른쪽에 이미지를 나란히 둔다. 이미지는 이름과 같은 높이에서 시작한다.
        글이 이미지보다 짧아도 버튼이 글 바로 아래에 오도록 마지막 줄이 남는 높이를 받는다.
      */}
      <div
        className={styles.projectBodyBox}
      >
        <div className={styles.projectBodyBox2}>
          <Title className={Title === "h1" ? styles.projectBodyTitleH1 : styles.projectBodyTitleNotH1}>
            {project.name || "프로젝트 이름"}
          </Title>
        </div>
        {project.description && (
          <div className={styles.projectBodyBox3}>
            <ProjectDescription text={project.description} />
          </div>
        )}
        <div className={styles.projectBodyBox4}>
          {/* 등록 중인 이미지는 브라우저 안의 임시 주소(blob:)라 next/image를 쓸 수 없다 */}
          {/* 이미지마다 비율이 달라도 잘리지 않게 칸 안에 맞춘다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.image?.url ?? DEFAULT_PROJECT_IMAGE_URL}
            alt={project.image ? `${project.name || "프로젝트"} 대표 이미지` : "기본 프로젝트 이미지"}
            className={styles.projectBodyImage}
          />
        </div>
        {children && <div className={styles.projectBodyChildren}>{children}</div>}
      </div>
    </div>
  );
}

/** 프로젝트 정보와 수정·모집글 작성 버튼 */
export function ProjectInfo({ project }: { project: Project }) {
  return (
    <ProjectBody project={project}>
      <div className={styles.projectInfoBox}>
        <LinkButton href={recruitmentCreatePath(project.key)}>
          <PlusIcon aria-hidden size={16} weight="bold" />
          모집글 작성
        </LinkButton>
        <LinkButton href={projectEditPath(project.key)} variant="secondary">
          수정
        </LinkButton>
      </div>
    </ProjectBody>
  );
}

/**
 * 프로젝트의 모집 건 목록. 넓은 화면은 한 줄을 [배지·제목 | 숫자·분석 기록 | 버튼] 세 칸으로, 좁은 화면은 위아래로 쌓는다.
 * 제목을 누르면 관리 화면으로 간다
 */
export function ProjectRecruitmentList({ projectKey, recruitments }: { projectKey: string; recruitments: ProjectRecruitmentRow[] }) {
  if (recruitments.length === 0) {
    return (
      <EmptyState
        title="아직 테스트 모집이 없어요"
        description="모집 조건과 일정을 정해 테스터를 모아 보세요."
        action={<LinkButton href={recruitmentCreatePath(projectKey)}>모집글 작성</LinkButton>}
      />
    );
  }
  return (
    <ul className={styles.recruitmentList}>
      {recruitments.map((item) => {
        const title = item.title || item.request;
        const managePath = recruitmentManagePath(item.slug);
        const cancelled = item.status === "cancelled";
        return (
          <Card as="li" key={item.slug} className={styles.recruitmentRow}>
            <div className={styles.recruitmentHead}>
              <div className={styles.recruitmentBadges}>
                <Badge tone="muted">v{item.version}</Badge>
                <RecruitmentStatusBadge status={item.status} />
                {item.isSubscription && <Badge tone="muted">구독 모집</Badge>}
              </div>
              <Link href={managePath} className={styles.recruitmentTitle}>
                {title}
              </Link>
            </div>
            <div className={styles.recruitmentMeta}>
              <p>
                확정 {item.confirmedCount}명 · 피드백 {item.feedbackCount}건 · 제출 마감 {formatDate(item.submitDeadline)}
              </p>
              {!cancelled && (
                <p className={styles.recruitmentAnalysis}>
                  {item.analyzedAt ? `분석 기록 있음 | ${formatShortDate(item.analyzedAt)} 기준` : "분석 기록 없음"}
                </p>
              )}
            </div>
            {/* 취소된 모집은 공개 페이지도 분석도 없다 */}
            {!cancelled && (
              <div className={styles.recruitmentActions}>
                {item.analyzedAt ? (
                  <LinkButton href={`${managePath}?tab=analytics`} size="sm" variant="ghost" className={styles.resultButton}>
                    <span className={styles.srOnly}>{title} </span>
                    결과보기
                    <span className={`${styles.proMark} ${styles.proMarkSoft}`}>PRO</span>
                  </LinkButton>
                ) : (
                  /* 동작은 아직 정하지 않았다 (#64) */
                  <Button size="sm">
                    <span className={styles.srOnly}>{title} </span>
                    분석하기
                    <span className={`${styles.proMark} ${styles.proMarkOnAccent}`}>PRO</span>
                  </Button>
                )}
                <Link href={`/recruitments/${item.slug}`} className={styles.recruitmentPublicLink}>
                  공개 페이지 보기
                  <ArrowUpRightIcon aria-hidden size={14} weight="bold" />
                </Link>
              </div>
            )}
          </Card>
        );
      })}
    </ul>
  );
}

/** 상세 화면들을 불러오는 동안 보이는 자리 */
export function DetailSkeleton() {
  return (
    <div data-testid="project-skeleton" className={styles.detailSkeleton}>
      <Skeleton className={styles.detailSkeletonSkeleton} />
      <Skeleton className={styles.detailSkeletonSkeleton2} />
      <Skeleton className={styles.detailSkeletonSkeleton3} />
      <Skeleton className={styles.detailSkeletonSkeleton4} />
    </div>
  );
}
