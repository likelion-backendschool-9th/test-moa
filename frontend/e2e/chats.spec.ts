import { expect, type Page, test } from "@playwright/test";
import { homeLogo, setDemo } from "./helpers";

const chatList = (page: Page) => page.getByRole("list", { name: "채팅 목록" });
const cards = (page: Page) => chatList(page).getByRole("listitem");
const cardLinks = (page: Page) => chatList(page).getByRole("link");
const searchBox = (page: Page) => page.getByRole("searchbox", { name: "채팅방 검색" });
const sortGroup = (page: Page) => page.getByRole("group", { name: "정렬" });
const sortButton = (page: Page, name: string) => sortGroup(page).getByRole("button", { name });
const roleTabGroup = (page: Page) => page.getByRole("group", { name: "역할별 보기" });
const roleTabs = (page: Page) => roleTabGroup(page).getByRole("button");
const roleTab = (page: Page, label: "전체" | "테스터" | "개발자") => roleTabs(page).filter({ hasText: label });

/** 카드 링크 이름은 "프로젝트명 채팅방"이다 */
const roomNames = (projects: string[]) => projects.map((project) => `${project} 채팅방`);

test.describe("R116 검색·정렬·역할 탭", () => {
  test("S319 검색어를 쓰고 곧바로 역할 탭이나 정렬을 눌러도 검색어와 고른 조건이 함께 남는다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    const params = () => {
      const search = new URL(page.url()).searchParams;
      return [search.get("q"), search.get("role"), search.get("sort")];
    };

    await searchBox(page).fill("윤슬");
    await roleTab(page, "개발자").click();
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "회의록 정리"]));
    /* 검색 대기 시간(300ms)이 지나도 늦은 검색이 탭을 되돌리지 않는다 */
    await page.waitForTimeout(600);
    expect(params()).toEqual(["윤슬", "developer", null]);
    await expect(roleTab(page, "개발자")).toHaveAttribute("aria-pressed", "true");

    await searchBox(page).fill("가계부");
    await sortButton(page, "오래된순").click();
    await expect(cards(page).locator("[data-partner]")).toHaveText(["윤슬", "새벽코더"]);
    await page.waitForTimeout(600);
    expect(params()).toEqual(["가계부", "developer", "oldest"]);
    await expect(sortButton(page, "오래된순")).toHaveAttribute("aria-pressed", "true");
    await expect(searchBox(page)).toHaveValue("가계부");
  });

  test("S320 검색어를 쓰고 곧바로 다른 페이지로 가면 기다리던 검색은 버리고, 돌아오면 입력창과 목록이 맞는다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await page.goto("/my/chats");

    /* 헤더의 채팅 링크로 돌아오기 */
    await searchBox(page).fill("북로그");
    await homeLogo(page).click();
    await expect(page).toHaveURL("/");
    await page.waitForTimeout(600);
    await expect(page).toHaveURL("/");
    await nav.getByRole("link", { name: "채팅" }).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(searchBox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(5);

    /* 브라우저 뒤로 가기로 돌아오기 */
    await searchBox(page).fill("모아");
    await homeLogo(page).click();
    await expect(page).toHaveURL("/");
    await page.goBack();
    await expect(page).toHaveURL("/my/chats");
    await expect(searchBox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(5);
  });
});
