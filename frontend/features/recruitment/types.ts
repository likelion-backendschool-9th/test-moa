import { checkImages, isHttpUrl, parseFileMeta } from "@/features/project/media";
import type { FormState, Project, ProjectImage } from "@/features/project/types";

/** 테스트 대상 소프트웨어의 형태 (GLOSSARY: 소프트웨어 유형) */
export const SOFTWARE_TYPES = ["web", "mobile", "game", "api"] as const;
export type SoftwareType = (typeof SOFTWARE_TYPES)[number];

export const SOFTWARE_TYPE_LABEL: Record<SoftwareType, string> = {
  web: "웹서비스",
  mobile: "모바일앱",
  game: "게임",
  api: "API·라이브러리",
};

/** 테스트 모집 건. 한 프로젝트에서 조건·일정을 정해 테스터를 모집하는 단위 */
export type Recruitment = {
  slug: string;
  /** 테스트할 소프트웨어(프로젝트) 이름 */
  projectName: string;
  /** 프로젝트 대표 이미지. 목록 API에서 프로젝트 이미지 URL을 연결한다 */
  projectImage?: string;
  /** 프로젝트 한 줄 소개 */
  summary: string;
  /** 테스터에게 요청하는 내용 한 줄 */
  request: string;
  /** 카테고리. 하나 이상이고 모집 정보 탭에서 여러 개 고른다 (백엔드 TypeCode) */
  softwareTypes: SoftwareType[];
  /** 구독 개발자의 모집 건이면 상단 순환 노출과 추가 보상 대상 */
  isSubscription: boolean;
  createdAt: string;
  recruitDeadline: string;
  submitDeadline: string;
  confirmedCount: number;
  /** 기본 보상 크레딧 */
  baseReward: number;
  /** 추가 보상 크레딧. 구독 모집 건에만 있다 */
  extraReward?: number;
};

/** 전체 테스트 그리드의 한 페이지 */
export type RecruitmentPage = {
  items: Recruitment[];
  /** 조건에 맞는 전체 개수 */
  total: number;
  /** 실제로 보여 주는 페이지. 요청한 페이지가 마지막보다 크면 마지막 페이지다 */
  page: number;
  pageCount: number;
};

/*
 * 개발자 프로젝트 영역의 타입과 상수.
 * 서버와 클라이언트 컴포넌트가 함께 쓰므로 서버 전용 코드를 넣지 않는다.
 */

/** 지원 상태: 지원, 확정, 거절, 참여 취소(테스터가 그만뒀거나 모집이 취소됨. 백엔드 RegisterStatus.CANCELLED) */
export type ApplicationStatus = "applied" | "confirmed" | "rejected" | "cancelled";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "지원",
  confirmed: "확정",
  rejected: "거절",
  cancelled: "참여 취소",
};

/** 모집 건에 들어온 지원 한 건. 테스터 개인정보는 닉네임만 둔다 */
export type Application = {
  id: string;
  registerId?: string;
  testerNickname: string;
  status: ApplicationStatus;
  appliedAt: string;
};

/** 피드백 상태: 72시간 신고 대기, 신고됨, 지급 완료 */
export type FeedbackStatus = "waiting" | "reported" | "paid";

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  waiting: "신고 대기",
  reported: "신고됨",
  paid: "지급 완료",
};

/** 확정된 테스터가 제출한 피드백 한 건 */
export type Feedback = {
  id: string;
  registerId?: string;
  testerNickname: string;
  /** 어느 테스트 항목에 대한 피드백인지. 기타 의견은 null (백엔드 Feedback.testItem) */
  testItemId: string | null;
  /** 피드백에 붙인 스크린샷 (백엔드 FeedbackImage) */
  images: ProjectImage[];
  /** 개발자가 도움이 된 피드백으로 추천했는지 */
  recommended: boolean;
  content: string;
  submittedAt: string;
  status: FeedbackStatus;
};

/** 모집 건 상태. 저장하지 않고 마감일로 계산한다. 개발자가 취소하면 취소다 */
export type RecruitmentStatus = "recruiting" | "testing" | "closed" | "cancelled";

export const RECRUITMENT_STATUS_LABEL: Record<RecruitmentStatus, string> = {
  recruiting: "모집 중",
  testing: "테스트 중",
  closed: "종료",
  cancelled: "취소",
};

/** 테스터에게 해 달라고 할 작업 하나 (백엔드 TestItem). required는 ERD의 is_required이고 TestItem 엔티티에는 아직 없다 */
export type TestItem = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  /** 항목 설명을 돕는 이미지. 배열 순서가 ERD의 sort_order다 (백엔드 ProjectImage.testItem) */
  images: ProjectImage[];
};

/** 지원자를 뽑는 방식 (백엔드 post.selection_mode). 선착순은 지원하면 바로 확정, 선발형은 개발자가 직접 확정·거절 */
export type SelectionMode = "firstCome" | "selection";

export const SELECTION_MODE_LABEL: Record<SelectionMode, string> = {
  firstCome: "선착순",
  selection: "선발형",
};

/** 모집 건에 붙는 내용. 홈의 Recruitment 타입은 홈 담당이라 여기에 따로 둔다 */
export type RecruitmentDetail = {
  /** 모집글 제목 (백엔드 post.title) */
  title: string;
  selectionMode: SelectionMode;
  /** 테스터가 접속할 링크 (백엔드 post.access_url) */
  accessUrl: string;
  /** 모집 조건: 필요한 경험·관심사·사용 환경 (README). 없으면 빈 문자열 */
  conditions: string;
  /** 모집글 이미지 (백엔드 recruitment_images). 배열 순서가 sort_order이고, 모집글 상세 이미지 띠에서 대표 이미지 다음에 놓인다 */
  images: ProjectImage[];
  testItems: TestItem[];
  /** 모집 조건·테스트 항목·접속 링크를 조회할 수 없다. 취소된 모집은 공개 API가 404라서 비어 있는 값이 실제 값이 아니다 */
  unavailable?: boolean;
};

/** 확정된 테스터의 피드백 제출 현황. 제출 마감까지 안 내면 미완료 (README: 보상 없이 미완료 처리) */
export type SubmissionStatus = "submitted" | "pending" | "incomplete";

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: "제출함",
  pending: "미제출",
  incomplete: "미완료",
};

/** 개발자가 직접 취소한 기록. 운영자 승인 없이 바로 취소된다. 테스트 전 취소는 사유를 받지 않아 빈 문자열이다 */
export type RecruitmentCancellation = {
  reason: string;
  cancelledAt: string;
};

