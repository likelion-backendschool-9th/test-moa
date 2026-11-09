import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import styles from "./Skeleton.module.css";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn(styles.root, className)} {...props} />;
}
