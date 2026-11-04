import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/*
 * 로그인·회원가입의 바깥 틀. 본문 가운데 좁은 교정지 면 하나에 제목과 폼을 담는다.
 * 카드 아래(after)에는 시연 계정 안내 같은 보조 내용을 둔다.
 */

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  after?: ReactNode;
};

/** 제목·설명과 폼을 담는 가운데 카드 */
export function AuthCard({ title, description, children, after }: AuthCardProps) {
  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-6 rounded-2xl bg-surface-muted p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>
            <p className="text-sm text-text-muted">{description}</p>
          </div>
          {children}
        </div>
        {after}
      </div>
    </Container>
  );
}

/** 이메일 폼과 소셜 버튼 사이 구분선 */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-text-muted">
      <span aria-hidden className="h-px flex-1 bg-line" />
      또는
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

/** 폼을 그리기 전 자리. 칸 수만큼 입력 높이를 잡는다 */
export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="flex flex-col gap-5">
      {Array.from({ length: fields }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
