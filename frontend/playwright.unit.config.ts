import { defineConfig } from "@playwright/test";

// 기존 TS 변환과 경로 별칭을 재사용한다. 브라우저 fixture와 webServer는 사용하지 않는다.
export default defineConfig({
  testDir: "./tests/unit",
  testMatch: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 2,
  reporter: "list",
  outputDir: "./test-results/unit",
});
