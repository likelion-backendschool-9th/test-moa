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
  await expect(header(page).getByRole("link", { name: "내 정보" })).toBeVisible();
  await expect(header(page).getByRole("link", { name: "로그인" })).toHaveCount(0);
}

test.describe("R1 로그인 보기", () => {
  test("S335 비로그인에게 폼, 소셜 버튼, 회원가입 링크, 시연 계정을 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
    await expect(main(page).getByLabel("이메일")).toBeVisible();
    await expect(main(page).getByLabel("비밀번호")).toBeVisible();
    await expect(main(page).getByRole("button", { name: "로그인", exact: true })).toBeVisible();
    await expect(main(page).getByRole("button", { name: "깃허브로 계속하기" })).toBeVisible();
    await expect(main(page).getByRole("button", { name: "구글로 계속하기" })).toBeVisible();
    await expect(main(page).getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    const demo = page.getByRole("region", { name: "시연 계정" });
    for (const email of ["seoyun@example.com", "dohyun@example.com", "admin@example.com", PASSWORD]) {
      await expect(demo.getByText(email)).toBeVisible();
    }
  });

  test("S286 회원가입 링크에 next를 남긴다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/login?next=%2Fmy");
    await expect(main(page).getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup?next=%2Fmy");
  });

  test("S287 이미 로그인했으면 next나 홈으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/login?next=%2Fmy");
    await expect(page).toHaveURL("/my");
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("S288 입력 속성", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/login");
    const email = main(page).getByLabel("이메일");
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");
    const password = main(page).getByLabel("비밀번호");
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
  });
});

test.describe("R2 이메일 로그인", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("S289 테스터로 로그인하면 홈으로 간다", async ({ page }) => {
    await page.goto("/login");
    await login(page, "seoyun@example.com", PASSWORD);
    await expect(page).toHaveURL("/");
    await expectLoggedIn(page);
  });

  test("S290 next로 돌아간다", async ({ page }) => {
    await page.goto("/login?next=%2Fmy%2Fcredits");
    await login(page, "dohyun@example.com", PASSWORD);
    await expect(page).toHaveURL("/my/credits");
  });

  test("S291 운영자로 로그인하면 운영자 화면이 열린다", async ({ page }) => {
    await page.goto("/login?next=%2Fadmin");
    await login(page, "admin@example.com", PASSWORD);
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("운영자만 볼 수 있는 페이지예요")).toHaveCount(0);
  });

  test("S292 빈 칸", async ({ page }) => {
    await page.goto("/login");
    await main(page).getByRole("button", { name: "로그인", exact: true }).click();
    await expect(main(page).getByText("이메일을 입력해 주세요")).toBeVisible();
    await expect(main(page).getByText("비밀번호를 입력해 주세요")).toBeVisible();
    await expect(main(page).getByLabel("이메일")).toHaveAttribute("aria-invalid", "true");
    await expect(main(page).getByLabel("비밀번호")).toHaveAttribute("aria-invalid", "true");
  });

  test("S293 이메일 형식", async ({ page }) => {
    await page.goto("/login");
    await login(page, "seoyun", PASSWORD);
    await expect(main(page).getByText("이메일 형식이 맞지 않아요")).toBeVisible();
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

  const UNSAFE_NEXT = [
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/a/..//evil.com",
    "/a/%2e%2e//evil.com",
    "javascript:alert(1)",
    "my",
  ];
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
    await page.goto(`/login?next=${encodeURIComponent("/my/participations?tab=ongoing&sort=recent")}`);
    await login(page, "seoyun@example.com", PASSWORD);
    await expect(page).toHaveURL("/my/participations?tab=ongoing&sort=recent");
  });
});

test.describe("R3 소셜 로그인", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("S296 깃허브로 로그인하면 next로 간다", async ({ page }) => {
    await page.goto("/login?next=%2Fmy");
    await main(page).getByRole("button", { name: "깃허브로 계속하기" }).click();
    await expect(page).toHaveURL("/my");
    await expectLoggedIn(page);
  });

  test("S297 가입 화면에서 구글로 로그인하면 홈으로 간다", async ({ page }) => {
    await page.goto("/signup");
    await main(page).getByRole("button", { name: "구글로 계속하기" }).click();
    await expect(page).toHaveURL("/");
    await expectLoggedIn(page);
  });
});

