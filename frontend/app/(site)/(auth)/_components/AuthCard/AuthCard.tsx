import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container/Container";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Card } from "@/components/ui/Card/Card";
import styles from "./AuthCard.module.css";

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
    <Container className={styles.root}>
      <div className={styles.box}>
        <Card as="div" className={styles.box2}>
          <div className={styles.box3}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>
          {children}
        </Card>
        {after}
      </div>
    </Container>
  );
}

/** 이메일 폼과 소셜 버튼 사이 구분선 */
export function OrDivider() {
  return (
    <div className={styles.orDivider}>
      <span aria-hidden className={styles.orDividerLabel} />
      또는
      <span aria-hidden className={styles.orDividerLabel2} />
    </div>
  );
}

/** 폼을 그리기 전 자리. 칸 수만큼 입력 높이를 잡는다 */
export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className={styles.authFormSkeleton}>
      {Array.from({ length: fields }, (_, index) => (
        <Skeleton key={index} className={styles.authFormSkeleton2} />
      ))}
      <Skeleton className={styles.authFormSkeletonSkeleton} />
    </div>
  );
}
