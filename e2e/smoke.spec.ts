import { readFileSync } from "node:fs";
import { test as base, expect, type Page } from "@playwright/test";

// Every test fails on a page error, a console error, or a request to another origin.
const test = base.extend<{ guard: undefined }>({
  guard: [
    async ({ page, baseURL }, use) => {
      const problems: string[] = [];
      const origin = new URL(baseURL ?? "http://localhost:4173").origin;
      page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console error: ${message.text()}`);
      });
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (url.protocol !== "data:" && url.protocol !== "blob:" && url.origin !== origin) {
          problems.push(`request to another origin: ${request.url()}`);
        }
      });
      await use(undefined);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

/** Starts the game and returns today's letters, center first. */
async function play(page: Page): Promise<string[]> {
  await page.goto("/");
  await page.getByRole("button", { name: "Play" }).click();
  return page
    .locator(".hive .cell")
    .evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.letter ?? ""));
}

const dictionary = readFileSync(new URL("../src/game/words.txt", import.meta.url), "utf8")
  .trim()
  .split("\n");

/** The answers for the letters on screen, worked out from the same word list the game ships. */
const answersFor = (letters: string[]) =>
  dictionary.filter((w) => w.includes(letters[0] ?? "") && [...w].every((c) => letters.includes(c)));

const input = (page: Page) => page.getByRole("textbox", { name: "Your word" });

test("splash leads to the hive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Spellagon" })).toBeVisible();
  await expect(page.getByText("A fan project, not affiliated with The New York Times.")).toBeVisible();
  const letters = await play(page);
  expect(letters).toHaveLength(7);
  expect(new Set(letters).size).toBe(7);
  await expect(page.getByRole("button", { name: /Rank: Beginner/ })).toBeVisible();
});

test("typing, deleting and bad words", async ({ page }) => {
  const letters = await play(page);
  await page.keyboard.type(`${letters[1]}${letters[2]}`);
  await expect(input(page)).toHaveText(`${letters[1]}${letters[2]}`);
  await page.keyboard.press("Backspace");
  await expect(input(page)).toHaveText(`${letters[1]}`);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Too short")).toBeVisible();
  await expect(input(page)).toHaveText("");

  // Four outer letters and no center.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  for (const i of [1, 2, 3, 4]) await page.locator(`.hive .cell >> nth=${i}`).click();
  await page.getByRole("button", { name: "Enter", exact: true }).click();
  await expect(page.getByText("Missing center letter")).toBeVisible();
});

test("a found word scores, lists, and survives a reload", async ({ page }) => {
  const letters = await play(page);
  const word = answersFor(letters).sort((a, b) => a.length - b.length)[0] ?? "";
  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
  await expect(page.locator(".message .points")).toHaveText(word.length === 4 ? "+1" : `+${word.length}`);
  await expect(input(page)).toHaveText("");

  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Already found")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  const list = page.getByRole("list", { name: "Found words" });
  if (!(await list.isVisible())) await page.getByRole("button", { name: /your words/ }).click();
  await expect(list.getByRole("listitem")).toHaveText([word]);
});

test("shuffle keeps the center and the same letters", async ({ page }) => {
  const letters = await play(page);
  await page.getByRole("button", { name: "Shuffle" }).click();
  await page.waitForTimeout(400);
  const after = await page
    .locator(".hive .cell")
    .evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.letter ?? ""));
  expect(after[0]).toBe(letters[0]);
  expect([...after].sort()).toEqual([...letters].sort());
  expect(after.join("")).not.toBe(letters.join(""));
});

test("toolbar panels open and close", async ({ page }) => {
  await play(page);
  for (const [button, title] of [
    ["How to Play", "How to Play"],
    ["Hints", "Hints"],
    ["Yesterday's Answers", "Yesterday's Answers"],
  ]) {
    await page.getByRole("button", { name: button }).click();
    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.getByRole("button", { name: /See rankings/ }).click();
  await expect(page.getByRole("dialog", { name: "Rankings" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Enter opens a focused toolbar button, and typing hands Enter back to the game", async ({ page }) => {
  const letters = await play(page);
  await page.getByRole("button", { name: "Hints" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Hints" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Focus is back on Hints. Typing a word and pressing Enter must submit it, not reopen Hints.
  await page.keyboard.type(`${letters[1]}${letters[2]}`);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Too short")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a long word stays inside the page on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const letters = await play(page);
  await page.keyboard.type((letters[3] ?? "").repeat(20));
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(320);
});
