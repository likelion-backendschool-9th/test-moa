import { Container } from "@/components/ui/Container/Container";
import { AccountNav } from "@/app/(site)/my/(account)/_components/AccountNav/AccountNav";

/* 마이페이지 하위 페이지 공통 틀. 참여 테스트·내 프로젝트·채팅은 이 그룹 밖이라 메뉴가 없다 */
export default function AccountLayout({ children }: LayoutProps<"/my">) {
  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AccountNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </Container>
  );
}