test.describe("R4 회원가입 보기", () => {
  test("S298 비로그인에게 칸, 동의, 소셜 버튼, 로그인 링크를 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/signup?next=%2Fmy");
    await expect(page.getByRole("heading", { level: 1, name: "회원가입" })).toBeVisible();
    for (const label of ["이름", "닉네임", "이메일", "비밀번호 확인"]) {
      await expect(main(page).getByLabel(label)).toBeVisible();
    }
    await expect(main(page).getByLabel("비밀번호", { exact: true })).toBeVisible();
    await expect(main(page).getByRole("button", { name: "가입하기" })).toBeVisible();
    await expect(main(page).getByRole("checkbox", { name: "이용약관 동의(필수)" })).toBeVisible();
    await expect(main(page).getByRole("checkbox", { name: "개인정보처리방침 동의(필수)" })).toBeVisible();
    await expect(main(page).getByRole("link", { name: "이용약관 보기" })).toHaveAttribute("href", "/terms");
    await expect(main(page).getByRole("link", { name: "개인정보처리방침 보기" })).toHaveAttribute("href", "/privacy");
    await expect(main(page).getByRole("button", { name: "깃허브로 계속하기" })).toBeVisible();
    await expect(main(page).getByRole("button", { name: "구글로 계속하기" })).toBeVisible();
    await expect(main(page).getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login?next=%2Fmy");
  });

  test("S299 이미 로그인했으면 홈으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/signup");
    await expect(page).toHaveURL("/");
  });

  test("S300 입력 속성과 비밀번호 안내", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/signup");
    const form = main(page);
    await expect(form.getByLabel("이름")).toHaveAttribute("autocomplete", "name");
    await expect(form.getByLabel("닉네임")).toHaveAttribute("autocomplete", "nickname");
    await expect(form.getByLabel("이메일")).toHaveAttribute("type", "email");
    await expect(form.getByLabel("이메일")).toHaveAttribute("autocomplete", "email");
    for (const field of [form.getByLabel("비밀번호", { exact: true }), form.getByLabel("비밀번호 확인")]) {
      await expect(field).toHaveAttribute("type", "password");
      await expect(field).toHaveAttribute("autocomplete", "new-password");
    }
    await expect(form.getByText("영문과 숫자를 섞어 8자 이상", { exact: true })).toBeVisible();
  });
});

test.describe("R5 회원가입 검사", () => {
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

  test("S302 형식", async ({ page }) => {
    await signup(page, { name: "가".repeat(21), nickname: "a".repeat(40), email: "moa", password: "abc", confirm: "abc" });
    for (const message of ["이름은 20자까지 쓸 수 있어요", "닉네임은 한글·영문·숫자 1~39자예요", "이메일 형식이 맞지 않아요", "영문과 숫자를 섞어 8자 이상 써 주세요"]) {
      await expect(main(page).getByText(message)).toBeVisible();
    }
  });

  test("S303 확인 불일치", async ({ page }) => {
    await signup(page, { confirm: "moa2026px" });
    await expect(main(page).getByText("비밀번호가 서로 달라요")).toBeVisible();
  });

  test("S304 이미 쓰는 이메일과 닉네임", async ({ page }) => {
    await signup(page, { email: "seoyun@example.com", nickname: "윤슬" });
    await expect(main(page).getByText("이미 가입한 이메일이에요")).toBeVisible();
    await expect(main(page).getByText("이미 쓰고 있는 닉네임이에요")).toBeVisible();
  });

  test("S305 동의를 하나만 하면 막는다", async ({ page }) => {
    await signup(page, { privacy: false });
    await expect(main(page).getByText("이용약관과 개인정보처리방침에 동의해 주세요")).toBeVisible();
    await expect(page).toHaveURL("/signup");
  });

  test("S306 오류 뒤에도 입력과 체크가 남는다", async ({ page }) => {
    await signup(page, { email: "seoyun@example.com", nickname: "윤슬" });
    await expect(main(page).getByText("이미 가입한 이메일이에요")).toBeVisible();
    const form = main(page);
    await expect(form.getByLabel("이름")).toHaveValue("김모아");
    await expect(form.getByLabel("닉네임")).toHaveValue("윤슬");
    await expect(form.getByLabel("이메일")).toHaveValue("seoyun@example.com");
    await expect(form.getByLabel("비밀번호", { exact: true })).toHaveValue("moa2026pw");
    await expect(form.getByLabel("비밀번호 확인")).toHaveValue("moa2026pw");
    await expect(form.getByLabel("이용약관 동의(필수)")).toBeChecked();
    await expect(form.getByLabel("개인정보처리방침 동의(필수)")).toBeChecked();
  });

  test("S314 닉네임은 1자와 39자까지 쓸 수 있다", async ({ page }) => {
    for (const nickname of ["a", "a".repeat(39)]) {
      await page.goto("/signup");
      await signup(page, { nickname, confirm: "moa2026px" });
      await expect(main(page).getByText("비밀번호가 서로 달라요")).toBeVisible();
      await expect(main(page).getByLabel("닉네임")).not.toHaveAttribute("aria-invalid", "true");
    }
    await signup(page, { nickname: "윤슬!!" });
    await expect(main(page).getByText("닉네임은 한글·영문·숫자 1~39자예요")).toBeVisible();
  });
});

