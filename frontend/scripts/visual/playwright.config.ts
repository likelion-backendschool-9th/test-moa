import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/*
 * 화면 비교 전용 설정. compare.mjs가 기준·작업 두 서버를 띄운 뒤 이 설정으로 실행한다.
 * 기준 사진은 매 실행 새로 찍으므로 저장소에 두지 않는다.
 */
const frontend = path.resolve(__dirname, "../..");

export default defineConfig({
  testDir: __dirname,
  testMatch: "visual.spec.ts",
  outputDir: path.join(frontend, "test-results/visual/diff"),
  snapshotPathTemplate: path.join(frontend, "test-results/visual/base/{arg}{ext}"),
  fullyParallel: true,
  workers: 4,
  reporter: "list",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    /* 같은 화면을 두 번 찍어도 픽셀이 같도록 래스터를 결정적으로 만든다. 둥근 테두리의 안티에일리어싱이 실행마다 달랐다 */
    launchOptions: {
      args: ["--disable-gpu", "--disable-partial-raster", "--disable-skia-runtime-opts", "--force-color-profile=srgb", "--disable-lcd-text"],
    },
  },
});
