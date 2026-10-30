import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** 배너 제목. 강조는 굵기와 크기로만 하고 그라데이션 글자는 쓰지 않는다 */
export function DisplayHeading({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("max-w-2xl text-4xl font-extrabold tracking-[-0.035em] md:text-5xl", className)}
      {...props}
    />
  );
}