/** README: 제출 후 72시간 동안 신고가 없으면 자동 지급 */
export const REPORT_WINDOW_HOURS = 72;

/* 아래 값은 기획에서 미정이라 임시로 정한 값이다 */
/** 기본 보상 크레딧 */
export const BASE_REWARD = 1000;

/** 구독 모집의 추가 보상 크레딧 */
export const EXTRA_REWARD = 300;

/** 리뷰 그룹 심각도. 백엔드 improvementRank 1 = 치명 ~ 4 = 사소 */
export type ReviewSeverity = 1 | 2 | 3 | 4;

export const REVIEW_SEVERITY_LABEL: Record<ReviewSeverity, string> = { 1: "치명", 2: "높음", 3: "보통", 4: "사소" };

/** 리뷰 그룹 카테고리. 백엔드 ClusterCategory 중 심각도가 있는 것만(칭찬·미분류는 그룹 목록에 없다) */
export type ReviewCategory = "bug" | "ux" | "request";

export const REVIEW_CATEGORY_LABEL: Record<ReviewCategory, string> = { bug: "버그", ux: "UX", request: "요청" };

/** 리뷰 그룹으로 등록한 GitHub 이슈 */
export type GithubIssue = { number: number; url: string };

/**
 * AI가 묶은 리뷰 그룹 하나 (백엔드 ClusterGroup + FeedbackCluster).
 * 백엔드 ReviewAnalysisResponse.Group에는 리뷰 id가 없고, 그룹 리뷰는 GET .../analysis/groups/{groupId}/reviews로 받는다(fromBackendGroups).
 * shortcut: 목업은 리뷰 id를 그룹에 둔다. 리뷰 분석 탭을 백엔드에 붙일 때 fromBackendGroups를 쓴다
 */
export type ReviewGroup = {
  id: string;
  /** 분류 코드(백엔드 groupCode). 버전이 달라도 같은 문제면 같은 코드다 */
  code: string;
  name: string;
  category: ReviewCategory;
  severity: ReviewSeverity;
  issueTitle: string;
  issueContent: string;
  /** 등록한 GitHub 이슈(백엔드 gitIssueNumber·gitIssueUrl). 등록 전에는 null */
  issue: GithubIssue | null;
  /** 그룹에 든 리뷰(피드백) id */
  feedbackIds: string[];
  representativeFeedbackId: string | null;
};

/** 그룹에 든 리뷰 하나. 대표 리뷰가 맨 앞이다 */
export type GroupReview = {
  id: string;
  testerNickname: string;
  content: string;
  submittedAt: string;
  /** 어느 테스트 항목의 리뷰인지. 기타 의견은 null */
  testItemTitle: string | null;
  representative: boolean;
};

/** 화면에 그리는 그룹. 리뷰 목록과 그 리뷰를 쓴 테스터 수를 붙인다 */
export type ReviewGroupView = Omit<ReviewGroup, "feedbackIds" | "representativeFeedbackId"> & {
  reviews: GroupReview[];
  testerCount: number;
};

/** 그룹의 리뷰 id를 리뷰로 바꾼다. 신고된 리뷰는 분석에 넣지 않으니 뺀다. 대표 리뷰가 먼저, 나머지는 최신순 */
export function toGroupView(group: ReviewGroup, feedbacks: Feedback[], testItems: Array<{ id: string; title: string }>): ReviewGroupView {
  const { feedbackIds, representativeFeedbackId, ...rest } = group;
  const reviews = toGroupReviews(feedbackIds, representativeFeedbackId, feedbacks, testItems);
  return { ...rest, reviews, testerCount: new Set(reviews.map((item) => item.testerNickname)).size };
}

/** 리뷰 id를 리뷰로 바꾼다. 신고된 리뷰는 분석에 넣지 않으니 뺀다. 대표 리뷰가 먼저, 나머지는 최신순 */
export function toGroupReviews(
  feedbackIds: string[],
  representativeFeedbackId: string | null,
  feedbacks: Feedback[],
  testItems: Array<{ id: string; title: string }>,
): GroupReview[] {
  return feedbacks
    .filter((item) => feedbackIds.includes(item.id) && item.status !== "reported")
    .map((item) => ({
      id: item.id,
      testerNickname: item.testerNickname,
      content: item.content,
      submittedAt: item.submittedAt,
      testItemTitle: testItems.find((testItem) => testItem.id === item.testItemId)?.title ?? null,
      representative: item.id === representativeFeedbackId,
    }))
    .sort((a, b) => Number(b.representative) - Number(a.representative) || b.submittedAt.localeCompare(a.submittedAt));
}

/** 이슈 초안 검증. 백엔드 AnalysisGroupUpdateRequest와 같은 한도. 문제가 없으면 null */
export function validateIssueDraft(title: string, content: string) {
  if (!title.trim()) return "이슈 제목을 적어 주세요";
  if (title.length > 255) return "이슈 제목은 255자까지 적을 수 있어요";
  if (content.length > 60_000) return "이슈 내용은 60,000자까지 적을 수 있어요";
  return null;
}

/** AI 리뷰 묶기 결과 (백엔드 ReviewAnalysisResponse). 지금은 시연용 샘플이다 */
export type AiSummary = {
  /** 마지막으로 분석을 마친 시각 */
  analyzedAt: string;
  /** 리뷰 전체를 한 문장으로 요약한 분석(백엔드 analyticsSummary). 화면 맨 위 "핵심 요약"이다. 없으면 null */
  analyticsSummary: string | null;
  /** 칭찬 리뷰 한 줄 요약. 칭찬이 없으면 null */
  praiseSummary: string | null;
  /**
   * AI가 칭찬으로 묶은 리뷰 id.
   * shortcut: 목업은 분석 결과에 id를 둔다. 백엔드에 붙일 때는 GET .../analysis/praises로 받는다
   */
  praiseFeedbackIds: string[];
  groups: ReviewGroup[];
};

/** 분석 탭에 그리는 값. 리뷰 수와 시간대 별 수는 피드백에서 센다 */
export type ReviewAnalysis = Omit<AiSummary, "groups" | "praiseFeedbackIds"> & {
  groups: ReviewGroupView[];
  totalCount: number;
  todayCount: number;
  /** 마지막 분석 뒤에 들어와 아직 분석에 반영되지 않은 리뷰 수(백엔드 unanalyzedFeedbackCount) */
  unanalyzedCount: number;
  /** 시간대별 그래프. 범위마다 구간별 리뷰 수 */
  trends: Record<TrendRange, TrendPoint[]>;
  /** 칭찬으로 묶인 리뷰. 최근 제출 순 */
  praiseReviews: GroupReview[];
};

