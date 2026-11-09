"use client";

import { type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button/Button";

/** 보내는 동안 눌리지 않는 제출 버튼. 제재·해제를 두 번 눌러 두 건이 생기지 않게 한다 */
export function PendingButton({ pendingText, children, ...props }: ComponentProps<typeof Button> & { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
