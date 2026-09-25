# Roadmap and tracker

The single list of work. Update it in the same pull request as the work it describes.
Status: `[ ]` to do, `[~]` in progress, `[x]` done with the pull request number.

## How a task runs
1. Write the brief under the task below.
2. A subagent builds it from the brief, in its own branch.
3. A second subagent reviews the diff adversarially. Fix what it finds.
4. Run `pnpm check` and `pnpm test:e2e`, push, open a pull request, mark the task here.

## MVP
- [x] Playable daily game with hive, input, scoring, ranks, word list, hints, yesterday's answers and help. GitHub Pages deploy. Done in #1.
- [x] Match the game screen to the original: praise, timing, motion, progress bar, Rankings, layout, colors. Done in #4.
- [~] Match the word list, modals, Yesterday's Answers, How to Play and toolbar to the original.

## Next
- [ ] Share button that copies the rank and score as text.
- [ ] Move hosting to Cloudflare Pages. The `cloudflare` CI job is ready and waits on its repo variable and secrets.
- [ ] Branch protection on main once CI has run once.
- [ ] Review the word list by hand for obscure words, starting with the most frequent answers.
