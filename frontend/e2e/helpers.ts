import type { BrowserContext } from "@playwright/test";

type DemoCookies = {
  role?: "guest" | "tester" | "developer" | "admin" | string;
  data?: "normal" | "single" | "empty" | "slow";
};

/** 시연용 쿠키(demo-role, demo-data)를 넣는다 */
export async function setDemo(context: BrowserContext, { role, data }: DemoCookies) {
  const cookies = [];
  if (role) cookies.push({ name: "demo-role", value: role, url: "http://localhost:3100" });
  if (data) cookies.push({ name: "demo-data", value: data, url: "http://localhost:3100" });
  await context.addCookies(cookies);
}
