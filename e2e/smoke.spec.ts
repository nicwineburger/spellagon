import { existsSync, readdirSync, readFileSync } from "node:fs";
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

/** The original's puzzles the site ships in public/puzzles, keyed by center letter then the rest sorted. */
const shipped = new Map<string, string[]>();
const puzzleDir = new URL("../public/puzzles/", import.meta.url);
for (const file of existsSync(puzzleDir) ? readdirSync(puzzleDir) : []) {
  if (!/^\d{4}-\d{2}\.json$/.test(file)) continue;
  const days = JSON.parse(readFileSync(new URL(file, puzzleDir), "utf8")) as Record<string, string>;
  for (const entry of Object.values(days)) {
    const [letters = "", ...answers] = entry.split(" ");
    shipped.set(letters[0] + [...letters.slice(1)].sort().join(""), answers);
  }
}

/** The answers for the letters on screen: the original's list when the site ships it, else our word list. */
const answersFor = (letters: string[]) =>
  shipped.get((letters[0] ?? "") + [...letters.slice(1)].sort().join("")) ??
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
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  const list = page.getByRole("list", { name: "Found words" });
  if (!(await list.isVisible())) await page.getByRole("button", { name: /your words/ }).click();
  await expect(list.getByRole("listitem")).toHaveText([word.charAt(0).toUpperCase() + word.slice(1)]);
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
  const more = page.getByRole("button", { name: "More" });
  for (const [open, title] of [
    [async () => page.getByRole("button", { name: /^Yesterday/ }).click(), "Yesterday’s Answers"],
    [async () => page.getByRole("button", { name: "Hints" }).click(), "Hints"],
    [
      async () => {
        await more.click();
        await page.getByRole("button", { name: "How to Play" }).click();
      },
      "How to Play",
    ],
  ] as const) {
    await open();
    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.getByRole("button", { name: /See rankings/ }).click();
  await expect(page.getByRole("dialog", { name: "Rankings" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the More menu opens, closes, and leads to Rankings", async ({ page }) => {
  await play(page);
  const more = page.getByRole("button", { name: "More" });
  const help = page.getByRole("button", { name: "How to Play" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(help).toBeHidden();

  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(help).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
  await expect(more).toBeFocused();

  await more.click();
  await page.locator(".controls").click({ position: { x: 5, y: 5 } });
  await expect(help).toBeHidden();

  await more.click();
  await page.getByRole("button", { name: "Rankings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Rankings" })).toBeVisible();
  await expect(help).toBeHidden();
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

test("the toolbar fits a 320px phone without overlap", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await play(page);
  const back = await page.getByRole("button", { name: "Back" }).boundingBox();
  const nav = await page.locator(".toolbar nav").boundingBox();
  expect((back?.x ?? 0) + (back?.width ?? 0)).toBeLessThanOrEqual(nav?.x ?? 0);
  expect((nav?.x ?? 0) + (nav?.width ?? 0)).toBeLessThanOrEqual(320);
});

test("a dialog fits a landscape phone and keeps its close button in reach", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await play(page);
  await page.getByRole("button", { name: /^Yesterday/ }).click();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(390);
  await dialog.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.getByRole("button", { name: "Close" })).toBeInViewport();
});

test("closing a dialog opened from More returns focus to More", async ({ page }) => {
  await play(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "How to Play" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "More" })).toBeFocused();
  await expect(page.locator("#more-menu")).toBeHidden();
});