/** 심각도 순(1 = 치명 먼저), 같으면 테스터가 많은 순. 백엔드 정렬과 같다 */
export function sortReviewGroups(groups: ReviewGroupView[]) {
  return [...groups].sort((a, b) => a.severity - b.severity || b.testerCount - a.testerCount);
}

/** 리뷰 성향 원형 그래프 보기: 태그 별, 그룹 별, 심각도 별 */
export type ReviewMixView = "tag" | "group" | "severity";

/**
 * 원형 그래프 한 조각. color는 범주 색 순번(1~6), severity는 심각도 딱지와 같은 색을 쓴다
 */
export type ReviewMixSlice = { key: string; label: string; count: number; color: number | `severity-${ReviewSeverity}` };

/** 그룹 별 보기에서 색이 모자라지 않게 이보다 많으면 나머지를 "기타"로 묶는다 */
const MIX_MAX_SLICES = 6;

/**
 * 리뷰 성향. 그룹에 묶인 리뷰 수를 태그(버그·UX·요청과 칭찬)·그룹·심각도로 나눈다. 0건인 조각은 뺀다.
 * 그룹은 받은 순서(심각도 순)대로이고, 6개를 넘으면 앞의 5개만 두고 나머지를 "기타"로 묶는다
 */
export function buildReviewMix(groups: ReviewGroupView[], praiseCount: number): Record<ReviewMixView, ReviewMixSlice[]> {
  const sum = (items: ReviewGroupView[]) => items.reduce((total, group) => total + group.reviews.length, 0);
  const tag: ReviewMixSlice[] = [
    ...(Object.keys(REVIEW_CATEGORY_LABEL) as ReviewCategory[]).map((category, index) => ({
      key: category,
      label: REVIEW_CATEGORY_LABEL[category],
      count: sum(groups.filter((group) => group.category === category)),
      color: index + 1,
    })),
    { key: "praise", label: "칭찬", count: praiseCount, color: 4 },
  ];
  const named = groups.length > MIX_MAX_SLICES ? groups.slice(0, MIX_MAX_SLICES - 1) : groups;
  const rest = groups.slice(named.length);
  const group: ReviewMixSlice[] = [
    ...named.map((item, index) => ({ key: item.id, label: item.name, count: item.reviews.length, color: index + 1 })),
    ...(rest.length > 0 ? [{ key: "rest", label: "기타", count: sum(rest), color: MIX_MAX_SLICES }] : []),
  ];
  const severity: ReviewMixSlice[] = ([1, 2, 3, 4] as const).map((level) => ({
    key: String(level),
    label: REVIEW_SEVERITY_LABEL[level],
    count: sum(groups.filter((item) => item.severity === level)),
    color: `severity-${level}` as const,
  }));
  const nonEmpty = (slices: ReviewMixSlice[]) => slices.filter((slice) => slice.count > 0);
  return { tag: nonEmpty(tag), group: nonEmpty(group), severity: nonEmpty(severity) };
}

/** 직전 버전과 견준 분류의 상태 (백엔드 previouslyReported, notReportedGroups). "해결됨"이라고 쓰지 않는다(#108 정한 것 12) */
export type ComparisonStatus = "continued" | "new" | "notReported";

/** 버전 별 분석 그룹 목록의 칸 이름 */
export const COMPARISON_STATUS_LABEL: Record<ComparisonStatus, string> = {
  continued: "이전 버전과 묶인 그룹",
  new: "새로 생긴 그룹",
  notReported: "리뷰가 들어오지 않은 그룹",
};

/** 두 버전에 걸친 분류 하나. 이름·심각도는 있으면 현재 버전 것을 쓴다 */
export type ComparisonGroup = Pick<ReviewGroupView, "code" | "name" | "category" | "severity"> & {
  status: ComparisonStatus;
  previous: ReviewGroupView | null;
  current: ReviewGroupView | null;
};

/** AI 버전 비교 결과 중 저장되는 값 (백엔드 version_comparisons). 지금은 시연용 샘플이다 */
export type VersionComparisonSample = { summary: string; comparedAt: string };

/** 버전 별 분석 탭의 상태: 직전 버전 없음, 분석 전, 비교 전, 결과 있음 (백엔드 409 NO_PREVIOUS_VERSION·ANALYSIS_NOT_DONE, 404 COMPARISON_NOT_FOUND) */
export type VersionComparison =
  | { state: "noPrevious"; currentVersion: number }
  | { state: "notAnalyzed"; previousVersion: number; currentVersion: number }
  | { state: "notCompared"; previousVersion: number; currentVersion: number }
  | (VersionComparisonSample & {
      state: "ready";
      previousKey: string;
      previousVersion: number;
      currentVersion: number;
      /** 두 버전 모집글 제목 */
      previousTitle: string;
      currentTitle: string;
      /** 비교한 뒤 두 버전 중 하나를 다시 분석했으면 true */
      stale: boolean;
      /** 두 버전에서 마지막 분석 뒤에 들어와 비교에 반영되지 않은 리뷰 수 */
      unreflectedCount: number;
      groups: ComparisonGroup[];
    });

/**
 * 직전·현재 버전 그룹을 분류 코드로 잇는다(백엔드와 같은 규칙).
 * 현재 그룹을 심각도·테스터 수 순으로 먼저 두고, 그 뒤에 이번 버전에서 보고되지 않은 직전 그룹을 같은 순서로 둔다
 */
export function compareVersions(previous: ReviewGroupView[], current: ReviewGroupView[]): ComparisonGroup[] {
  const pick = ({ code, name, category, severity }: ReviewGroupView) => ({ code, name, category, severity });
  const currentCodes = new Set(current.map((group) => group.code));
  const continuing = sortReviewGroups(current).map((group): ComparisonGroup => {
    const before = previous.find((item) => item.code === group.code) ?? null;
    return { ...pick(group), status: before ? "continued" : "new", previous: before, current: group };
  });
  const dropped = sortReviewGroups(previous.filter((group) => !currentCodes.has(group.code))).map(
    (group): ComparisonGroup => ({ ...pick(group), status: "notReported", previous: group, current: null }),
  );
  return [...continuing, ...dropped];
}

