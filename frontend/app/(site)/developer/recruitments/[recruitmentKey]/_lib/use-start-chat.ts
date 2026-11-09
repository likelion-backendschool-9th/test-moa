"use client";

import { unstable_rethrow } from "next/navigation";
import { useRef, useTransition } from "react";
import { startChatAction } from "@/features/chat/actions";
import { toChatStartFailureMessage } from "@/features/chat/backend-map";
import { recruitmentManagePath } from "@/features/project/paths";

/** 모집 관리에서 채팅을 여는 동안 연속 클릭을 막고, 실패는 요청한 화면에 돌려준다 */
export function useStartChat(recruitmentKey: string) {
  const [isPending, startTransition] = useTransition();
  const starting = useRef(false);

  function start(registerId: string, onFailure: (message: string) => void) {
    if (starting.current) return;
    starting.current = true;
    startTransition(async () => {
      try {
        const result = await startChatAction(registerId, recruitmentManagePath(recruitmentKey));
        if (!result.ok) onFailure(result.message);
      } catch (caught) {
        unstable_rethrow(caught);
        onFailure(toChatStartFailureMessage("BACKEND_UNAVAILABLE"));
      } finally {
        starting.current = false;
      }
    });
  }

  return { start, isPending };
}
