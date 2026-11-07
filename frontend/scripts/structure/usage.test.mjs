import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("../../", import.meta.url));
const script = fileURLToPath(new URL("usage.mjs", import.meta.url));
const component = "features/fixture/components/Probe.tsx";
const source = 'import { Probe } from "@/features/fixture/components/Probe"; export default Probe;';

function fixture(t, routes, { src = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "moa-usage-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  fs.symlinkSync(path.join(frontend, "node_modules"), path.join(dir, "node_modules"), "dir");
  const root = src ? path.join(dir, "src") : dir;
  for (const [file, content] of Object.entries({ [component]: "export function Probe() { return null; }", ...routes })) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return (mode) => spawnSync(process.execPath, [script, dir, mode], { encoding: "utf8" });
}

for (const src of [false, true]) {
  test(`R1 홈 layout과 page만 쓰는 부품을 홈 전용으로 판정한다 (${src ? "src" : "최상위"})`, (t) => {
    const run = fixture(t, { "app/layout.tsx": "export default function Layout() {}", "app/(site)/(home)/layout.tsx": source, "app/(site)/(home)/page.tsx": source }, { src });
    const result = run("--json");
    assert.equal(result.status, 0, result.stderr);
    const row = JSON.parse(result.stdout).rows.find(({ file }) => file === component);
    assert.equal(row.rule, "app/(site)/(home)/_components");
    assert.equal(row.routeCount, 2);
    const check = run("--check");
    assert.equal(check.status, 1, check.stderr);
    assert.match(check.stdout, /^R1\t/m);
  });
}

for (const [name, routes, expected] of [
  ["홈 layout만 사용", { "app/(site)/(home)/layout.tsx": source, "app/(site)/(home)/page.tsx": "export default function Page() { return null; }" }, "app/(site)/(home)/_components"],
  ["홈 not-found와 page가 사용", { "app/(site)/(home)/not-found.tsx": source, "app/(site)/(home)/page.tsx": source }, "app/(site)/(home)/_components"],
  ["루트 layout과 홈 page가 공유", { "app/layout.tsx": source, "app/(site)/(home)/page.tsx": source }, "여러 구역 공유"],
  ["site layout과 홈 page가 공유", { "app/(site)/layout.tsx": source, "app/(site)/(home)/page.tsx": source }, "여러 구역 공유"],
  ["URL이 같은 다른 그룹의 layout이 공유", { "app/(site)/(home)/layout.tsx": source, "app/(site)/(auth)/layout.tsx": source }, "여러 구역 공유"],
  ["홈과 운영자 페이지가 공유", { "app/(site)/(home)/page.tsx": source, "app/(site)/admin/page.tsx": source }, "여러 구역 공유"],
  ["계정 화면과 채팅함이 공유", { "app/(site)/my/(account)/profile/edit/page.tsx": source, "app/(site)/my/chats/page.tsx": source }, "여러 구역 공유"],
  ["계정과 채팅함 layout이 공유", { "app/(site)/my/(account)/layout.tsx": source, "app/(site)/my/chats/layout.tsx": source }, "여러 구역 공유"],
  ["계정 구역 안의 두 화면이 사용", { "app/(site)/my/(account)/credits/page.tsx": source, "app/(site)/my/(account)/profile/edit/page.tsx": source }, "app/(site)/my/(account)/_components"],
  ["채팅함 구역 안의 layout과 page가 사용", { "app/(site)/my/chats/layout.tsx": source, "app/(site)/my/chats/page.tsx": source }, "app/(site)/my/chats/_components"],
  ["개발자 구역 안의 프로젝트와 모집 화면이 사용", { "app/(site)/developer/projects/page.tsx": source, "app/(site)/developer/recruitments/new/page.tsx": source }, "app/(site)/developer/_components"],
  ["계정 화면과 대화방이 공유", { "app/(site)/my/(account)/page.tsx": source, "app/(conversation)/my/chats/[roomKey]/page.tsx": source }, "여러 구역 공유"],
  ["그룹 없는 이전 구조의 홈", { "app/page.tsx": source }, "app/(site)/(home)/_components"],
]) {
  test(`R1 ${name}`, (t) => {
    const run = fixture(t, routes);
    const result = run("--json");
    assert.equal(result.status, 0, result.stderr);
    const row = JSON.parse(result.stdout).rows.find(({ file }) => file === component);
    assert.equal(row.rule, expected);
    const check = run("--check");
    assert.equal(check.status, expected.endsWith("/_components") ? 1 : 0, check.stderr);
  });
}

test("R0 백틱 상수 경로는 사용처에 포함하고 계산할 수 없는 경로는 차단한다", (t) => {
  const run = fixture(t, { "app/(site)/(home)/page.tsx": "export const probe = () => import(`@/features/fixture/components/Probe`);" });
  const result = run("--json");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).rows.find(({ file }) => file === component).rule, "app/(site)/(home)/_components");
  const unknown = fixture(t, { "app/(site)/(home)/page.tsx": 'const part = "fixture"; export const probe = () => import(`@/features/${part}/components/Probe`);' });
  const check = unknown("--check");
  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stdout, /^R0\t/m);
});
