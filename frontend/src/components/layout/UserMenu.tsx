import { CoinsIcon } from "@phosphor-icons/react/ssr";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatCredits } from "@/lib/format";
import type { Session } from "@/lib/session";

export function UserMenu({ session }: { session: Session }) {
  if (session.user === null) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton href="/login" variant="ghost" size="sm">
          로그인
        </LinkButton>
        <LinkButton href="/signup" size="sm">
          회원가입
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <LinkButton href="/my/profile/edit" variant="ghost" size="sm" className="max-sm:hidden">
        내 정보
      </LinkButton>
      <LinkButton href="/my/credits" variant="secondary" size="sm">
        <CoinsIcon aria-hidden size={16} weight="bold" />
        {formatCredits(session.user.credits)}
      </LinkButton>
    </div>
  );
}
