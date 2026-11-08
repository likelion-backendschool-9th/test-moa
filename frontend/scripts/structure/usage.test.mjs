import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("../../", import.meta.url));
const script = fileURLToPath(new URL("usage.mjs", import.meta.url));
const component = "features/fixture/components/Probe/Probe.tsx";
const source = 'import { Probe } from "@/features/fixture/components/Probe/Probe"; export default Probe;';

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
  const run = fixture(t, { "app/(site)/(home)/page.tsx": "export const probe = () => import(`@/features/fixture/components/Probe/Probe`);" });
  const result = run("--json");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).rows.find(({ file }) => file === component).rule, "app/(site)/(home)/_components");
  const unknown = fixture(t, { "app/(site)/(home)/page.tsx": 'const part = "fixture"; export const probe = () => import(`@/features/${part}/components/Probe/Probe`);' });
  const check = unknown("--check");
  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stdout, /^R0\t/m);
});

/* 여러 구역이 쓰는 부품이라 R1에 걸리지 않는 기본 사용처 */
const shared = { "app/(site)/(home)/page.tsx": source, "app/(site)/admin/page.tsx": source };

test("#160-S9 부품 폴더와 토큰 값만 있으면 R4·R5 위반이 없다", (t) => {
  const run = fixture(t, { ...shared, "app/globals.css": ":root {\n  --space-3: 0.75rem;\n  --space-6: 1.5rem;\n}\n", "features/fixture/components/Probe/Probe.module.css": ".root {\n  gap: var(--space-3);\n  border-width: 1px;\n}\n\n@media (min-width: 48rem) {\n  .root {\n    padding: var(--space-6);\n  }\n}\n" });
  const check = run("--check");
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /위반 없음/);
});

test("#160-S10 폴더 없이 둔 부품은 R4로 막는다", (t) => {
  const run = fixture(t, { ...shared, "app/(site)/admin/_components/Foo.tsx": "export function Foo() { return null; }", "app/(site)/admin/_components/Bar/Baz.tsx": "export function Baz() { return null; }" });
  const check = run("--check");
  assert.equal(check.status, 1, check.stdout);
  assert.match(check.stdout, /^R4\tapp\/\(site\)\/admin\/_components\/Foo\.tsx\t/m);
  assert.match(check.stdout, /^R4\tapp\/\(site\)\/admin\/_components\/Bar\/Baz\.tsx\t/m);
});

test("#160-S13 모듈에 토큰 대신 쓴 값과 정하지 않은 너비는 R5로 막는다", (t) => {
  const css = ".root {\n  gap: 12px;\n  color: #fff;\n}\n\n@media (min-width: 50rem) {\n  .root {\n    gap: var(--space-2);\n  }\n}\n\n/* 너비 예외: 이유 */\n@media (max-width: 23.4rem) {\n  .root {\n    gap: 0;\n  }\n}\n";
  const run = fixture(t, { ...shared, "features/fixture/components/Probe/Probe.module.css": css });
  const check = run("--check");
  assert.equal(check.status, 1, check.stdout);
  assert.match(check.stdout, /^R5\tfeatures\/fixture\/components\/Probe\/Probe\.module\.css:2\tgap: 12px/m);
  assert.match(check.stdout, /^R5\t[^\n]*:3\tcolor: #fff/m);
  assert.match(check.stdout, /^R5\t[^\n]*:6\t@media \(min-width: 50rem\)/m);
  assert.doesNotMatch(check.stdout, /23\.4rem/);
});

test("R6 정의하지 않은 CSS 변수를 읽으면 막는다", (t) => {
  const run = fixture(t, { ...shared, "app/globals.css": ":root {\n  --space-2: 0.5rem;\n}\n", "features/fixture/components/Probe/Probe.module.css": ".root {\n  gap: var(--space-2);\n  aspect-ratio: var(--aspect-video);\n}\n" });
  const check = run("--check");
  assert.equal(check.status, 1, check.stdout);
  assert.match(check.stdout, /^R6\tfeatures\/fixture\/components\/Probe\/Probe\.module\.css:3\t--aspect-video/m);
  assert.doesNotMatch(check.stdout, /--space-2/);
});

test("R6 TSX style에서 따옴표로 정의한 변수는 정의로 센다", (t) => {
  const run = fixture(t, { ...shared, "app/(site)/admin/page.tsx": source + '\nexport const Grid = () => <ul style={{ "--columns": 3 } as React.CSSProperties} />;', "features/fixture/components/Probe/Probe.module.css": ".root {\n  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));\n}\n" });
  const check = run("--check");
  assert.equal(check.status, 0, check.stdout);
  assert.doesNotMatch(check.stdout, /--columns/);
});
