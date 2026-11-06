import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

const AGREEMENTS = [
  { name: "terms", label: "이용약관", href: "/terms" },
  { name: "privacy", label: "개인정보처리방침", href: "/privacy" },
] as const;

/** 가입 약관 동의(필수 두 개). 이메일 가입과 소셜 가입이 함께 쓴다. 서버는 terms·privacy가 "on"인지 본다 */
export function Agreements({ idPrefix, error }: { idPrefix: string; error?: string }) {
  const errorId = `${idPrefix}-agreements-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="flex flex-col gap-3 px-4">
      <legend className="sr-only">약관 동의</legend>
      {AGREEMENTS.map((agreement) => (
        <div key={agreement.name} className="flex items-center gap-3 text-sm">
          <input
            id={`${idPrefix}-${agreement.name}`}
            name={agreement.name}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            className="size-5 shrink-0 accent-accent"
          />
          <label htmlFor={`${idPrefix}-${agreement.name}`} className="font-semibold">
            {agreement.label} 동의(필수)
          </label>
          {/* 좁은 화면에서 줄이 넘치지 않게 보이는 글자는 "보기"만, 읽는 이름은 문서 이름까지 */}
          <Link
            href={agreement.href}
            target="_blank"
            aria-label={`${agreement.label} 보기`}
            className="ml-auto shrink-0 text-text-muted underline underline-offset-4"
          >
            보기
          </Link>
        </div>
      ))}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm font-semibold">
          <WarningCircleIcon aria-hidden size={16} weight="bold" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
