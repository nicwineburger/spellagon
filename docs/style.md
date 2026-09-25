# Spellagon style guide

Spellagon should feel exactly like the Spelling Bee. It must never be mistaken for an NYT product.
Values live in `src/styles/tokens.css`. This file says how to use them.

## Not NYT
The name is Spellagon. The splash and How to Play say it is a fan project, not affiliated with The New York Times.
Never use the NYT logo, the T mark, the bee icon, editor bylines, or the proprietary fonts Karnak and Franklin.
Copy is our own wording. Rank names and message words match the game, because players read them as rules.

## Look
- White page, black text, thin `--rule` borders. Flat color only.
- `--bee` yellow marks the center letter, reached ranks and the pangram message. Outer cells are `--cell` gray.
- The hive is seven flat-top hexagons with a white gap between them.
- Pill buttons: `--bg` fill, 1px `--rule` border, 3em tall. Shuffle is a circle.
- Dark mode follows the system setting.

## Type
- `--font-display` stands in for Karnak. Use it for the name, the date and modal titles, bold.
- `--font-ui` is Libre Franklin. Use it for everything else. Hive letters and the input are bold and uppercase.
- Self-host fonts through Fontsource. Never load from a font CDN.

## Motion
- Cells press in when tapped or typed. The input shakes on an error. Shuffle fades the outer letters.
- Honor `prefers-reduced-motion`.
- A message never moves the page. It sits in a space that is always reserved.

## Words
- Short and plain, in the second person. Title case for buttons and titles. Sentence case for the rest.
- Numerals always. Dates are "September 25, 2026".
