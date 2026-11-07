import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card/Card";
import styles from "./FormSection.module.css";

/** 긴 폼을 나누는 묶음. 제목 아래에 입력란을 놓는다 */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </Card>
  );
}
