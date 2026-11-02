import { CoinsIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { logout } from "@/features/auth/actions";
import { formatNumber } from "@/lib/format";
import type { Session } from "@/lib/session";
import { MyPageLink } from "./MyPageLink";

/*
 * 헤더 오른쪽 계정 영역. 비로그인은 로그인·회원가입, 로그인하면 보유 크레딧·마이페이지·로그아웃.
 * 바탕색이 있는 크레딧을 앞에, 글자 버튼인 마이페이지·로그아웃을 나란히 둔다.
 * 좁은 화면(768px 미만)에서는 마이페이지·로그아웃을 모바일 메뉴 패널로 옮기고 크레딧만 남긴다.
 */
export function UserMenu({ session }: { session: Session }) {
  if (session.user === null) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton href="/login" variant="ghost" size="sm" className="whitespace-nowrap">
          로그인
        </LinkButton>
        <LinkButton href="/signup" size="sm" className="whitespace-nowrap">
          회원가입
        </LinkButton>
      </div>
    );
  }

  const credits = formatNumber(session.user.credits);
  return (
    <div className="flex items-center gap-2">
      {/* 화면에는 동전 아이콘과 숫자만 보이고, 읽는 이름과 마우스 안내는 "보유 크레딧 12,480"이다 */}
      <LinkButton
        href="/my/credits"
        variant="secondary"
        size="sm"
        aria-label={`보유 크레딧 ${credits}`}
        title={`보유 크레딧 ${credits}`}
        className="whitespace-nowrap tabular-nums"
      >
        <CoinsIcon aria-hidden size={16} weight="bold" />
        {credits}
      </LinkButton>
      <MyPageLink className="max-md:hidden" />
      <form action={logout} className="max-md:hidden">
        <Button type="submit" variant="ghost" size="sm" className="whitespace-nowrap">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
