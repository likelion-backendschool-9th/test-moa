import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/LinkButton";

/** 아직 만들지 않은 페이지. 홈의 링크가 404로 끝나지 않게 한다. */
export function ComingSoon({ pageName }: { pageName: string }) {
  return (
    <Container className="flex flex-col items-start gap-4 py-24">
      <p className="text-sm font-medium text-text-muted">{pageName}</p>
      <h1 className="text-3xl font-semibold tracking-tight">준비 중인 페이지예요</h1>
      <p className="text-text-muted">이 화면은 다음 작업에서 만들 예정이에요.</p>
      <LinkButton href="/" variant="secondary" className="mt-4">
        홈으로
      </LinkButton>
    </Container>
  );
}
