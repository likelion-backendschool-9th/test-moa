#!/usr/bin/env node
// 화면 비교 (#160-R2). 기준 커밋과 지금 코드를 같은 환경에서 빌드·실행하고, 모든 화면을 찍어 픽셀 단위로 비교한다.
//
//   npm run test:visual                      기준은 origin/develop
//   npm run test:visual -- --base de19224    기준 커밋을 고른다
//   npm run test:visual -- --no-build        지금 코드를 다시 빌드하지 않는다 (방금 빌드했을 때)
//   npm run test:visual -- --grep /my/chats  Playwright에 넘긴다 (--grep, --repeat-each)
//
// 기준 커밋은 임시 폴더에 worktree로 꺼내 빌드하고, 같은 커밋이면 다음 실행에서 다시 쓴다.
// 결과: 차이가 있으면 종료 코드 1, 차이 이미지는 test-results/visual/diff/에 남는다.
// 배포와 같은 Linux에서 돌린다: CI의 frontend-visual 작업, 또는 Playwright 공식 이미지.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const frontend = path.resolve(import.meta.dirname, "../..");
const repo = execFileSync("git", ["-C", frontend, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const ref = option("--base") ?? "origin/develop";
const buildHead = !args.includes("--no-build");
const passThrough = ["--grep", "--repeat-each"].flatMap((name) => (option(name) === undefined ? [] : [name, option(name)]));
const sha = execFileSync("git", ["-C", repo, "rev-parse", `${ref}^{commit}`], { encoding: "utf8" }).trim();
const baseRepo = path.join(os.tmpdir(), "test-moa-visual", sha);
const baseFrontend = path.join(baseRepo, "frontend");
const BASE_PORT = 3201;
const HEAD_PORT = 3200;

function run(command, commandArgs, cwd) {
  console.log(`\n$ (${path.relative(repo, cwd) || "."}) ${command} ${commandArgs.join(" ")}`);
  execFileSync(command, commandArgs, { cwd, stdio: "inherit" });
}

function prepareBase() {
  if (existsSync(path.join(baseFrontend, ".next", "BUILD_ID"))) {
    console.log(`기준 ${ref}(${sha.slice(0, 7)}) 빌드를 다시 쓴다: ${baseRepo}`);
    return;
  }
  if (existsSync(baseRepo)) {
    run("git", ["-C", repo, "worktree", "remove", "--force", baseRepo], repo);
    rmSync(baseRepo, { recursive: true, force: true });
  }
  run("git", ["-C", repo, "worktree", "add", "--detach", baseRepo, sha], repo);
  run("npm", ["ci", "--no-audit", "--no-fund"], baseFrontend);
  run("npm", ["run", "build"], baseFrontend);
}

function start(cwd, port) {
  const server = spawn("npx", ["next", "start", "-p", String(port)], { cwd, stdio: "ignore", detached: true });
  return server;
}

async function waitUntilUp(port) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${port}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`localhost:${port}가 60초 안에 뜨지 않았다`);
}

function stop(server) {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* 이미 끝났다 */
  }
}

prepareBase();
if (buildHead) run("npm", ["run", "build"], frontend);

const servers = [start(baseFrontend, BASE_PORT), start(frontend, HEAD_PORT)];
let status = 1;
try {
  await Promise.all([waitUntilUp(BASE_PORT), waitUntilUp(HEAD_PORT)]);
  rmSync(path.join(frontend, "test-results", "visual"), { recursive: true, force: true });
  const result = spawn("npx", ["playwright", "test", "-c", "scripts/visual/playwright.config.ts", ...passThrough], {
    cwd: frontend,
    stdio: "inherit",
    env: { ...process.env, VISUAL_BASE_URL: `http://localhost:${BASE_PORT}`, VISUAL_HEAD_URL: `http://localhost:${HEAD_PORT}` },
  });
  status = await new Promise((resolve) => result.on("exit", (code) => resolve(code ?? 1)));
} finally {
  servers.forEach(stop);
}
process.exit(status);
