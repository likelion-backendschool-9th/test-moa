// 프론트 src의 파일마다 "누가 쓰는지"를 계산한다. 점검 문서의 표는 모두 이 스크립트 결과다.
//
// 사용법 (저장소 최상위 폴더에서):
//   node frontend/scripts/structure/usage.mjs frontend                # 표(TSV). src를 쓰는 동안은 frontend/src
//   node frontend/scripts/structure/usage.mjs frontend/src --json     # JSON
//   node frontend/scripts/structure/usage.mjs frontend/src --who features/my/components/TodoList.tsx
//
// TSV 열: 파일, 줄 수, 실행 환경, 쓰는 라우트 수, 쓰는 라우트, 이 파일을 import하는 다른 폴더, 규칙으로 계산한 위치
//
// 계산 방법
// - import 경로(@/…, ./…)를 실제 파일로 풀어서 잇는다. 파일 이름만 비교하지 않는다(같은 이름 파일이 여러 기능에 있다).
// - import는 TypeScript 구문 트리에서 모은다. 정적 import·export … from·import type 말고도 동적 import(await import("…"),
//   next/dynamic 안의 import)와 타입 위치의 import("…")를 센다. 인자가 문자열이 아니라 경로를 알 수 없는 동적 import는
//   --check에서 R0 위반으로 보고한다. typescript는 검사할 src 옆의 node_modules에서 불러온다.
// - "쓰는 라우트"는 그 파일을 직접·간접으로 import하는 app/의 라우트 파일(page·layout·not-found·error·loading·template·
//   default·route, 메타데이터 이미지 등)이 속한 URL이다.
// - "규칙으로 계산한 위치"는 03-target-structure.md의 배치 규칙 P4~P6을 기계적으로 적용한 값이다.
//   화면 부품(.tsx, 그리고 components/ 아래 파일)에만 계산한다. 데이터·규칙 파일은 도메인으로 정하므로 "-"다.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/*
 * 넘긴 폴더가 앱 코드의 최상위다. src를 쓰면 frontend/src, 쓰지 않으면 frontend다.
 * frontend를 넘기면(package.json이 있으면) 앱 코드 폴더와 최상위 proxy.ts 같은 파일만 센다. node_modules·e2e·설정 파일은 세지 않는다.
 */
const given = path.resolve(process.argv[2] ?? ".");
/* frontend를 넘겼는데 아직 src를 쓰면 src로 내려간다 */
const root = fs.existsSync(path.join(given, "package.json")) && fs.existsSync(path.join(given, "src", "app")) ? path.join(given, "src") : given;
const isProjectRoot = fs.existsSync(path.join(root, "package.json"));
const APP_DIRS = ["app", "components", "features", "lib", "demo"];
const ROOT_FILES = /^(proxy|middleware|instrumentation|instrumentation-client)\.(ts|tsx)$/;
const projectDir = isProjectRoot ? root : path.join(root, "..");
let ts;
try {
  ts = createRequire(path.join(projectDir, "package.json"))("typescript");
} catch {
  console.error(`typescript를 찾지 못했다. ${projectDir}에서 npm install을 실행하거나, 이미 설치된 frontend/node_modules를 그 자리에 링크한다(docs/frontend-structure/README.md "직접 확인하는 방법")`);
  process.exit(2);
}
const mode = process.argv[3] ?? "--tsv";
const files = [];
(function walk(d, top) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!top || !isProjectRoot || APP_DIRS.includes(e.name)) walk(p, false);
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      if (!top || !isProjectRoot || ROOT_FILES.test(e.name)) files.push(p);
    }
  }
})(root, true);

const rel = (p) => path.relative(root, p).split(path.sep).join("/");
function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const x of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (fs.existsSync(base + x)) return base + x;
  throw new Error(`풀 수 없는 import: ${spec} (${rel(from)})`);
}

