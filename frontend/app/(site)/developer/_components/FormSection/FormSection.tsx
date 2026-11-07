import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card/Card";

/** 긴 폼을 나누는 묶음. 제목 아래에 입력란을 놓는다 */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}
