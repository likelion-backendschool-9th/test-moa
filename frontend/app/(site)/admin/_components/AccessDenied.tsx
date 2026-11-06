import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/LinkButton";

/** 로그인했지만 권한이 없는 페이지. ComingSoon과 같은 모양이다 */
export function AccessDenied({ pageName }: { pageName: string }) {
  return (
    <Container className="flex flex-col items-start gap-4 py-24">
      <p className="text-sm font-medium text-text-muted">{pageName}</p>
      <h1 className="text-3xl font-semibold tracking-tight">운영자만 볼 수 있는 페이지예요</h1>
      <p className="text-text-muted">운영자 계정으로 로그인하면 이 화면을 볼 수 있어요.</p>
      <LinkButton href="/" variant="secondary" className="mt-4">
        홈으로
      </LinkButton>
    </Container>
  );
}
