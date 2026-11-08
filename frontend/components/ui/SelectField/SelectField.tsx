import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import styles from "./SelectField.module.css";

/** 펼친 목록까지 칸 모양을 맞춘 선택 상자. 칸의 크기와 바탕은 부르는 쪽이 정한다 */
export function SelectField({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cn(styles.root, className)} />;
}
