# spellagon

A static, client-only daily word game that plays like the NYT Spelling Bee. No server, no accounts.
Product notes live in `docs/spec.md`. UI and copy follow `docs/style.md`, with values in `src/styles/tokens.css`.
Work is tracked in `docs/roadmap.md`. Pick tasks from it and update it in the same pull request.

## Commands
- `pnpm check` runs lint, typecheck, tests, and build. Run it before every commit. It is quiet on success.
- `pnpm fix` auto-fixes lint and formatting.
- `pnpm dev` starts the dev server. `pnpm test` runs tests only.
- `pnpm test:e2e` runs the browser smoke test on the production build. Run it after UI changes.
  Set `PW_CHROMIUM` to a Chromium path to use a preinstalled browser.
- `pnpm words` rebuilds the word list, `puzzles.txt` and `archive.txt` in `src/game/` from SCOWL. Commit the outputs.

## Workflow
- Never commit to `main`. Branch, open a PR, squash-merge. Pushes to `main` deploy to GitHub Pages once checks pass.
- Commits and PR titles follow Conventional Commits: `type(scope): summary`. A hook and CI enforce it.
- One logical change per PR. Keep diffs small. Add or update a test with every behavior change.
- No tool or assistant attribution in commits, PRs, code or docs.

## Rules
- Nothing the player owns may leave their browser. No backend, no analytics, no third-party requests.
- Never change a past day's puzzle. `puzzles.txt` and `archive.txt` only grow at the end.
- Never use NYT names, logos, bylines or proprietary fonts. The game plays like the Bee; it is not the Bee.
- TypeScript only, strict mode. Prefer plain functions and small modules over new dependencies.
- Ask before adding a runtime dependency. Bundle size matters.

## Keeping agent cost low
- Read only the files a task touches. Use `rg` to locate code instead of opening directories.
- Do not paste large command output. `pnpm check` output is already minimal.
- Keep this file under 40 lines. Put detail in `docs/` and link to it.
