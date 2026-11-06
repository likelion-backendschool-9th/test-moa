/*
 * 서버 액션 폼의 제출 상태. 검사 규칙과 따로 두어 여러 기능의 폼이 함께 쓴다.
 */

/** 제출 전, 칸별·폼 전체 오류, 성공 문구. submittedAt은 같은 문구의 성공이 이어져도 새 응답으로 알아보게 한다 */
export type FormState<Field extends string> =
  | { status: "idle" }
  | { status: "error"; errors: Partial<Record<Field | "form", string>> }
  | { status: "success"; message: string; submittedAt: number };
