# Spellagon

A daily word game that plays like the NYT Spelling Bee. Make as many words as you can from seven letters, and every word has to use the center one.

Everything runs in your browser. Your progress stays on your machine. There is no server, no account and no analytics.

## Develop
```sh
pnpm install
pnpm dev     # local server
pnpm check   # lint, typecheck, test, build
```

Contributing: see [AGENTS.md](AGENTS.md). Planned work: [docs/roadmap.md](docs/roadmap.md). Product notes: [docs/spec.md](docs/spec.md).

## Words
The word list comes from [SCOWL](http://wordlist.aspell.net/) through `wordlist-english`, filtered to common words with no S, and with a blocklist for swearing and slurs.

## Caveats
Spellagon is a fan project. It is not affiliated with or endorsed by The New York Times.

## License
[Apache-2.0](LICENSE)