test.describe("R6 가입 성공", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("S307 가입하면 로그인 화면에서 안내한다", async ({ page }) => {
    await page.goto("/signup");
    await signup(page);
    await expect(page).toHaveURL("/login?joined=1");
    await expect(main(page).getByRole("status")).toHaveText("가입했어요. 로그인해 주세요");
  });

  test("S308 next를 넘기고, 안전하지 않은 next는 버린다", async ({ page }) => {
    await page.goto("/signup?next=%2Fmy");
    await signup(page);
    await expect(page).toHaveURL("/login?joined=1&next=%2Fmy");

    await page.goto(`/signup?next=${encodeURIComponent("/my?tab=ongoing&sort=recent")}`);
    await signup(page);
    await expect(page).toHaveURL(`/login?joined=1&next=${encodeURIComponent("/my?tab=ongoing&sort=recent")}`);

    await page.goto(`/signup?next=${encodeURIComponent("/\\evil.com")}`);
    await signup(page);
    await expect(page).toHaveURL("/login?joined=1");
  });
});

test.describe("R7 화면", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "guest" });
  });

  test("S309 좁은 화면에서는 칸과 버튼이 카드 너비를 채운다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [path, submit] of [
      ["/login", "로그인"],
      ["/signup", "가입하기"],
    ] as const) {
      await page.goto(path);
      const width = (await main(page).locator("form").first().boundingBox())!.width;
      const fields = main(page).locator('input:not([type="hidden"]):not([type="checkbox"])');
      for (const field of await fields.all()) {
        expect(Math.abs((await field.boundingBox())!.width - width)).toBeLessThan(1);
      }
      for (const name of [submit, "깃허브로 계속하기", "구글로 계속하기"]) {
        const button = main(page).getByRole("button", { name, exact: true });
        expect(Math.abs((await button.boundingBox())!.width - width)).toBeLessThan(1);
      }
    }
  });

  test("S310 넓은 화면에서는 가운데 좁은 카드다", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      const card = (await page.getByRole("heading", { level: 1 }).locator("xpath=../..").boundingBox())!;
      expect(card.width).toBeLessThanOrEqual(448);
      const viewport = page.viewportSize()!;
      expect(Math.abs(card.x + card.width / 2 - viewport.width / 2)).toBeLessThan(2);
    }
  });

  test("S311 주 버튼은 제출 하나다", async ({ page }) => {
    for (const [path, submit] of [
      ["/login", "로그인"],
      ["/signup", "가입하기"],
    ] as const) {
      await page.goto(path);
      await expect(main(page).getByRole("button", { name: submit, exact: true })).toHaveClass(/bg-accent/);
      for (const name of ["깃허브로 계속하기", "구글로 계속하기"]) {
        await expect(main(page).getByRole("button", { name })).not.toHaveClass(/bg-accent/);
      }
    }
  });
});
