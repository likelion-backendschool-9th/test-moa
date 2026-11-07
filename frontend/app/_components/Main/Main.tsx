import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";
import styles from "./Main.module.css";

/** 본문 랜드마크와 본문 건너뛰기의 도착점. 서버 전용 코드를 import하지 않는다. */
export function Main({ className, ...props }: ComponentProps<"main">) {
  return <main {...props} id="main" tabIndex={-1} className={cn(styles.root, className)} />;
}
