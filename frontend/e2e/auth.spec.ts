import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const PASSWORD = "test1234";
const main = (page: Page) => page.getByRole("main");
const header = (page: Page) => page.getByRole("banner");

async function login(page: Page, email: string, password: string) {
  await main(page).getByLabel("이메일").fill(email);
  await main(page).getByLabel("비밀번호").fill(password);
  await main(page).getByRole("button", { name: "로그인", exact: true }).click();
}

type SignupInput = { name: string; nickname: string; email: string; password: string; confirm: string; terms: boolean; privacy: boolean };

const VALID_SIGNUP: SignupInput = {
  name: "김모아",
  nickname: "모아",
  email: "moa@example.com",
  password: "moa2026pw",
  confirm: "moa2026pw",
  terms: true,
  privacy: true,
};

async function signup(page: Page, input: Partial<SignupInput> = {}) {
  const values = { ...VALID_SIGNUP, ...input };
  const form = main(page);
  await form.getByLabel("이름").fill(values.name);
  await form.getByLabel("닉네임").fill(values.nickname);
  await form.getByLabel("이메일").fill(values.email);
  await form.getByLabel("비밀번호", { exact: true }).fill(values.password);
  await form.getByLabel("비밀번호 확인").fill(values.confirm);
  await form.getByLabel("이용약관 동의(필수)").setChecked(values.terms);
  await form.getByLabel("개인정보처리방침 동의(필수)").setChecked(values.privacy);
  await form.getByRole("button", { name: "가입하기" }).click();
}

async function expectLoggedIn(page: Page) {
  await expect(header(page).getByRole("link", { name: "마이페이지" })).toBeVisible();
  await expect(header(page).getByRole("link", { name: "로그인" })).toHaveCount(0);
}

test.describe("R156 이메일 로그인", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("S289 테스터로 로그인하면 홈으로 간다", async ({ page }) => {
    await page.goto("/login");
    await login(page, "seoyun@example.com", PASSWORD);
    await expect(page).toHaveURL("/");
    await expectLoggedIn(page);
  });

  test("S294 맞지 않는 계정은 어느 쪽이 틀렸는지 알리지 않는다", async ({ page }) => {
    await page.goto("/login");
    await login(page, "seoyun@example.com", "wrong123");
    await expect(main(page).getByRole("alert")).toHaveText("이메일 또는 비밀번호가 맞지 않아요");
    await expect(main(page).getByLabel("이메일")).toHaveValue("seoyun@example.com");
    await login(page, "nobody@example.com", PASSWORD);
    await expect(main(page).getByRole("alert")).toHaveText("이메일 또는 비밀번호가 맞지 않아요");
    await expect(page).toHaveURL("/login");
  });

  // 주소 검사 변형은 tests/unit/next-path.test.ts가 확인하고, 여기서는 로그인 연결만 본다.
  const UNSAFE_NEXT = ["https://evil.com"];
  for (const next of UNSAFE_NEXT) {
    test(`S295 바깥 주소로 보내지 않는다: ${JSON.stringify(next)}`, async ({ page, context }) => {
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await login(page, "seoyun@example.com", PASSWORD);
      await expect(page).toHaveURL("/");
      await setDemo(context, { role: "tester" });
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await expect(page).toHaveURL("/");
    });
  }

  test("S316 쿼리가 있는 경로로 돌아간다", async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent("/testers/recruitments?tab=ongoing&sort=recent")}`);
    await login(page, "seoyun@example.com", PASSWORD);
    await expect(page).toHaveURL("/testers/recruitments?tab=ongoing&sort=recent");
  });
});

test.describe("R159 회원가입 검사", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/signup");
  });

  test("S301 빈 칸과 동의", async ({ page }) => {
    await main(page).getByRole("button", { name: "가입하기" }).click();
    for (const message of [
      "이름을 입력해 주세요",
      "닉네임을 입력해 주세요",
      "이메일을 입력해 주세요",
      "비밀번호를 입력해 주세요",
      "비밀번호를 한 번 더 입력해 주세요",
      "이용약관과 개인정보처리방침에 동의해 주세요",
    ]) {
      await expect(main(page).getByText(message)).toBeVisible();
    }
    for (const label of ["이름", "닉네임", "이메일", "비밀번호 확인"]) {
      await expect(main(page).getByLabel(label)).toHaveAttribute("aria-invalid", "true");
    }
  });

  test("S304 이미 쓰는 이메일과 닉네임", async ({ page }) => {
    await signup(page, { email: "seoyun@example.com", nickname: "윤슬" });
    await expect(main(page).getByText("이미 가입한 이메일이에요")).toBeVisible();
    await expect(main(page).getByText("이미 쓰고 있는 닉네임이에요")).toBeVisible();
  });
});

test.describe("R160 가입 성공", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("S307 가입하면 로그인 화면에서 안내한다", async ({ page }) => {
    await page.goto("/signup");
    await signup(page);
    await expect(page).toHaveURL("/login?joined=1");
    await expect(main(page).getByRole("status")).toHaveText("가입했어요. 로그인해 주세요");
  });
});

test.describe("#83 소셜 가입 이름 입력", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("#83-S9 이름과 약관 동의가 없으면 칸 아래에 알린다", async ({ page }) => {
    await page.goto("/signup/social");
    await expect(main(page).getByText("social@example.com")).toBeVisible();
    await main(page).getByRole("button", { name: "가입하기" }).click();
    await expect(main(page).getByText("이름을 입력해 주세요")).toBeVisible();
    await expect(main(page).getByText("이용약관과 개인정보처리방침에 동의해 주세요")).toBeVisible();
    await expect(main(page).getByLabel("이름")).toHaveAttribute("aria-invalid", "true");
  });

  test("#83-S10 이름을 입력하고 동의하면 로그인한 채 돌아갈 곳으로 간다", async ({ page }) => {
    await page.goto("/signup/social?next=%2Fmy");
    await main(page).getByLabel("이름").fill("김소셜");
    await main(page).getByLabel("이용약관 동의(필수)").check();
    await main(page).getByLabel("개인정보처리방침 동의(필수)").check();
    await main(page).getByRole("button", { name: "가입하기" }).click();
    await expect(page).toHaveURL("/my");
    await expectLoggedIn(page);
  });
});
