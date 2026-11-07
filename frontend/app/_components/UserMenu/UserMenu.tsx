import { CoinsIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button/Button";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { logout } from "@/features/auth/actions";
import { formatNumber } from "@/lib/format";
import type { Session } from "@/features/session/session";
import { MyPageLink } from "../MyPageLink/MyPageLink";
import styles from "./UserMenu.module.css";

/*
 * 헤더 오른쪽 계정 영역. 비로그인은 로그인·회원가입, 로그인하면 보유 크레딧·마이페이지·로그아웃.
 * 바탕색이 있는 크레딧을 앞에, 글자 버튼인 마이페이지·로그아웃을 나란히 둔다.
 * 좁은 화면(768px 미만)에서는 마이페이지·로그아웃을 모바일 메뉴 패널로 옮기고 크레딧만 남긴다.
 */
export function UserMenu({ session }: { session: Session }) {
  if (session.user === null) {
    return (
      <div className={styles.root}>
        <LinkButton href="/login" variant="ghost" size="sm" className={styles.button}>
          로그인
        </LinkButton>
        <LinkButton href="/signup" size="sm" className={styles.button2}>
          회원가입
        </LinkButton>
      </div>
    );
  }

  const credits = formatNumber(session.user.credits);
  return (
    <div className={styles.root2}>
      {/* 화면에는 동전 아이콘과 숫자만 보이고, 읽는 이름과 마우스 안내는 "보유 크레딧 12,480"이다 */}
      <LinkButton
        href="/my/credits"
        variant="secondary"
        size="sm"
        aria-label={`보유 크레딧 ${credits}`}
        title={`보유 크레딧 ${credits}`}
        className={styles.button3}
      >
        <CoinsIcon aria-hidden size={16} weight="bold" />
        {credits}
      </LinkButton>
      <MyPageLink className={styles.myPageLink} />
      <form action={logout} className={styles.form}>
        <Button type="submit" variant="ghost" size="sm" className={styles.button4}>
          로그아웃
        </Button>
      </form>
    </div>
  );
}