/**
 * 짝 고치기. 이번 버전 그룹의 분류 코드를 바꿔 다시 잇는다(백엔드도 코드로 잇는다).
 * 직전 그룹 코드를 주면 그 그룹과 묶고, null이면 짝을 풀어 새로 생긴 그룹으로 둔다. 그 코드를 쓰던 다른 그룹은 짝이 풀린다(한 그룹은 한 번만 짝짓는다)
 */
export function relinkGroup(current: ReviewGroupView[], currentId: string, previousCode: string | null): ReviewGroupView[] {
  return current.map((group) => {
    if (group.id === currentId) return { ...group, code: previousCode ?? group.id };
    return previousCode !== null && group.code === previousCode ? { ...group, code: group.id } : group;
  });
}

/** 백엔드 ReviewAnalysisResponse.Group 중 화면이 쓰는 값 */
export type BackendAnalysisGroup = {
  groupId: number;
  groupCode: string;
  name: string;
  category: "BUG" | "UX" | "REQUEST" | "PRAISE" | "UNCLASSIFIED";
  improvementRank: number | null;
  gitIssueTitle: string | null;
  gitIssueContent: string | null;
  gitIssueUrl: string | null;
  gitIssueNumber: number | null;
  testerCount: number;
};

/** 백엔드 GroupReviewResponse (GET .../analysis/groups/{groupId}/reviews) */
export type BackendGroupReview = {
  feedbackId: number;
  nickname: string;
  testItemTitle: string | null;
  content: string;
  submittedAt: string;
  representative: boolean;
};

const BACKEND_CATEGORY: Partial<Record<BackendAnalysisGroup["category"], ReviewCategory>> = { BUG: "bug", UX: "ux", REQUEST: "request" };

/**
 * 백엔드 분석 그룹을 화면 그룹으로 바꾼다. 칭찬·미분류는 그룹 목록에 없어(ReviewCategory) 뺀다.
 * reviews는 그룹 id별 리뷰이고, 백엔드가 대표 리뷰 먼저·최근 제출 순으로 준다
 */
export function fromBackendGroups(groups: BackendAnalysisGroup[], reviews: Record<number, BackendGroupReview[]>): ReviewGroupView[] {
  return groups.flatMap((group) => {
    const category = BACKEND_CATEGORY[group.category];
    if (!category) return [];
    return [
      {
        id: String(group.groupId),
        code: group.groupCode,
        name: group.name,
        category,
        /* 심각도가 있는 카테고리라 백엔드가 늘 채운다. 비어 있으면 가장 낮은 단계로 둔다 */
        severity: (group.improvementRank ?? 4) as ReviewSeverity,
        issueTitle: group.gitIssueTitle ?? "",
        issueContent: group.gitIssueContent ?? "",
        issue: group.gitIssueUrl && group.gitIssueNumber !== null ? { number: group.gitIssueNumber, url: group.gitIssueUrl } : null,
        testerCount: group.testerCount,
        reviews: (reviews[group.groupId] ?? []).map((review) => ({
          id: String(review.feedbackId),
          testerNickname: review.nickname,
          content: review.content,
          submittedAt: review.submittedAt,
          testItemTitle: review.testItemTitle,
          representative: review.representative,
        })),
      },
    ];
  });
}

/**
 * 짝 저장 요청(PUT .../version-comparison/links). 저장한 짝과 코드가 달라진 이번 버전 그룹만 보낸다.
 * 바뀐 코드가 직전 그룹 코드면 그 그룹과 잇고, 아니면(relinkGroup이 짝을 풀며 붙인 자기 id) 짝 없음(null)이다
 */
export function toVersionLinks(previous: ReviewGroupView[], saved: ReviewGroupView[], draft: ReviewGroupView[]) {
  return draft
    .filter((group, index) => group.code !== saved[index].code)
    .map((group) => ({ groupId: group.id, previousGroupId: previous.find((item) => item.code === group.code)?.id ?? null }));
}

/** 버전 비교 막대 기준: 심각도 별, 그룹 별, 태그 별 */
export type VersionBarView = "severity" | "group" | "tag";

/** 막대 한 칸: 그 칸에 든 리뷰 수를 직전·이번 버전으로 */
export type VersionBar = { key: string; label: string; previous: number; current: number };

/**
 * 버전 비교 막대. 그룹에 묶인 리뷰 수를 심각도·그룹·태그로 나눠 두 버전을 견준다. 두 버전 모두 0건인 칸은 뺀다.
 * 심각도·태그는 각 버전 그룹의 값으로 세서 짝을 고쳐도 그대로이고, 그룹은 받은 순서대로다
 */
export function buildVersionBars(groups: ComparisonGroup[]): Record<VersionBarView, VersionBar[]> {
  const previous = groups.flatMap((group) => group.previous ?? []);
  const current = groups.flatMap((group) => group.current ?? []);
  const sum = (items: ReviewGroupView[]) => items.reduce((total, group) => total + group.reviews.length, 0);
  const split = (match: (group: ReviewGroupView) => boolean) => ({ previous: sum(previous.filter(match)), current: sum(current.filter(match)) });
  const severity = ([1, 2, 3, 4] as const).map((level) => ({
    key: String(level),
    label: REVIEW_SEVERITY_LABEL[level],
    ...split((group) => group.severity === level),
  }));
  const tag = (Object.keys(REVIEW_CATEGORY_LABEL) as ReviewCategory[]).map((category) => ({
    key: category,
    label: REVIEW_CATEGORY_LABEL[category],
    ...split((group) => group.category === category),
  }));
  const group = groups.map((item) => ({
    key: item.code,
    label: item.name,
    previous: item.previous?.reviews.length ?? 0,
    current: item.current?.reviews.length ?? 0,
  }));
  const nonEmpty = (bars: VersionBar[]) => bars.filter((bar) => bar.previous + bar.current > 0);
  return { severity: nonEmpty(severity), group: nonEmpty(group), tag: nonEmpty(tag) };
}

const seoulHour = (date: Date) =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(date));

/** 시간대별 그래프 범위: 하루(3시간 간격 8칸), 일주일(하루 간격 7칸), 30일(3일 간격 10칸). 모두 어제(한국 날짜)까지다 */
export type TrendRange = "day" | "week" | "month";

