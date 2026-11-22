# Shadow Vault — A Midnight Gallery Heist

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/locky504/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/locky504/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game: you are Wren, a thief slipping through a moonlit museum after closing time. Learn the guards' patrols, stay out of their vision cones, hide in the shadows, steal every relic, and reach the green exit unseen.

## How to play

- **WASD / arrows** — move. **Shift** — sneak (slow, silent, harder to spot).
- **Click** — throw a coin to lure a guard toward the sound (3 per floor).
- **Dark floor is shadow** — stand in it and guards barely see you.
- **Running is loud** — guards hear it and come to look.
- A guard who spots you gives chase: break line of sight and the hunt cools off; get caught three times and the night ends.
- Pocket every relic on a floor and the exit door unlocks. Three floors: The Marble Hall, The Gilded Wing, The Vault Below. Finish all three without a single alarm for the **Ghost** rating.

Guards patrol, pause to look around, grow suspicious, chase, and search the last place they saw you — and their footsteps get louder as they close in. Every sound is synthesized live with WebAudio; there are no audio files and no network requests.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `game/index.html`. The game is plain static files under `game/` with no build step.

## Screenshots

The four shots in `screenshots/` are real renders of the game in a browser: the title, a mid-heist patrol, a guard growing suspicious, and a clean getaway.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dvanqqs1&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
