# Spellagon spec

## What it is
A one-to-one clone of how the NYT Spelling Bee plays and feels, under its own name. One puzzle a day, the same for everyone.

## Rules
- Seven letters sit in a hive of hexagons. The center letter is yellow and every word must use it.
- Words have 4 to 19 letters. Letters can repeat.
- A 4-letter word scores 1. Longer words score one point per letter. A pangram, which uses all seven letters, scores 7 more.
- No puzzle uses S. Every puzzle has at least one pangram.
- A new puzzle arrives at 3 a.m. Eastern, in every time zone.

## Ranks
Ranks are shares of the puzzle's maximum score, rounded: Beginner 0%, Good Start 2%, Moving Up 5%, Good 8%, Solid 15%,
Nice 25%, Great 40%, Amazing 50%, Genius 70%, Queen Bee 100%. Queen Bee stays off the progress bar and out of the
Rankings list until it is reached.

## Feedback
Errors, checked in this order: "Too short", "Too long", "Bad letters", "Missing center letter", "Already found", "Not in word list".
An error shakes the input, shows a dark message, and clears the word after 1100ms. Typing again clears it at once.
"Too long" fires as soon as a 20th letter is typed.
Praise follows points: "Good!" for 1, "Nice!" for 5 or 6, "Awesome!" for 7 or more, and "Pangram!" in yellow.
Praise pops for 900ms with its points floating up beside it.

## Controls
Letters by tap or keyboard. Enter submits, Backspace or Delete deletes, Space shuffles, and each key lights its
on-screen button while held. Holding the Delete button repeats after 350ms, then every 90ms.
Shuffle fades the outer letters out over 300ms, reorders them, and fades them back in.
On desktop an empty input reads "Type or click".
Typed letters not in the hive show in light gray. The center letter shows in yellow.

## Screens
- Splash: yellow, the mark, the name, one line, Play. A returning player sees "Welcome Back", the word count, and Continue.
- Game: the progress bar and word list, then the input, hive, and Delete, Shuffle and Enter.
  From 768px the hive sits left and the word list is an open panel on the right.
- Word list on a phone: one bar with found words newest first. A word that does not fit drops out of sight whole.
  A new word squishes in over 700ms. Empty, it reads "Your words …". A thin chevron opens a drawer to 68vh over 200ms,
  the hive fades out, and the bar crossfades to "You have found N words".
- Word list, open: alphabetical, top to bottom and column by column, in 2 columns (3 from 992px). A full page scrolls
  sideways to the next, with snap, page dots and previous and next arrows. Pangrams are bold.
- Toolbar: the name and date on the left. Text buttons on the right: Yesterday (Yesterday's Answers from 768px),
  Hints (the letter by length grid and two-letter list, counting words left), and More, a menu with How to Play and
  Rankings. Escape or a click outside closes the menu.
- Dialogs fill a phone screen and slide up. From 768px they are a 540px card (667px from 992px) that scales in.
- Yesterday's Answers: the date, the letters with the center one yellow, the answers with a check on each word found,
  and, if any were found, the rank reached with a short line of our own.
- Past Puzzles: a month calendar from May 9, 2018 through today, reached from the splash, the More menu, and the
  back arrow of a past puzzle. Each day is a small hive that fills a step per rank; full is Genius, and a bold
  number is Queen Bee. A past puzzle plays exactly like today's, names its date beside the back arrow on a phone,
  and has its own link, `#YYYY-MM-DD`. A link to a day with no puzzle opens today. A past puzzle stays open
  through the 3 a.m. turnover.
- Rankings opens from the progress bar or the More menu. Genius and Queen Bee each get one notice per puzzle.

## Data
- The original's puzzles, where the site has them. `public/puzzles/YYYY-MM.json` holds one entry per day: the
  seven letters with the center first, then the answers, separated by spaces. `public/puzzles/index.json` lists
  the months. The site fetches only these files, from its own origin, when a month is needed.
- The `puzzles` workflow runs `scripts/fetch-nyt.mjs` at 3:10 a.m. Eastern. It fetches missing days from the
  original's public JSON, commits them, and starts the deploy. A manual run backfills every missing day since
  May 9, 2018. A run fails when today's puzzle could not be fetched.
- Until today's puzzle is deployed, the splash says it is on its way and offers past puzzles.
- Any day without the original's puzzle falls back to our own: `src/game/puzzles.txt` from 2026-09-01 and
  `src/game/archive.txt` back to 2018-05-09, answered from `src/game/words.txt`. All three come from `pnpm words`,
  and the schedule and archive only grow at their ends.
- Progress is stored in localStorage under `spellagon:<id>`: `<date>/nyt` for the original's puzzle and `<date>`
  for ours, so the two never share found words. Each holds the found words in order and which notices were shown.
