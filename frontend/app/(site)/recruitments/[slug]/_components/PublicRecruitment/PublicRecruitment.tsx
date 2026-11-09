import { CheckIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getApplyBlockedMessage, SOFTWARE_TYPE_LABEL } from "@/features/recruitment/types";
import { cn } from "@/lib/cn";
import { formatCredits, formatDate, formatDday } from "@/lib/format";
import type { PublicRecruitmentView } from "@/features/recruitment/types";
import { DEFAULT_PROJECT_IMAGE_URL } from "@/features/project/types";
import { SELECTION_MODE_LABEL } from "@/features/recruitment/types";
import { ProjectDescription } from "@/features/project/components/ProjectDescription/ProjectDescription";
import { RecruitmentGallery, type GalleryImage } from "@/app/(site)/recruitments/[slug]/_components/RecruitmentGallery/RecruitmentGallery";
import { RecruitmentStatusBadge } from "@/features/recruitment/components/RecruitmentStatusBadge/RecruitmentStatusBadge";
import { TestItemImages } from "@/features/recruitment/components/TestItemImages/TestItemImages";
import styles from "./PublicRecruitment.module.css";

/**
 * 공개 모집글. 테스터가 지원 전에 일정, 보상을 확인하는 화면이다 (PRODUCT: 보상과 일정은 숨기지 않는다).
 * 요약은 보상을 크게, 일정과 선정 방식을 작게 두어 먼저 볼 숫자가 드러나게 한다.
 * 접속 링크는 참여가 확정된 테스터에게만 안내하므로 보여 주지 않는다.
 */
export function PublicRecruitment({ post }: { post: PublicRecruitmentView }) {
  const { recruitment, detail, project, status, now } = post;
  const blockedMessage = getApplyBlockedMessage(status, post.myRegisterStatus);
  const keyFacts: Array<{ term: string; value: string; accent?: boolean }> = [
    { term: "기본 보상", value: formatCredits(recruitment.baseReward) },
    ...(recruitment.extraReward !== undefined ? [{ term: "추가 보상", value: `+${formatCredits(recruitment.extraReward)}`, accent: true }] : []),
  ];
  const scheduleFacts: Array<[string, string]> = [
    ["모집 마감", formatDate(recruitment.recruitDeadline)],
    ["피드백 제출 마감", formatDate(recruitment.submitDeadline)],
    ...(detail ? ([["선정 방식", SELECTION_MODE_LABEL[detail.selectionMode]]] as Array<[string, string]>) : []),
  ];
  const description = project?.description || recruitment.summary;
  const conditions = detail?.conditions.split("\n").filter((line) => line.trim()) ?? [];
  const testItems = detail?.testItems ?? [];
  const requiredCount = testItems.filter((item) => item.required).length;
  /* 대표 이미지 다음에 모집글 이미지를 등록한 순서대로 잇는다. 테스트 항목 이미지는 각 항목 아래에만 둔다 (#124) */
  const gallery: GalleryImage[] = [
    {
      url: project?.image?.url ?? DEFAULT_PROJECT_IMAGE_URL,
      alt: project?.image ? `${recruitment.projectName} 대표 이미지` : "기본 프로젝트 이미지",
      badge: project?.image ? "대표 이미지" : undefined,
    },
    ...(detail?.images ?? []).map((image) => ({ url: image.url, alt: image.name })),
  ];

  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <div className={styles.box}>
          <RecruitmentStatusBadge status={status} />
          {recruitment.extraReward !== undefined && <Badge tone="muted">추가 보상</Badge>}
          {recruitment.softwareTypes.map((type) => (
            <Badge key={type} tone="outline">{SOFTWARE_TYPE_LABEL[type]}</Badge>
          ))}
        </div>
        <h1 className={styles.title}>{detail?.title || recruitment.request}</h1>
        {detail?.title && <p className={styles.request}>{recruitment.request}</p>}
      </header>

      <div data-project-body className={styles.layout}>
        <div className={styles.box2}>
          <RecruitmentGallery images={gallery} label={`${recruitment.projectName} 이미지 ${gallery.length}장`} />
        </div>

        <Card as="aside" aria-label="모집 요약" className={cn(styles.aside, styles.summaryPlace)}>
          <dl className={styles.list}>
            {keyFacts.map(({ term, value, accent }) => (
              <div key={term} className={styles.root2}>
                <dt className={styles.term}>{term}</dt>
                <dd className={cn(styles.value, accent && styles.valueAccent)}>{value}</dd>
              </div>
            ))}
          </dl>
          <dl className={styles.list2}>
            {scheduleFacts.map(([term, value]) => (
              <div key={term} className={styles.root3}>
                <dt className={styles.term2}>{term}</dt>
                <dd className={styles.value2}>
                  {value}
                  {term === "모집 마감" && status === "recruiting" && (
                    <span className={styles.label}>{formatDday(recruitment.recruitDeadline, now)}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {blockedMessage === null ? (
            <LinkButton href={`/recruitments/${recruitment.slug}/apply`} className={styles.button}>
              지원하기
            </LinkButton>
          ) : (
            <p role="status" className={styles.text}>
              {blockedMessage}
            </p>
          )}
        </Card>

        <div className={styles.box3}>
          <Card className={styles.card}>
            <h2 className={styles.projectName}>{recruitment.projectName}</h2>
            <ProjectDescription text={description} />
          </Card>

          <Card className={styles.card2}>
            <h2 className={styles.title2}>모집 조건</h2>
            {conditions.length > 0 ? (
              <ul className={styles.list3}>
                {conditions.map((condition) => (
                  <li key={condition} className={styles.root4}>
                    <CheckIcon aria-hidden size={20} weight="bold" className={styles.icon} />
                    <span className={styles.condition}>{condition}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.text2}>따로 정한 조건이 없어요</p>
            )}
          </Card>

          {testItems.length > 0 && (
            <Card className={styles.card3}>
              <div className={styles.box4}>
                <h2 className={styles.title3}>
                  테스트 항목 <span className={styles.length}>{testItems.length}</span>
                </h2>
                <p className={styles.text3}>
                  필수 {requiredCount} · 선택 {testItems.length - requiredCount}
                </p>
              </div>
              <ol className={styles.list4}>
                {testItems.map((item, index) => (
                  <li key={item.id} className={styles.root5}>
                    <span aria-hidden className={styles.label2}>
                      {index + 1}
                    </span>
                    <div className={styles.box5}>
                      <div className={styles.box6}>
                        <h3 className={styles.title4}>{item.title}</h3>
                        <Badge tone={item.required ? "neutral" : "outline"}>{item.required ? "필수" : "선택"}</Badge>
                      </div>
                      {item.description && <p className={styles.description}>{item.description}</p>}
                      <div className={styles.box7}>
                        <TestItemImages item={item} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </article>
  );
}

export function PublicRecruitmentSkeleton() {
  return (
    <div data-skeleton="recruitment" aria-busy="true" aria-label="모집글 불러오는 중" className={styles.publicRecruitmentSkeleton}>
      <div className={styles.publicRecruitmentSkeletonBox}>
        <Skeleton className={styles.publicRecruitmentSkeletonSkeleton} />
        <Skeleton className={styles.publicRecruitmentSkeletonSkeleton2} />
      </div>
      <div className={styles.layout}>
        <Skeleton className={styles.publicRecruitmentSkeletonSkeleton3} />
        <Skeleton className={cn(styles.publicRecruitmentSkeletonSkeleton4, styles.summaryPlace)} />
        <Skeleton className={styles.publicRecruitmentSkeletonSkeleton5} />
      </div>
    </div>
  );
}
