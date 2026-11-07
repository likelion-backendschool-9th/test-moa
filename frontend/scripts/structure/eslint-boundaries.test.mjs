import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const cwd = fileURLToPath(new URL("../../", import.meta.url));
const eslint = new ESLint({ cwd });
const blocked = [
  "features/recruitment/BoundaryProbe.ts",
  "features/recruitment/BoundaryProbe.tsx",
  "features/recruitment/helpers/rules.ts",
  "features/recruitment/helpers/Widget.tsx",
  "features/recruitment/helpers/api.ts",
  "features/recruitment/api.tsx",
  "features/recruitment/session.ts",
  "features/session/helpers/rules.ts",
  "features/session/helpers/api.ts",
  "features/session/session.tsx",
  "features/new-domain/helpers/rules.ts",
];

async function messages(filePath, specifier) {
  const [result] = await eslint.lintText(
    `import * as imported from "${specifier}";\nexport const probe = imported;\n`,
    { filePath: path.join(cwd, filePath) },
  );
  return result.messages;
}

for (const file of blocked) {
  test(`B4 ${file}의 시연 직접 참조를 차단한다`, async () => {
    const relative = path.relative(path.dirname(file), "demo/mode").split(path.sep).join("/");
    for (const specifier of ["@/demo/mode", relative]) {
      const result = await messages(file, specifier);
      assert.ok(result.some(({ message }) => message.includes("B4")), `${file}: ${specifier}`);
    }
  });
}

for (const file of ["features/recruitment/api.ts", "features/session/api.ts", "features/session/session.ts", "features/new-domain/api.ts"]) {
  test(`B4 ${file}의 시연 데이터 접근을 허용한다`, async () => {
    assert.deepEqual(await messages(file, "@/demo/mode"), []);
  });
}

for (const [rule, file, imported] of [
  ["B1", "components/ui/BoundaryProbe.tsx", "features/member/types"],
  ["B2", "lib/BoundaryProbe.ts", "features/member/types"],
  ["B3", "features/credit/BoundaryProbe.ts", "app/_components/Main/Main"],
  ["B5", "features/credit/BoundaryProbe.tsx", "features/member/actions"],
  ["B6", "features/session/session.ts", "features/member/types"],
  ["B7", "features/credit/api.ts", "features/auth/types"],
]) {
  test(`${rule} B4 예외와 함께 기존 경계도 유지한다`, async () => {
    const result = await messages(file, `@/${imported}`);
    assert.ok(result.some(({ message }) => message.includes(rule)), `${rule}: ${file}`);
  });
}

for (const [rule, file, imported] of [
  ["B1", "components/ui/BoundaryProbe.tsx", "features/member/types"],
  ["B2", "lib/BoundaryProbe.ts", "features/member/types"],
  ["B3", "features/credit/BoundaryProbe.ts", "app/_components/Main/Main"],
  ["B4", "features/recruitment/helpers/BoundaryProbe.tsx", "demo/mode"],
  ["B5", "features/credit/BoundaryProbe.tsx", "features/member/actions"],
  ["B6", "features/session/session.ts", "features/member/types"],
  ["B7", "features/credit/api.ts", "features/auth/types"],
]) {
  test(`${rule} 문자열·백틱 동적 import와 require에 같은 경계를 적용한다`, async () => {
    const relative = path.relative(path.dirname(file), imported).split(path.sep).join("/");
    for (const specifier of [`@/${imported}`, relative]) {
      for (const quote of ["\"", "`"]) {
        for (const operation of ["import", "require"]) {
          const code = `export const probe = () => ${operation}(${quote}${specifier}${quote});`;
          const [result] = await eslint.lintText(code, { filePath: path.join(cwd, file) });
          assert.ok(result.messages.some(({ message }) => message.includes(rule)), code);
        }
      }
    }
  });
}

for (const file of ["features/recruitment/api.ts", "features/session/session.ts"]) {
  test(`B4 ${file}에서는 문자열·백틱 동적 import를 허용한다`, async () => {
    for (const quote of ["\"", "`"]) {
      const [result] = await eslint.lintText(`export const probe = () => import(${quote}@/demo/mode${quote});`, { filePath: path.join(cwd, file) });
      assert.deepEqual(result.messages, []);
    }
  });
}
