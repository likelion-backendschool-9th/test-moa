"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** 송금할 때 계좌번호를 옮겨 적지 않게 복사한다. 클립보드를 쓸 수 없으면 실패를 알린다 */
export function CopyAccountButton({ accountNumber }: { accountNumber: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <Button variant="secondary" size="sm" onClick={copy}>
        계좌번호 복사
      </Button>
      <span role="status" className="text-xs text-text-muted">
        {state === "copied" && "복사했어요"}
        {state === "failed" && "복사하지 못했어요. 직접 선택해 주세요"}
      </span>
    </span>
  );
}