const info = {};
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const head = src.split("\n").slice(0, 3).join("\n");
  info[rel(f)] = {
    lines: src.split("\n").length,
    env: /^["']use client["']/m.test(head) ? "client" : /^["']use server["']/m.test(head) ? "use server" : /import ["']server-only["']/.test(src) ? "server-only" : "-",
    imports: [],
    importedBy: [],
  };
}
/** 파일 하나의 import 경로. 경로를 알 수 없는 동적 import는 unknown에 줄 번호로 남긴다 */
function specifiers(f, src) {
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const specs = [];
  const unknown = [];
  const lit = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);
  (function visit(n) {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) specs.push(lit(n.moduleSpecifier));
    else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) specs.push(lit(n.moduleReference.expression));
    else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument)) specs.push(lit(n.argument.literal));
    else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require"))) {
      const s = lit(n.arguments[0]);
      if (s) specs.push(s);
      else unknown.push(sf.getLineAndCharacterOfPosition(n.getStart()).line + 1);
    }
    ts.forEachChild(n, visit);
  })(sf);
  return { specs: specs.filter(Boolean), unknown };
}
const unresolved = [];
for (const f of files) {
  const { specs, unknown } = specifiers(f, fs.readFileSync(f, "utf8"));
  for (const line of unknown) unresolved.push(`${rel(f)}:${line}`);
  for (const spec of specs) {
    const r = resolve(f, spec);
    if (!r || !info[rel(r)]) continue; // 패키지, CSS·글꼴 같은 비코드 파일은 건너뛴다
    if (info[rel(f)].imports.includes(rel(r))) continue;
    info[rel(f)].imports.push(rel(r));
    info[rel(r)].importedBy.push(rel(f));
  }
}

/** URL 하나에 붙는 app 파일. 이 파일이 import하는 코드는 그 URL이 쓰는 코드다 */
const ROUTE_FILE = /\/(page|layout|template|loading|error|global-error|not-found|global-not-found|default|route|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.(ts|tsx)$/;

/** app 파일 → URL. 경로 그룹은 빼고, layout은 "레이아웃"을 붙인다 */
function routeOf(k) {
  const segments = k.split("/").slice(1, -1);
  const dir = segments.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("_")).join("/");
  const isRoot = segments.length === 0;
  const name = k.split("/").pop().replace(/\.(ts|tsx)$/, "");
  if (name === "layout") return isRoot ? "(루트 레이아웃)" : `/${dir} 레이아웃`;
  if (name === "page" || name === "route") return "/" + dir;
  /* 404·오류·메타데이터 파일. 앱 최상위 것은 홈(/)이 아니라 app 전체에 붙는다 */
  return isRoot ? `(루트 ${name})` : `/${dir} ${name}`;
}
/*
 * 라우트 파일마다 import를 앞으로 따라가며, 닿는 파일에 실제 라우트 파일 경로를 붙인다. 방문한 파일은 라우트마다 따로 기억하므로
 * 순환 import(lib/session.ts ↔ lib/demo-subscription.ts 같은)가 있어도 빠지는 경로가 없다.
 */
const routeSets = Object.fromEntries(Object.keys(info).map((k) => [k, new Set()]));
for (const start of Object.keys(info).filter((k) => k.startsWith("app/") && ROUTE_FILE.test(k))) {
  // URL이 같은 layout도 별개의 사용처로 유지한다.
  const route = start;
  const stack = [start];
  const seen = new Set(stack);
  while (stack.length) {
    const k = stack.pop();
    routeSets[k].add(route);
    for (const im of info[k].imports) {
      if (seen.has(im)) continue;
      seen.add(im);
      stack.push(im);
    }
  }
}
const routes = (k) => routeSets[k];

const owner = (k) => {
  const p = k.split("/");
  if (p[0] === "features") return "features/" + p[1];
  if (p[0] === "components") return p.length > 2 ? "components/" + p[1] : "components";
  return p[0];
};

/** 목표 구조에서 URL이 놓일 app 폴더 (03-target-structure.md "라우트 폴더") */
function targetFolder(route) {
  const r = route.replace(/ (레이아웃|[a-z-]+)$/, "");
  if (r.startsWith("(루트 ")) return "app";
  if (r === "/") return "app/(site)/(home)";
  if (/^\/(login|signup)(\/|$)/.test(r)) return "app/(site)/(auth)" + r;
  if (r.startsWith("/my/chats/[roomKey]")) return "app/(conversation)" + r;
  if (r.startsWith("/my/chats")) return "app/(site)" + r;
  if (r === "/my" || r.startsWith("/my/")) return "app/(site)/my/(account)" + r.slice(3);
  return "app/(site)" + r;
}

/** 실제 경로 그룹은 배치 계산에 남긴다. 그룹 없는 이전 구조만 목표 URL 배치를 사용한다. */
function placementFolder(routeFile) {
  const directory = routeFile.split("/").slice(0, -1);
  if (directory.some((segment) => /^\(.*\)$/.test(segment))) return directory.join("/");
  return targetFolder(routeOf(routeFile));
}

