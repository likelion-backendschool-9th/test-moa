"use client";

import { useRouter } from "next/navigation";

type Option = { value: string; label: string };

type DemoSwitcherProps = {
  role: string;
  data: string;
  /** 실제 로그인일 때: 비로그인·운영자는 고를 수 없고 테스터·개발자 화면만 고른다 */
  personaOnly?: boolean;
};

const ROLE_OPTIONS: Option[] = [
  { value: "guest", label: "비로그인" },
  { value: "tester", label: "테스터" },
  { value: "developer", label: "개발자" },
  { value: "admin", label: "운영자" },
];

const DATA_OPTIONS: Option[] = [
  { value: "normal", label: "기본" },
  { value: "single", label: "구독 모집 1개" },
  { value: "empty", label: "모집 글 없음" },
  { value: "slow", label: "느린 응답" },
];

/** 개발 환경에서만 보이는 시연용 상태 전환기 */
export function DemoSwitcher({ role, data, personaOnly = false }: DemoSwitcherProps) {
  const router = useRouter();

  function update(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
      <span>시연용</span>
      <label className="flex items-center gap-2">
        역할
        <select
          defaultValue={role}
          onChange={(event) => update("demo-role", event.target.value)}
          className="rounded-md bg-surface-strong px-2 py-1 text-text"
        >
          {ROLE_OPTIONS.filter((option) => !personaOnly || option.value === "tester" || option.value === "developer").map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        데이터
        <select
          defaultValue={data}
          onChange={(event) => update("demo-data", event.target.value)}
          className="rounded-md bg-surface-strong px-2 py-1 text-text"
        >
          {DATA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
