import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import type { Profile } from "@/features/member/types";
import { cardClass } from "../card-styles";

/** 이름·닉네임·이메일. 개발자와 테스터는 한 계정이라 회원 유형은 표시하지 않는다 */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const rows = [
    { label: "이름", value: profile.name },
    { label: "닉네임", value: profile.nickname },
    { label: "이메일", value: profile.email },
  ];
  return (
    <section aria-label="내 정보" className={cardClass}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <dl className="grid gap-3 sm:grid-cols-3 sm:gap-8">
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-text-muted">{row.label}</dt>
              <dd className="truncate text-lg font-extrabold tracking-[-0.02em]">{row.value}</dd>
            </div>
          ))}
        </dl>
        <LinkButton href="/my/profile/edit" variant="secondary" size="sm" className="self-start">
          개인정보 수정
        </LinkButton>
      </div>
    </section>
  );
}
