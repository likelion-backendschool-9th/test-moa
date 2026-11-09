"use server";

import { PROJECTS_PATH, projectPath, recruitmentCreatePath } from "@/features/project/paths";
import type { FormState } from "@/features/project/types";
import {
  cancelRecruitment as cancel,
  decideApplicants as decide,
  getRecruitmentFormInfo,
  recommendFollowupQuestions,
  saveBackendRecruitment,
  submitApplication,
  registerGithubIssue,
  runReviewAnalysis,
  runVersionComparison,
  saveIssueDraft,
  saveVersionLinks,
  updateRecruitment as update,
  type ActionResult,
  type RegisterIssueResult,
} from "@/features/recruitment/api";
import type { ApplyState, EditState, FollowupResult, RecruitmentEditSection } from "@/features/recruitment/types";
import { validateRecruitmentForm } from "@/features/recruitment/types";
import { isBackendAuth } from "@/lib/backend";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** 테스트 모집 작성 */
export async function createRecruitment(projectKey: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { isSubscription } = await getRecruitmentFormInfo(recruitmentCreatePath(projectKey), projectKey);

  const result = validateRecruitmentForm(formData, isSubscription, new Date());
  if (Object.keys(result.errors).length > 0) return result;
  if (isBackendAuth) {
    const failed = await saveBackendRecruitment(projectKey, result, formData);
    if (failed) return failed;
    /* 뒤로 가기로 돌아간 프로젝트 화면에 새 모집글이 빠지지 않게 한다 */
    revalidatePath(PROJECTS_PATH, "layout");
  }
  redirect(`${projectPath(projectKey)}?notice=saved`);
}

/** 테스트 지원. 뒤로 가기로 돌아간 상세와 내 참여 화면에 지원 전 상태가 남지 않게 한다 */
export async function applyToRecruitment(slug: string): Promise<ApplyState> {
  const result = await submitApplication(slug);
  if (result.status === "done") {
    revalidatePath(`/recruitments/${slug}`);
    revalidatePath("/testers/recruitments", "layout");
  }
  return result;
}

/** 지원자 확정·거절. 시연용이라 결과는 브라우저 쿠키에 남고, 요약·분석·내 프로젝트 화면에도 반영된다 */
export async function decideApplicants(
  recruitmentKey: string,
  ids: string[],
  status: "confirmed" | "rejected",
): Promise<{ ok: boolean }> {
  if (status !== "confirmed" && status !== "rejected") return { ok: false };
  return decide(recruitmentKey, ids, status);
}

/** 모집 취소. 운영자 승인 없이 바로 취소된다. 시연용이라 브라우저 쿠키에 남는다 */
export async function cancelRecruitment(
  recruitmentKey: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState & { ok?: boolean }> {
  return cancel(recruitmentKey, formData);
}

/** 모집 정보 탭의 영역 하나 저장. 영역 이름은 화면이 정하지만 조작될 수 있어 다시 확인한다 */
export async function updateRecruitment(
  recruitmentKey: string,
  section: RecruitmentEditSection,
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  if (!EDIT_SECTIONS.includes(section)) return { values: {}, errors: { form: "잘못된 요청이에요" } };
  return update(recruitmentKey, section, formData);
}

const EDIT_SECTIONS: RecruitmentEditSection[] = ["post", "terms", "testItems", "repository"];

/** AI 리뷰 분석 시작. 일주일 3번 한도는 백엔드가 센다 */
export async function startAnalysisAction(recruitmentKey: string): Promise<ActionResult> {
  if (typeof recruitmentKey !== "string") return { ok: false, message: "잘못된 요청이에요" };
  return runReviewAnalysis(recruitmentKey);
}

/** 그룹의 이슈 초안 저장. 글자 수 한도는 백엔드가 다시 확인한다 */
export async function saveIssueDraftAction(
  recruitmentKey: string,
  groupId: string,
  draft: { title: string; content: string },
): Promise<ActionResult> {
  if (typeof recruitmentKey !== "string" || typeof groupId !== "string" || typeof draft?.title !== "string" || typeof draft?.content !== "string") {
    return { ok: false, message: "잘못된 요청이에요" };
  }
  return saveIssueDraft(recruitmentKey, groupId, draft);
}

/** 그룹의 이슈를 GitHub에 등록한다 */
export async function registerIssueAction(recruitmentKey: string, groupId: string): Promise<RegisterIssueResult> {
  if (typeof recruitmentKey !== "string" || typeof groupId !== "string") return { ok: false, message: "잘못된 요청이에요" };
  return registerGithubIssue(recruitmentKey, groupId);
}

/** AI 버전 비교 실행. 일주일 3번 한도는 백엔드가 센다 */
export async function compareVersionsAction(recruitmentKey: string): Promise<ActionResult> {
  if (typeof recruitmentKey !== "string") return { ok: false, message: "잘못된 요청이에요" };
  return runVersionComparison(recruitmentKey);
}

/** 버전 비교에서 고친 짝 저장. 그룹이 어느 버전 것인지는 백엔드가 다시 확인한다 */
export async function saveVersionLinksAction(
  recruitmentKey: string,
  links: Array<{ groupId: string; previousGroupId: string | null }>,
): Promise<ActionResult> {
  const valid =
    typeof recruitmentKey === "string" &&
    Array.isArray(links) &&
    links.every((link) => typeof link?.groupId === "string" && (link.previousGroupId === null || typeof link.previousGroupId === "string"));
  if (!valid) return { ok: false, message: "잘못된 요청이에요" };
  return saveVersionLinks(recruitmentKey, links);
}

/** 피드백 하나로 AI 후속 질문을 받는다. 하루 3번 한도는 백엔드가 센다 */
export async function getFollowupQuestions(recruitmentKey: string, feedbackId: string): Promise<FollowupResult> {
  if (typeof recruitmentKey !== "string" || typeof feedbackId !== "string") return { ok: false, message: "잘못된 요청이에요" };
  return recommendFollowupQuestions(recruitmentKey, feedbackId);
}
