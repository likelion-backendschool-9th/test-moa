import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/LinkButton";

export default function NotFoundContent() {
  return (
    <Container className="flex flex-col items-start gap-4 py-24">
      <p className="text-sm font-medium text-text-muted">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">찾는 페이지가 없어요</h1>
      <p className="text-text-muted">주소가 바뀌었거나 삭제된 페이지예요. 홈에서 다시 찾아 주세요.</p>
      <LinkButton href="/" variant="secondary" className="mt-4">
        홈으로
      </LinkButton>
    </Container>
  );
}
