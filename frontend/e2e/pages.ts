/*
 * 페이지 목록. pages.spec.ts(좁은 화면 넘침·권한)와 scripts/visual(화면 비교)이 함께 쓴다.
 * 새 페이지를 만들면 이 목록에 한 줄 더한다.
 */

export type Role = "guest" | "tester" | "developer" | "admin";

/** 페이지와 그 페이지를 볼 수 있는 역할 */
export const PAGES: [path: string, role: Role][] = [
  ["/", "guest"],
  ["/login", "guest"],
  ["/signup", "guest"],
  ["/signup/social", "guest"],
  ["/my", "tester"],
  ["/my/credits", "tester"],
  ["/recruitments/booklog", "guest"],
  ["/my/credits/withdrawals", "tester"],
  ["/my/profile/edit", "tester"],
  ["/subscription", "guest"],
  ["/my/subscription", "developer"],
  ["/my/subscription/checkout", "developer"],
  ["/my/subscription/checkout/result", "developer"],
  ["/my/subscription/checkout/toss", "developer"],
  ["/my/subscription/checkout/complete", "developer"],
  ["/my/chats", "tester"],
  ["/my/chats/booklog-yunseul", "tester"],
  ["/testers/recruitments", "tester"],
  ["/testers/recruitments/p-meeting-notes", "tester"],
  ["/developer/projects", "developer"],
  ["/developer/projects/new", "developer"],
  ["/developer/projects/booklog", "developer"],
  ["/developer/projects/booklog/edit", "developer"],
  ["/developer/recruitments/new?project=booklog", "developer"],
  ["/developer/recruitments/folio-builder", "developer"],
  ["/admin", "admin"],
  ["/admin/reports", "admin"],
  ["/admin/reports/report-1", "admin"],
  ["/admin/withdrawals", "admin"],
  ["/admin/withdrawals?open=withdrawal-1", "admin"],
  ["/admin/users", "admin"],
  ["/admin/users/user-1", "admin"],
  ["/admin/subscriptions", "admin"],
  ["/admin/plans", "admin"],
];
