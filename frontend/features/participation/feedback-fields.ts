import { checkFeedbackImages, parseFileMeta } from "@/features/participation/feedback-images";
import { FEEDBACK_MAX_LENGTH, type FeedbackEntry, type FeedbackTestItem } from "@/features/participation/types";

/*
 * 항목별 피드백 칸의 이름과 제출 값 검사.
 * 칸 목록은 폼이 보낸 값이 아니라 서버의 테스트 항목으로 만들어, 없는 항목에 저장되지 않게 한다.
 */

/** 기타 의견 칸의 키. 테스트 항목 id와 겹치지 않는다 */
export const OTHER_FEEDBACK_KEY = "other";

export const contentFieldName = (key: string) => `content-${key}`;
export const imagesFieldName = (key: string) => `imagesMeta-${key}`;

/** 칸 키별 오류 문구. 오류가 있으면 저장하지 않는다 */
export type FeedbackFieldErrors = Record<string, string>;

/** 테스트 항목 칸 다음에 기타 의견 칸을 두고, 내용을 적은 칸만 저장할 값으로 모은다 */
export function parseFeedbackForm(testItems: FeedbackTestItem[], formData: FormData): { errors: FeedbackFieldErrors; entries: FeedbackEntry[] } {
  const fields = [...testItems.map((item) => ({ key: item.id, testItemId: item.id as string | null, required: item.required })), { key: OTHER_FEEDBACK_KEY, testItemId: null, required: false }];
  const errors: FeedbackFieldErrors = {};
  const entries: FeedbackEntry[] = [];

  for (const { key, testItemId, required } of fields) {
    const content = String(formData.get(contentFieldName(key)) ?? "").trim();
    const images = parseFileMeta(formData.get(imagesFieldName(key)));
    const problem = images ? checkFeedbackImages(images) : "이미지 정보를 읽지 못했어요. 이미지를 다시 골라 주세요";

    if (content.length > FEEDBACK_MAX_LENGTH) errors[key] = `${FEEDBACK_MAX_LENGTH}자까지 적을 수 있어요`;
    else if (!content && required) errors[key] = "피드백을 적어 주세요";
    else if (problem) errors[key] = problem;
    else if (!content && images?.length) errors[key] = "내용을 적어야 이미지를 넣을 수 있어요";
    else if (content) entries.push({ testItemId, content, imageNames: (images ?? []).map((image) => image.name) });
  }

  /* 모두 선택 항목이어도 빈 피드백은 제출하지 않는다 */
  if (entries.length === 0 && Object.keys(errors).length === 0) errors[fields[0].key] = "피드백을 적어 주세요";
  return { errors, entries };
}
