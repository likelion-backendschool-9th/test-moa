import { GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/Button";
import { socialLogin } from "../actions";
import { SOCIAL_PROVIDERS } from "../types";

/*
 * 소셜 로그인 버튼 목업. 제공자 목록(SOCIAL_PROVIDERS)대로 버튼이 생긴다.
 * 아이콘은 있으면 붙이는 장식이다. 목록에 제공자를 더해도 여기를 고치지 않아도 되고, 아이콘이 없으면 이름만 보인다.
 * 주 버튼은 이메일 폼의 제출 하나라 모두 보조 버튼이고, 브랜드 색은 쓰지 않는다.
 */

type IconProps = { size?: number; weight?: "bold"; "aria-hidden"?: boolean };

const ICONS: Partial<Record<string, ComponentType<IconProps>>> = {
  github: GithubLogoIcon,
  google: GoogleLogoIcon,
};

/** 제공자마다 폼 하나. 누르면 서버 액션이 로그인하고 next로 보낸다 */
export function SocialButtons({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-3">
      {SOCIAL_PROVIDERS.map((provider) => {
        const Icon = ICONS[provider.id];
        return (
          <form key={provider.id} action={socialLogin}>
            <input type="hidden" name="provider" value={provider.id} />
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="secondary" className="w-full">
              {Icon && <Icon aria-hidden size={20} weight="bold" />}
              {provider.label}
            </Button>
          </form>
        );
      })}
    </div>
  );
}