/** 그래프 한 칸: 그 구간에 들어온 리뷰 수 */
export type TrendPoint = {
  /** x축 이름 */
  label: string;
  /** 구간 전체 이름. 마우스를 올렸을 때와 읽는 프로그램에 쓴다 */
  title: string;
  reviews: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** 한국 날짜 "YYYY-MM-DD"를 1970-01-01부터 며칠째인지로 바꾼다 */
const dayNumber = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / DAY_MS;
const monthDay = (day: number) => {
  const date = new Date(day * DAY_MS);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};

/** 오늘 들어온 리뷰 수와 범위별 그래프 칸. 날짜는 한국 기준이라 자정이 지나면 오늘은 0부터 다시 센다 */
export function buildTrends(submittedAt: string[], now: Date) {
  const yesterday = dayNumber(seoulDate(now)) - 1;
  const hh = (hour: number) => String(hour).padStart(2, "0");
  const ranges: Record<TrendRange, { size: number; slot: (day: number, hour: number) => number; name: (index: number) => [string, string] }> = {
    day: {
      size: 8,
      slot: (day, hour) => (day === yesterday ? Math.floor(hour / 3) : -1),
      name: (index) => [`${hh(index * 3)}시`, `${hh(index * 3)}~${hh(index * 3 + 3)}시`],
    },
    week: {
      size: 7,
      slot: (day) => day - (yesterday - 6),
      name: (index) => [monthDay(yesterday - 6 + index), monthDay(yesterday - 6 + index)],
    },
    month: {
      size: 10,
      slot: (day) => (day > yesterday ? -1 : Math.floor((day - (yesterday - 29)) / 3)),
      name: (index) => {
        const start = yesterday - 29 + index * 3;
        return [monthDay(start), `${monthDay(start)}~${monthDay(start + 2)}`];
      },
    },
  };
  const dates = submittedAt.map((value) => new Date(value));
  const trends = {} as Record<TrendRange, TrendPoint[]>;
  for (const [range, { size, slot, name }] of Object.entries(ranges) as Array<[TrendRange, (typeof ranges)[TrendRange]]>) {
    const counts = Array<number>(size).fill(0);
    for (const date of dates) {
      const index = slot(dayNumber(seoulDate(date)), seoulHour(date));
      if (index >= 0 && index < size) counts[index] += 1;
    }
    trends[range] = counts.map((reviews, index) => {
      const [label, title] = name(index);
      return { label, title, reviews };
    });
  }
  const todayCount = dates.filter((date) => dayNumber(seoulDate(date)) === yesterday + 1).length;
  return { todayCount, trends };
}

/** 그래프 y축 눈금. 가장 많은 칸을 덮는 정수 눈금 다섯 개 이하. 값이 모두 0이면 0과 1 */
export function yTicks(hourly: number[]) {
  const max = Math.max(1, ...hourly);
  const step = Math.ceil(max / 4);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => index * step);
}

/** AI 분석을 시작하는 최소 피드백 수. 기획에서 미정이라 임시값이다 */
export const AI_MIN_FEEDBACKS = 3;

/** 피드백 하나로 받은 AI 후속 질문 (백엔드 FollowupQuestionsResponse). 실패하면 화면에 보일 문구를 둔다 */
export type FollowupResult = { ok: true; questions: string[] } | { ok: false; message: string };

/** 모집 작성 폼과 모집 취소의 글자 수·개수 한도. 기획 확정 전 임시값이다 */
export const RECRUITMENT_LIMIT = {
  titleLength: 50,
  conditionsLength: 500,
  /** 모집글 이미지 장수. 형식과 한 장 용량은 PROJECT_MEDIA_LIMIT.images를 따른다 (#124) */
  imageCount: 10,
  testItems: { min: 1, max: 10, titleLength: 50, descriptionLength: 300, imageCount: 5 },
  cancelReasonLength: 300,
  /** 피드백 신고 사유. 백엔드 FeedbackReportRequest와 같다 */
  reportReasonLength: 500,
} as const;

export type ProjectWithRecruitments = Project & { recruitments: Recruitment[] };

/*
 * 로직 계층. 화면에 필요한 값을 계산하고 폼을 검증한다.
 * 데이터는 api.ts에서만 가져오고, 화면(page.tsx, actions.ts)은 이 파일만 부른다.
 */

const HOUR_MS = 60 * 60 * 1000;

/* ---------- 계산 ---------- */

/** 모집 건 상태. 개발자가 취소했으면 취소, 모집 마감 전이면 모집 중, 마감 뒤면 제출 마감일로 나눈다 */
/** 홈 배너에 놓을 모집 건. 구독 모집을 먼저 놓고 남는 자리를 전체 최신순으로 채우며, 같은 모집 건은 한 번만 넣는다 */
export function pickBannerRecruitments(subscription: Recruitment[], latest: Recruitment[], limit: number): Recruitment[] {
  const bySlug = new Map([...subscription, ...latest].map((item) => [item.slug, item]));
  return [...new Set([...subscription, ...latest].map((item) => item.slug))].slice(0, limit).map((slug) => bySlug.get(slug) as Recruitment);
}

export function getRecruitmentStatus(recruitment: Recruitment, now: Date, cancelled = false): RecruitmentStatus {
  if (cancelled) return "cancelled";
  if (now < new Date(recruitment.recruitDeadline)) return "recruiting";
  return now < new Date(recruitment.submitDeadline) ? "testing" : "closed";
}

/** 신고 대기 중인 피드백이 자동 지급되기까지 남은 시간(시간 단위, 올림). 대기가 아니면 0 */
export function getHoursUntilPaid(feedback: Feedback, now: Date) {
  if (feedback.status !== "waiting") return 0;
  const until = new Date(feedback.submittedAt).getTime() + REPORT_WINDOW_HOURS * HOUR_MS;
  return Math.max(0, Math.ceil((until - now.getTime()) / HOUR_MS));
}

/**
 * 확정된 테스터의 피드백 제출 현황. 테스트가 시작되기 전(모집 중)에는 보여 주지 않으므로 null.
 * 피드백을 냈으면 제출함, 제출 마감이 지났으면 미완료, 아니면 미제출이다.
 */
export function getSubmissionStatus(
  application: Application,
  feedbacks: Feedback[],
  recruitment: RecruitmentView,
  now: Date,
): SubmissionStatus | null {
  if (application.status !== "confirmed") return null;
  if (recruitment.status !== "testing" && recruitment.status !== "closed") return null;
  /* ponytail: 목업은 지원 id가 피드백에 없어 닉네임으로 잇는다. API를 붙이면 지원(Register) id로 잇는다 */
  if (feedbacks.some((item) => item.testerNickname === application.testerNickname)) return "submitted";
  return now >= new Date(recruitment.submitDeadline) ? "incomplete" : "pending";
}

