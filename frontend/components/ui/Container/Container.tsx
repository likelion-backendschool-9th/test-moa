import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import styles from "./Container.module.css";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.root, className)} {...props} />;
}