/** 문서 3.2의 구역. 같은 my 아래여도 계정 화면과 채팅함은 별도 구역이다. */
function sectionRoot(folder) {
  const segments = folder.split("/");
  if (segments[1] === "(conversation)") return segments.slice(0, 2).join("/");
  if (segments[1] === "(site)" && segments[2] === "my" && ["(account)", "chats"].includes(segments[3])) {
    return segments.slice(0, 4).join("/");
  }
  return segments.slice(0, 3).join("/");
}

/** P4~P6: 한 라우트 → 그 라우트, 한 구역 → 공통 조상, 여러 구역 → features 또는 components/ui */
function placeByRule(k, rs) {
  const isUi = k.endsWith(".tsx") || k.includes("/components/");
  if (!isUi || k.startsWith("app/")) return "-";
  if (rs.length === 0) return "(쓰는 곳 없음)";
  const routeFolders = rs.map(placementFolder);
  if (new Set(routeFolders.map(sectionRoot)).size > 1) return "여러 구역 공유";
  const folders = routeFolders.map((folder) => folder.split("/"));
  const common = [];
  for (let i = 0; i < folders[0].length; i++) {
    if (folders.every((f) => f[i] === folders[0][i])) common.push(folders[0][i]);
    else break;
  }
  const c = common.join("/");
  if (c === "app" && rs.length === 1) return "app/_components"; // 루트 레이아웃만 씀
  if (c === "app" || c === "app/(site)") return "여러 구역 공유";
  return c + "/_components";
}

const rows = Object.keys(info)
  .filter((k) => !k.startsWith("app/"))
  .sort()
  .map((k) => {
    const rs = [...routes(k)].sort();
    const foreign = [...new Set(info[k].importedBy.map(owner).filter((o) => o !== owner(k) && o !== "app"))];
    return { file: k, lines: info[k].lines, env: info[k].env, routeCount: rs.length, routes: rs.map(routeOf), importedFrom: foreign, rule: placeByRule(k, rs) };
  });

/**
 * --check: 목표 구조의 배치 규칙을 어긴 파일을 출력한다. 위반이 있으면 종료 코드 1, 없으면 0이다.
 *  R0 경로를 알 수 없는 동적 import(인자가 문자열이 아니다). 사용처를 계산할 수 없으므로 위반으로 본다
 *  R1 features/<도메인>/components 파일이 한 구역 안에서만 쓰인다 → 그 구역의 _components로
 *  R2 _components·_lib 파일을 그 폴더의 부모 경로 밖에서 import한다
 *  R3 components/ui 파일이 features·app·demo, 세션·쿠키를 import한다
 */
function check() {
  const out = unresolved.map((at) => `R0\t${at}\t경로를 알 수 없는 동적 import`);
  for (const r of rows) {
    if (/^features\/[^/]+\/components\//.test(r.file) && r.rule.endsWith("/_components")) {
      out.push(`R1\t${r.file}\t${r.routes.join(" ")}\t→ ${r.rule}`);
    }
  }
  for (const k of Object.keys(info)) {
    const m = k.match(/^(.*)\/_(components|lib)\//);
    if (m) for (const by of info[k].importedBy) if (!by.startsWith(m[1] + "/")) out.push(`R2\t${k}\t${by}가 import`);
    if (k.startsWith("components/ui/")) for (const im of info[k].imports) if (/^(features|app|demo)\//.test(im) || /^lib\/(session|backend|demo)/.test(im)) out.push(`R3\t${k}\t${im}을 import`);
  }
  console.log(out.join("\n") || "위반 없음");
  if (out.length > 0) process.exitCode = 1; // CI에서 위반이 있으면 실패하게 한다
}

if (mode === "--json") console.log(JSON.stringify({ info, rows }, null, 1));
else if (mode === "--check") check();
else if (mode === "--who") {
  const k = process.argv[4];
  console.log(`${k}\n직접 import: ${info[k].importedBy.join(", ") || "없음"}\n쓰는 라우트: ${[...routes(k)].join(", ") || "없음"}`);
} else for (const r of rows) console.log([r.file, r.lines, r.env, r.routeCount, r.routes.join(" "), r.importedFrom.join(" "), r.rule].join("\t"));
