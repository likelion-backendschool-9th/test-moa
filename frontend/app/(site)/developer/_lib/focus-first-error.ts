import { useEffect, useRef } from "react";
import type { FormState } from "@/features/project/types";

/** 서버 검증 결과가 바뀌면 첫 오류 칸으로 포커스를 옮긴다. 모집 작성 폼도 같이 쓴다 */
export function useFocusFirstError(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  return formRef;
}
