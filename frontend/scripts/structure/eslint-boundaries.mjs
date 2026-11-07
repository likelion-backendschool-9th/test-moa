// 목표 구조의 import 경계 규칙(B1~B7). frontend/eslint.config.mjs에 그대로 붙여 쓴다.
//
//   import { boundaries } from "./eslint-boundaries.mjs";   // 또는 이 배열을 config에 직접 넣는다
//   export default defineConfig([...nextVitals, ...nextTs, ...boundaries, globalIgnores([...])]);
//
// eslint-config-next가 eslint-plugin-import와 TypeScript 경로 해석기를 이미 등록하므로 설치할 것은 없다.
// 규칙 설명은 docs/frontend-structure/03-target-structure.md "import 경계"에 있다.

import fs from "node:fs";
import path from "node:path";
import importPlugin from "eslint-plugin-import";

/** 앱 코드 최상위. ESLint를 실행한 frontend 폴더에 src/app이 있으면 ./src, 없으면 . (zone 경로도 실행 폴더 기준이다) */
const R = fs.existsSync(path.join(process.cwd(), "src", "app")) ? "./src" : ".";

/** features 아래 도메인 폴더. 도메인을 더하면 여기에도 더한다 */
const DOMAINS = ["auth", "chat", "credit", "member", "participation", "project", "recruitment", "report", "session", "subscription"];

// eslint-plugin-import의 모듈 방문자는 동적 import·require의 Literal만 처리한다.
// 치환 없는 백틱은 같은 문자열 경로로 검사하되 원래 구문 트리는 수정하지 않는다.
const restrictedPaths = importPlugin.rules["no-restricted-paths"];
const templateImports = {
  meta: {
    ...restrictedPaths.meta,
    docs: { description: "백틱 동적 import·require에도 동일한 경로 경계를 적용한다" },
  },
  create(context) {
    const visitors = restrictedPaths.create(context);
    const literal = (source) => source?.type === "TemplateLiteral" && source.expressions.length === 0 && typeof source.quasis[0].value.cooked === "string"
      ? { ...source, type: "Literal", value: source.quasis[0].value.cooked }
      : null;
    return {
      ImportExpression(node) {
        const source = literal(node.source);
        if (source) visitors.ImportExpression({ ...node, source });
      },
      CallExpression(node) {
        if (node.callee.type !== "Import" && !(node.callee.type === "Identifier" && node.callee.name === "require")) return;
        if (node.arguments.length !== 1) return;
        const source = literal(node.arguments[0]);
        if (source) visitors.CallExpression({ ...node, arguments: [source] });
      },
    };
  },
};

const baseBoundaries = {
  plugins: { structure: { rules: { "template-import-boundaries": templateImports } } },
  files: R === "./src" ? ["src/**/*.{ts,tsx}"] : ["{app,components,features,lib,demo}/**/*.{ts,tsx}", "proxy.ts"],
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          {
            target: `${R}/components/ui`,
            from: [`${R}/app`, `${R}/features`, `${R}/demo`, `${R}/lib/backend.ts`],
            message: "B1 components/ui는 도메인·라우트·세션·시연 코드를 모른다",
          },
          {
            target: `${R}/lib`,
            from: [`${R}/app`, `${R}/features`, `${R}/components`, `${R}/demo`],
            message: "B2 lib는 도메인을 모른다",
          },
          { target: `${R}/features`, from: `${R}/app`, message: "B3 features는 app을 import하지 않는다" },
          {
            target: `${R}/features/session`,
            from: `${R}/features/!(session)/**`,
            message: "B6 session은 맨 아래 층이다. 다른 도메인을 import하지 않는다",
          },
          {
            target: `${R}/features/!(auth)/**`,
            from: `${R}/features/auth`,
            message: "B7 auth(로그인·가입·로그아웃)는 화면(app)만 쓴다. 세션·권한 확인은 features/session에서 가져온다",
          },
          ...DOMAINS.map((d) => ({
            target: `${R}/features/!(${d})/**`,
            from: `${R}/features/${d}/actions.ts`,
            message: `B5 다른 기능의 서버 액션(${d}/actions.ts)을 부르지 않는다. 화면(app)에서 부른다`,
          })),
        ],
      },
    ],
  },
};

const featuresPattern = R === "./src" ? "src/features" : "features";

export const boundaries = [
  baseBoundaries,
  {
    files: [`${featuresPattern}/**/*.{ts,tsx}`],
    // 허용 파일에서도 B1~B3·B5~B7은 위의 기본 설정으로 계속 검사한다.
    ignores: [`${featuresPattern}/*/api.ts`, `${featuresPattern}/session/session.ts`],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            ...baseBoundaries.rules["import/no-restricted-paths"][1].zones,
            {
              target: `${R}/features`,
              from: `${R}/demo`,
              message: "B4 시연 코드는 features/*/api.ts와 features/session/session.ts에서만 import한다",
            },
          ],
        },
      ],
    },
  },
].map((config) => ({
  ...config,
  rules: {
    ...config.rules,
    "structure/template-import-boundaries": config.rules["import/no-restricted-paths"],
  },
}));
