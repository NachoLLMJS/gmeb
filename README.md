# GMEB Office Terminal

Interactive pixel-art office prototype for BNB Chain NFT workers, built with Phaser 3 and an Express server.

## Current experience

- Six animated Pixel Agents workers with walking, reading and typing states.
- Random cycles between free movement, workstation selection, sitting, working and leaving the desk.
- Three switchable locations:
  - GMEB Trading Floor
  - BNB Strategy Room
  - Flap Vault Lab
- Furniture-aware collisions and upstream-compatible seat/z-order rules.
- Windows 95-style terminal UI with worker roster and detail panel.
- Same-origin market-news endpoint with a 12-hour server cache.
- Optional read-only wallet connection.
- CSP: `img-src 'self' data: blob:`.

## Truthful pending states

The UI does not present the following as functional until verified contracts and data sources exist:

- NFT mint contract;
- Flap ERC-20 quote vault/factory;
- GMEB reward accounting or claims;
- stock price and market-cap oracle/indexer;
- production onchain event subscriptions.

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173/`.

## Verification

```bash
npm run check
npm run qa:office
```

`npm run check` validates syntax, frontend invariants, server routes, deployment boundaries and contract fail-closed states.

`npm run qa:office` launches local Chrome with Playwright Core, exercises worker selection, collision debug, seating and all three locations, then writes clean screenshots that are ignored by Git.

## Runtime structure

- `public/index.html` — terminal layout and protocol status panels.
- `public/styles.css` — Windows 95 visual system.
- `public/office-game.js` — Phaser layouts, movement, seating, collisions and z-order.
- `public/app.js` — roster synchronization, wallet opt-in, clocks and news rendering.
- `public/assets/office/` — vendored runtime sprites, furniture and Phaser.
- `server.js` — Express static server, security headers and market-news cache.
- `scripts/qa-office.mjs` — browser-level QA.

## Asset licensing

Pixel Agents character, floor, wall and furniture assets are used under the MIT License. A copy is included at:

`public/assets/office/PIXEL_AGENTS_LICENSE.txt`

The assets are integrated as non-exclusive runtime artwork. This repository does not claim exclusivity over the original sheets or permission to sell the unmodified source sheets as exclusive NFTs.