export type RecruitmentAnalytics = {
  applicationCount: number;
  confirmedCount: number;
  feedbackCount: number;
  /** 피드백을 한 건이라도 낸 확정 테스터 수 */
  submittedCount: number;
  /** 피드백을 낸 확정 테스터 수 ÷ 확정 수 백분율. 확정이 0이면 0 */
  submitRate: number;
  reportCount: number;
};

/** 분석 탭 숫자 */
export function getAnalytics(applications: Application[], feedbacks: Feedback[]): RecruitmentAnalytics {
  const confirmed = applications.filter((item) => item.status === "confirmed");
  const confirmedCount = confirmed.length;
  /* 피드백은 테스트 항목마다 낼 수 있어 건수가 아니라 낸 사람을 센다. 닉네임으로 잇는 이유는 getSubmissionStatus와 같다 */
  const submitters = new Set(feedbacks.map((item) => item.testerNickname));
  const submittedCount = confirmed.filter((item) => submitters.has(item.testerNickname)).length;
  return {
    applicationCount: applications.length,
    confirmedCount,
    submittedCount,
    feedbackCount: feedbacks.length,
    submitRate: confirmedCount === 0 ? 0 : Math.round((submittedCount / confirmedCount) * 100),
    reportCount: feedbacks.filter((item) => item.status === "reported").length,
  };
}

/* ---------- 조회 ---------- */

export type RecruitmentView = Recruitment & { status: RecruitmentStatus; title: string };

/** 프로젝트 상세의 모집글 한 줄. 버전은 프로젝트 안에서 만든 순서(첫 모집이 v1)이고, AI 분석을 안 했으면 analyzedAt이 null이다 */
export type ProjectRecruitmentRow = RecruitmentView & {
  version: number;
  feedbackCount: number;
  analyzedAt: string | null;
  selectionMode?: SelectionMode;
  /** 취소된 모집의 사유와 일시. 백엔드 응답에만 있다 */
  cancellation?: RecruitmentCancellation | null;
};

export type ProjectSummary = Omit<Project, "recruitments"> & {
  recruitments: RecruitmentView[];
  recruitmentCount: number;
  openRecruitmentCount: number;
};

/** 내 프로젝트 화면 맨 위 "지금 확인할 일" 한 줄 */
export type TodoItem = {
  kind: "applicants" | "feedback";
  projectName: string;
  /** 이동할 모집 관리 탭 주소 */
  href: string;
  text: string;
};

/** 모든 프로젝트를 합친 숫자. 진행 중인 모집 건을 상태별로 센다(종료·취소는 세지 않는다) */
export type ProjectOverview = Record<Exclude<RecruitmentStatus, "closed" | "cancelled">, number> & { waitingReports: number };

export type PublicRecruitmentView = PublicRecruitmentData & { now: Date; status: Exclude<RecruitmentStatus, "cancelled"> };

export type FeedbackView = Feedback & { hoursUntilPaid: number };

export type ApplicationView = Application & { submission: SubmissionStatus | null };

/**
 * 개발자가 모집을 취소할 수 있는지. 테스트 전(모집 중)에는 확정된 테스터가 없을 때만,
 * 테스트 중에는 사유를 적으면 취소할 수 있다. 종료했거나 이미 취소한 모집은 취소할 수 없다.
 */
export function canCancelRecruitment(recruitment: Pick<RecruitmentView, "status" | "confirmedCount">) {
  if (recruitment.status === "testing") return true;
  return recruitment.status === "recruiting" && recruitment.confirmedCount === 0;
}

/** 선발형 구독 모집이고 모집 마감 전이면 지원자를 직접 확정·거절할 수 있다 */
export function canSelectApplicants(recruitment: Pick<RecruitmentView, "status" | "isSubscription">, selectionMode: SelectionMode) {
  return recruitment.isSubscription && selectionMode === "selection" && recruitment.status === "recruiting";
}

/** 마지막 분석 요청의 상태 (백엔드 AnalysisStatus). 분석 중이어도 지난 결과가 있으면 함께 온다 */
export type AnalysisStatus = "NONE" | "PENDING" | "DONE" | "FAILED";

/** AI 분석 영역의 상태: 결과 있음, 피드백 부족, 아직 정리 전 */
export type AiAnalysis =
  | { state: "ready"; status: AnalysisStatus; summary: ReviewAnalysis }
  | { state: "notEnough"; feedbackCount: number; minFeedbacks: number }
  | { state: "empty"; status: AnalysisStatus };

/* ---------- 폼 검증 ---------- */

/* 브라우저는 폼을 보낼 때 줄바꿈을 두 글자(\r\n)로 바꾼다. 화면에서 센 글자 수와 맞도록 되돌린다 */
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").replace(/\r\n/g, "\n").trim();

/** 그 시각의 한국 날짜 "2026-10-30". 날짜 칸 값과 비교한다 */
export function seoulDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