test("the back arrow returns to the splash", async ({ page }) => {
  await play(page);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("the archive opens a past puzzle, keeps its progress, and marks the day", async ({ page }) => {
  await page.goto("/");
  const todayLetters = await page.getByRole("button", { name: "Play" }).isVisible();
  expect(todayLetters).toBe(true);
  await page.getByRole("button", { name: "Past Puzzles" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
  const first = page.locator(".day:not(:disabled)").first();
  const label = (await first.getAttribute("aria-label")) ?? "";
  expect(label).toMatch(/, not started$/);
  await first.click();

  await expect(page).toHaveURL(/#\d{4}-\d{2}-01$/);
  const letters = await page
    .locator(".hive .cell")
    .evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.letter ?? ""));
  const word = answersFor(letters).sort((a, b) => a.length - b.length)[0] ?? "";
  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
  await expect(page.locator(".message .points")).toBeVisible();

  // Back from a past puzzle leads to the archive, where the day now shows progress.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: /^\w+ 1, \d{4}, (Beginner|Good Start|Moving Up), / })).toBeVisible();

  // The link reopens the same puzzle after a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
});

test("a bad or future date in the link falls back to today", async ({ page }) => {
  await page.goto("/#2099-01-01");
  await expect(page.getByRole("heading", { name: "Spellagon" })).toBeVisible();
  const today = await page.locator(".splash .date").textContent();
  await page.goto("/#2018-05-08");
  await page.reload();
  await expect(page.locator(".splash .date")).toHaveText(today ?? "");
  await page.goto("/#2018-05-09");
  await page.reload();
  await expect(page.locator(".splash .date")).toHaveText("May 9, 2018");
});

test("the archive and a past puzzle fit a 320px phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#2020-01-01");
  await page.getByRole("button", { name: "Past Puzzles" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: /^January 1, 2020/ }).click();
  await expect(page.locator(".toolbar .narrow-date")).toBeVisible();
  await expect(page.locator(".toolbar .narrow-date")).toHaveText("1/1/20");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("changing the link to another day closes an open dialog", async ({ page }) => {
  await play(page);
  await page.getByRole("button", { name: "Hints" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => {
    location.hash = "#2020-01-01";
  });
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a link to today or junk is tidied away", async ({ page }) => {
  await page.goto("/#garbage");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
});

test("a Genius notice reached just before leaving shows on return", async ({ page }) => {
  await page.goto("/#2020-01-01");
  await page.getByRole("button", { name: "Play" }).click();
  const letters = await page
    .locator(".hive .cell")
    .evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.letter ?? ""));
  const words = answersFor(letters);
  const score = (w: string) => (w.length === 4 ? 1 : w.length) + (new Set(w).size === 7 ? 7 : 0);
  const genius = Math.round(0.7 * words.reduce((sum, w) => sum + score(w), 0));
  // Seed words until one more crosses Genius, then play that last word by hand.
  const seeded: string[] = [];
  let points = 0;
  const rest = [...words];
  while (rest.length > 0 && points + score(rest[0] ?? "") < genius) {
    const word = rest.shift() ?? "";
    seeded.push(word);
    points += score(word);
  }
  const last = rest[0] ?? "";
  await page.evaluate((found) => localStorage.setItem("spellagon:2020-01-01", JSON.stringify({ found })), seeded);
  await page.reload();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.keyboard.type(last);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Back" }).click();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /^January 1, 2020/ }).click();
  await expect(page.getByRole("dialog", { name: "Genius" })).toBeVisible();
});

test("the word bar shows every found word with an initial capital", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const letters = await play(page);
  const words = answersFor(letters).slice(0, 3);
  for (const word of words) {
    await page.keyboard.type(word);
    await page.keyboard.press("Enter");
  }
  // Checked in the page text itself, so it holds in every browser, not only where CSS capitalize behaves.
  const shown = await page.locator(".recent > span").allTextContents();
  expect(shown).toEqual(words.toReversed().map((w) => w.charAt(0).toUpperCase() + w.slice(1)));
});

/** Today's puzzle date, Eastern time turning over at 3 a.m., as the game works it out. */
function puzzleDateEastern(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (Number(parts.hour) >= 3) return day;
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
const dayBefore = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Serves made-up puzzle files in place of the shipped ones. Synthetic letters and words only. */
async function servePuzzles(page: Page, days: Record<string, string>) {
  const months = [...new Set(Object.keys(days).map((d) => d.slice(0, 7)))];
  await page.route("**/puzzles/index.json", (route) => route.fulfill({ json: { months } }));
  await page.route(/\/puzzles\/\d{4}-\d{2}\.json$/, (route) => {
    const month =
      route
        .request()
        .url()
        .match(/(\d{4}-\d{2})\.json$/)?.[1] ?? "";
    route.fulfill({ json: Object.fromEntries(Object.entries(days).filter(([d]) => d.startsWith(month))) });
  });
}

test("the original's puzzle takes over a day when the site has it", async ({ page }) => {
  const today = puzzleDateEastern();
  await servePuzzles(page, {
    [dayBefore(today)]: "abcdefg fbcdegab abed",
    [today]: "abcdefg fbcdegab abed faced badge",
  });
  const letters = await play(page);
  expect(letters[0]).toBe("a");
  expect([...letters].sort().join("")).toBe("abcdefg");
  await page.keyboard.type("abed");
  await page.keyboard.press("Enter");
  await expect(page.locator(".message .points")).toHaveText("+1");
  // A real word that is not on the original's list is refused.
  await page.keyboard.type("dace");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Not in word list")).toBeVisible();
});

test("just after 3 a.m. the splash waits for today's puzzle instead of showing a stand-in", async ({ page }) => {
  const today = puzzleDateEastern();
  await servePuzzles(page, { [dayBefore(today)]: "abcdefg fbcdegab abed" });
  await page.goto("/");
  await expect(page.getByText("Today’s puzzle is on its way. Check back in a few minutes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Past Puzzles" })).toBeVisible();
});
