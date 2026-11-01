/** 마이페이지 요약 카드. DESIGN.md의 패널(교정지 면, 16px, 안쪽 24px / md 32px)을 따른다 */
export const cardClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

export const cardTitleClass = "text-lg font-extrabold";

/** 제목과 행동 버튼을 한 줄에 둔다 */
export const cardHeaderClass = "flex flex-wrap items-center justify-between gap-3";

/*
 * 설정 화면(개인정보 수정). 한 장의 면을 줄로 나누고, 넓은 화면에서는 제목·설명을 왼쪽 1/3, 칸을 오른쪽 2/3에 둔다.
 * 칸이 화면 너비만큼 늘어나 빈 곳이 생기지 않게 칸은 한 열로 쌓는다
 */
export const settingsCardClass = "flex flex-col divide-y divide-line rounded-2xl bg-surface-muted";

export const settingsSectionClass = "grid gap-6 p-6 md:p-8 lg:grid-cols-3 lg:gap-8";

/** 오른쪽 2/3 칸 묶음 */
export const settingsBodyClass = "flex flex-col gap-5 lg:col-span-2";