/** 모집 작성 폼 검증. 날짜는 "YYYY-MM-DD" 문자열로 비교한다 */
export function validateRecruitmentForm(formData: FormData, isSubscription: boolean, now: Date): FormState {
  const values = {
    title: text(formData, "title"),
    request: text(formData, "request"),
    softwareType: text(formData, "softwareType"),
    selectionMode: text(formData, "selectionMode"),
    accessUrl: text(formData, "accessUrl"),
    conditions: text(formData, "conditions"),
    recruitDeadline: text(formData, "recruitDeadline"),
    submitDeadline: text(formData, "submitDeadline"),
  };
  const errors: Record<string, string> = {};
  if (!values.title) errors.title = "모집글 제목을 적어 주세요";
  else if (values.title.length > RECRUITMENT_LIMIT.titleLength) errors.title = `모집글 제목은 ${RECRUITMENT_LIMIT.titleLength}자까지 적을 수 있어요`;
  if (!values.request) errors.request = "모집 설명을 적어 주세요";
  else if (values.request.length > 200) errors.request = "모집 설명은 200자까지 적을 수 있어요";
  /* 첫 지원 대상이 웹서비스라 유형은 web만 받는다 */
  if (values.softwareType !== "web") errors.softwareType = "지금은 웹서비스만 모집할 수 있어요";
  if (!isHttpUrl(values.accessUrl)) errors.accessUrl = "http:// 또는 https://로 시작하는 주소를 적어 주세요";
  /* 화면에서 막아도 요청은 조작될 수 있어서 여기서 다시 확인한다 */
  if (values.selectionMode !== "firstCome" && values.selectionMode !== "selection") errors.selectionMode = "선정 방식을 골라 주세요";
  else if (values.selectionMode === "selection" && !isSubscription) errors.selectionMode = "선발형은 구독 모집에서만 쓸 수 있어요";
  if (!values.recruitDeadline) errors.recruitDeadline = "모집 마감일을 골라 주세요";
  else if (values.recruitDeadline < seoulDate(now)) errors.recruitDeadline = "모집 마감일은 오늘 이후로 골라 주세요";
  if (!values.submitDeadline) errors.submitDeadline = "피드백 제출 마감일을 골라 주세요";
  else if (values.recruitDeadline && values.submitDeadline <= values.recruitDeadline) {
    errors.submitDeadline = "제출 마감일은 모집 마감일보다 뒤여야 해요";
  }
  if (values.conditions.length > RECRUITMENT_LIMIT.conditionsLength) {
    errors.conditions = `모집 조건은 ${RECRUITMENT_LIMIT.conditionsLength}자까지 적을 수 있어요`;
  }

  /* 모집글 이미지는 선택이고 테스트 항목 이미지와 따로 센다 (#124) */
  const recruitmentImages = parseFileMeta(formData.get("recruitmentImagesMeta"));
  const recruitmentImageError = recruitmentImages
    ? checkImages(recruitmentImages, RECRUITMENT_LIMIT.imageCount)
    : "이미지 정보를 읽지 못했어요";
  if (recruitmentImageError) errors.recruitmentImages = recruitmentImageError;

  /* 테스트 항목: 제목과 설명이 둘 다 빈 줄은 없는 것으로 본다 */
  const { min, max, titleLength, descriptionLength, imageCount } = RECRUITMENT_LIMIT.testItems;
  const titles = formData.getAll("testItemTitle").map((item) => String(item).trim());
  const descriptions = formData.getAll("testItemDescription").map((item) => String(item).trim());
  /* 체크를 끈 줄처럼 빠지지 않도록 이미지 정보는 줄마다 하나씩 온다 */
  const images = formData.getAll("testItemImagesMeta").map((item) => parseFileMeta(item));
  const filled = titles.filter((title, index) => title || descriptions[index] || images[index]?.length).length;
  if (filled < min) {
    errors.testItems = `테스트 항목을 ${min}개 이상 적어 주세요`;
    /* 첫 칸에도 오류를 달아 포커스가 그리로 가게 한다 */
    errors["testItemTitle-0"] = "항목 이름을 적어 주세요";
  }
  else if (filled > max) errors.testItems = `테스트 항목은 ${max}개까지 적을 수 있어요`;
  titles.forEach((title, index) => {
    const description = descriptions[index] ?? "";
    const rowImages = images[index];
    if (!title && !description && !rowImages?.length) return;
    const imageError = rowImages === null ? "이미지 정보를 읽지 못했어요" : checkImages(rowImages ?? [], imageCount);
    if (imageError) errors[`testItemImages-${index}`] = imageError;
    if (!title) errors[`testItemTitle-${index}`] = "항목 이름을 적어 주세요";
    else if (title.length > titleLength) errors[`testItemTitle-${index}`] = `항목 이름은 ${titleLength}자까지 적을 수 있어요`;
    if (description.length > descriptionLength) {
      errors[`testItemDescription-${index}`] = `항목 설명은 ${descriptionLength}자까지 적을 수 있어요`;
    }
  });
  return { values, errors };
}

/* ---------- 모집 정보 수정 ---------- */

/**
 * 모집 정보 탭에서 막는 범위. 이미 참여한 테스터와 어긋나는 변경을 막는다.
 * 종료·취소한 모집은 전부 읽기 전용이다.
 */
export type RecruitmentEditLocks = {
  readOnly: boolean;
  /** 지원자가 한 명이라도 있으면 선정 방식을 바꿀 수 없다 */
  selectionMode: boolean;
  /** 모집 마감이 지나면 모집 마감일을 바꿀 수 없다. 다시 열리면 안 되기 때문이다 */
  recruitDeadline: boolean;
  /** 피드백이 달린 테스트 항목. 지울 수 없다 */
  lockedItemIds: string[];
};

export function getEditLocks(
  recruitment: Pick<RecruitmentView, "status">,
  applicationCount: number,
  feedbacks: Pick<Feedback, "testItemId">[],
): RecruitmentEditLocks {
  return {
    readOnly: recruitment.status === "closed" || recruitment.status === "cancelled",
    selectionMode: applicationCount > 0,
    recruitDeadline: recruitment.status !== "recruiting",
    lockedItemIds: [...new Set(feedbacks.flatMap((item) => (item.testItemId ? [item.testItemId] : [])))],
  };
}

/** 모집 정보 탭에서 따로 저장하는 영역 */
export type RecruitmentEditSection = "post" | "terms" | "testItems" | "repository";

/** 저장 결과. ok면 화면에 저장 완료를 알린다 */
export type EditState = FormState & { ok?: boolean };

/** 글 정보: 제목, 설명, 접속 링크, 카테고리. 접속 링크를 읽을 수 없는 화면(accessUrlKept)은 비워 두면 기존 링크를 그대로 둔다 */
export function validatePostEdit(formData: FormData): EditState {
  const values = { title: text(formData, "title"), request: text(formData, "request"), accessUrl: text(formData, "accessUrl") };
  const errors: Record<string, string> = {};
  if (!values.title) errors.title = "모집글 제목을 적어 주세요";
  else if (values.title.length > RECRUITMENT_LIMIT.titleLength) errors.title = `모집글 제목은 ${RECRUITMENT_LIMIT.titleLength}자까지 적을 수 있어요`;
  if (!values.request) errors.request = "모집 설명을 적어 주세요";
  else if (values.request.length > 200) errors.request = "모집 설명은 200자까지 적을 수 있어요";
  const keepAccessUrl = !values.accessUrl && formData.has("accessUrlKept");
  if (!keepAccessUrl && !isHttpUrl(values.accessUrl)) errors.accessUrl = "http:// 또는 https://로 시작하는 주소를 적어 주세요";
  const picked = formData.getAll("categories").map(String);
  if (picked.length === 0 || !picked.every((value) => SOFTWARE_TYPES.includes(value as SoftwareType))) {
    errors.categories = "카테고리를 하나 이상 골라 주세요";
  }
  return { values, errors };
}

type TermsCurrent = Pick<Recruitment, "isSubscription" | "recruitDeadline" | "submitDeadline"> & { selectionMode: SelectionMode };

