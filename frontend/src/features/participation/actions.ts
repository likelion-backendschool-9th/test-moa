"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getParticipation } from "./api";
import { saveDemoFeedback } from "./demo-feedback";
import {
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  parseParticipationTab,
  parseParticipationView,
  participationPath,
} from "./types";
import { saveParticipationView } from "./view-preference";

/*
 * 피드백 제출. 지금은 목업이라 입력을 검사한 뒤 시연용 쿠키(demo-feedback.ts)에 남긴다.
 * 실제 API를 붙일 때는 saveDemoFeedback 대신 제출을 저장한다.
 */

export type FeedbackFormState = { status: "idle" } | { status: "error"; error: string };

export async function submitFeedback(
  participationKey: string,
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const path = participationPath(participationKey);
  await requireMember(path);
  const item = await getParticipation(participationKey);
  if (!item || item.status !== "beforeSubmit") return { status: "error", error: "피드백을 제출할 수 없는 참여예요" };
  if (new Date(item.recruitment.submitDeadline) <= new Date()) return { status: "error", error: "피드백 제출 마감이 지났어요" };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { status: "error", error: "피드백을 적어 주세요" };
  if (content.length < FEEDBACK_MIN_LENGTH) return { status: "error", error: `${FEEDBACK_MIN_LENGTH}자 이상 적어 주세요` };
  if (content.length > FEEDBACK_MAX_LENGTH) return { status: "error", error: `${FEEDBACK_MAX_LENGTH}자까지 적을 수 있어요` };

  if (!(await saveDemoFeedback(participationKey, content))) {
    return { status: "error", error: "시연용 저장 한도를 넘어 제출하지 못했어요. 내용을 줄여 다시 제출해 주세요" };
  }
  /* 목록의 탭 개수·다음 할 일·요약 줄도 제출을 반영하게 한다 */
  revalidatePath("/my/participations", "layout");
  redirect(`${path}?notice=submitted`);
}

/**
 * 목록 보기 방식을 저장하고 같은 탭으로 돌아간다. JS 번들을 받기 전에 누르면 폼이 POST로 제출되는데,
 * 리다이렉트 없는 서버 액션의 POST 응답에는 페이지 본문이 없어 빈 화면이 된다. 방문 기록은 늘리지 않는다.
 */
export async function setParticipationView(formData: FormData) {
  await saveParticipationView(parseParticipationView(formData.get("view")));
  const tab = formData.get("tab");
  const path = typeof tab === "string" ? `/my/participations?tab=${parseParticipationTab(tab)}` : "/my/participations";
  redirect(path, RedirectType.replace);
}