/**
 * 모집 정보: 모집 조건, 선정 방식, 마감일. 마감일은 미루기만 할 수 있다.
 * 잠긴 선정 방식과 모집 마감일은 화면에서 꺼 둬 값이 오지 않으면 지금 값으로 본다. 다른 값이 오면 조작된 요청이라 막는다
 */
export function validateTermsEdit(formData: FormData, current: TermsCurrent, locks: RecruitmentEditLocks): EditState {
  const recruitBefore = seoulDate(new Date(current.recruitDeadline));
  const submitBefore = seoulDate(new Date(current.submitDeadline));
  const values = {
    conditions: text(formData, "conditions"),
    selectionMode: text(formData, "selectionMode") || current.selectionMode,
    recruitDeadline: text(formData, "recruitDeadline") || (locks.recruitDeadline ? recruitBefore : ""),
    submitDeadline: text(formData, "submitDeadline"),
  };
  const errors: Record<string, string> = {};
  if (values.conditions.length > RECRUITMENT_LIMIT.conditionsLength) {
    errors.conditions = `모집 조건은 ${RECRUITMENT_LIMIT.conditionsLength}자까지 적을 수 있어요`;
  }
  if (values.selectionMode !== "firstCome" && values.selectionMode !== "selection") errors.selectionMode = "선정 방식을 골라 주세요";
  else if (locks.selectionMode && values.selectionMode !== current.selectionMode) errors.selectionMode = "지원자가 있어 선정 방식을 바꿀 수 없어요";
  else if (values.selectionMode === "selection" && !current.isSubscription) errors.selectionMode = "선발형은 구독 모집에서만 쓸 수 있어요";

  if (!values.recruitDeadline) errors.recruitDeadline = "모집 마감일을 골라 주세요";
  else if (locks.recruitDeadline && values.recruitDeadline !== recruitBefore) errors.recruitDeadline = "모집이 마감돼 바꿀 수 없어요";
  else if (values.recruitDeadline < recruitBefore) errors.recruitDeadline = "모집 마감일은 미루기만 할 수 있어요";
  if (!values.submitDeadline) errors.submitDeadline = "피드백 제출 마감일을 골라 주세요";
  else if (values.submitDeadline < submitBefore) errors.submitDeadline = "제출 마감일은 미루기만 할 수 있어요";
  else if (values.recruitDeadline && values.submitDeadline <= values.recruitDeadline) {
    errors.submitDeadline = "제출 마감일은 모집 마감일보다 뒤여야 해요";
  }
  return { values, errors };
}

/**
 * 테스트 정보: 테스트 항목의 순서와 내용. 줄마다 testItemId(새 줄은 빈 값)가 온다.
 * 피드백이 달린 항목이 빠졌으면 막는다
 */
export function validateTestItemsEdit(formData: FormData, lockedItemIds: string[]): EditState {
  const { min, max, titleLength, descriptionLength } = RECRUITMENT_LIMIT.testItems;
  const ids = formData.getAll("testItemId").map(String);
  const titles = formData.getAll("testItemTitle").map((item) => String(item).trim());
  const descriptions = formData.getAll("testItemDescription").map((item) => String(item).trim());
  const errors: Record<string, string> = {};
  if (ids.length < min) errors.testItems = `테스트 항목을 ${min}개 이상 적어 주세요`;
  else if (ids.length > max) errors.testItems = `테스트 항목은 ${max}개까지 적을 수 있어요`;
  else if (!lockedItemIds.every((id) => ids.includes(id))) errors.testItems = "피드백이 달린 항목은 지울 수 없어요";
  ids.forEach((_, index) => {
    const title = titles[index] ?? "";
    if (!title) errors[`testItemTitle-${index}`] = "항목 이름을 적어 주세요";
    else if (title.length > titleLength) errors[`testItemTitle-${index}`] = `항목 이름은 ${titleLength}자까지 적을 수 있어요`;
    if ((descriptions[index] ?? "").length > descriptionLength) {
      errors[`testItemDescription-${index}`] = `항목 설명은 ${descriptionLength}자까지 적을 수 있어요`;
    }
  });
  return { values: {}, errors };
}

/* GitHub 저장소 "owner/repo". 주소를 붙여 넣어도 받는다 (백엔드 RepositoryLink의 owner, repo) */
const GITHUB_REPO = /^(?:https:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

/** 프로젝트에 GitHub 저장소를 연결한다. 맞으면 values.repository에 "owner/repo"로 바꿔 둔다 */
export function validateRepository(formData: FormData): EditState {
  const match = GITHUB_REPO.exec(text(formData, "repository"));
  if (!match) return { values: { repository: text(formData, "repository") }, errors: { repository: "owner/repo 형식이나 GitHub 주소를 적어 주세요" } };
  return { values: { repository: `${match[1]}/${match[2]}` }, errors: {} };
}

/** 레포 연결 요청 검증. 백엔드 연결은 이슈를 만들 토큰이 있어야 해서 tokenRequired일 때 토큰도 비울 수 없다 */
export function validateRepositoryConnect(formData: FormData, tokenRequired: boolean): EditState {
  const state = validateRepository(formData);
  if (tokenRequired && !text(formData, "token")) state.errors.token = "GitHub 토큰을 적어 주세요";
  return state;
}

export type PublicRecruitmentData = {
  recruitment: Recruitment;
  /** 모집글 제목, 모집 조건, 테스트 항목. 샘플이 없는 모집 건은 null */
  detail: RecruitmentDetail | null;
  /** 이 모집 건의 프로젝트. 샘플이 없는 모집 건은 null */
  project: Pick<Project, "description" | "image"> | null;
  /** 로그인한 회원의 참가 상태. 참가가 없거나 비로그인·목업이면 없다 */
  myRegisterStatus?: ApplicationStatus | null;
};

/** 지원 결과. 선착순은 바로 확정되고 선발형은 개발자의 확정을 기다린다 */
export type ApplyState = { status: "idle" } | { status: "done"; confirmed: boolean } | { status: "error"; message: string };

/** 지금 지원할 수 없으면 이유를 돌려준다. 참여 취소만 있으면 다시 지원할 수 있다 */
export function getApplyBlockedMessage(status: RecruitmentStatus, myRegisterStatus?: ApplicationStatus | null) {
  if (status !== "recruiting") return "모집이 마감됐어요";
  if (myRegisterStatus && myRegisterStatus !== "cancelled") return "이미 지원한 테스트예요";
  return null;
}
