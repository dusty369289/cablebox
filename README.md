# CableBox

**Retro cable TV experience for YouTube.** Deterministic scheduling, channel surfing, and a 90s EPG — all in the browser.

---

## What is this?

CableBox turns YouTube into a cable TV experience. Instead of choosing what to watch, you tune into channels and watch whatever is on — just like real TV. Every viewer on the same channel sees the same video at the same time.

**10 topic-based channels** come built in (Science, Mathematics, Technology, History, Geography, Cooking, Nature, Engineering, Documentary, Space), each aggregating content from top YouTube creators in that field. Import your own channels from any YouTube page using the bookmarklet.

## Features

- **Deterministic scheduling** — videos play on a fixed timeline. No choices, no algorithm. Everyone sees the same thing.
- **TV guide grid** — scrollable program guide showing what's on now and upcoming, just like a real EPG. Horizontal panning on mobile.
- **Channel surfing** — arrow keys, number pad, or click to switch channels. Static transition on switch.
- **Bookmarklet scraper** — scan any YouTube page (homepage, subscriptions, channels, playlists) to import videos as custom channels. Auto-scrolls to load all content.
- **3 themes** — 90s Cable (Prevue Channel aesthetic), Phosphor (green CRT), Material Design 3 dark.
- **CRT scan line overlay** — optional retro TV effect with flicker and vignette.
- **Fully static** — no server, no API calls at runtime. Hosts anywhere for free.
- **Mobile responsive** — dynamic viewport height, safe area insets, touch-aware guide.
- **Channel management** — toggle default channels, delete imports, edit channel JSON directly.
- **Persistent settings** — theme, volume, mute, last channel, hidden defaults all saved in localStorage.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `G` | Toggle TV guide |
| `I` | Import channels |
| `E` | Settings |
| `F` | Fullscreen |
| `M` | Mute/unmute |
| `C` | Toggle CRT effect |
| `T` | Cycle theme |
| `Up/Down` | Channel up/down |
| `0-9` | Direct channel number |

## Tech Stack

- **SvelteKit** with Svelte 5 runes, adapter-static
- **TypeScript** throughout
- **Vitest** for unit tests (scheduling algorithm fully covered)
- **Playwright** for E2E testing
- **YouTube IFrame Player API** for playback
- **YouTube Data API v3** for build-time channel data
- **IndexedDB** for user-imported channels
- **CSS custom properties** for theme system
- **esbuild** for bookmarklet compilation

## Development

```bash
npm install
npm run dev
```

### Build channel data

Requires a YouTube Data API v3 key:

```bash
cp .env.example .env
# Add your YOUTUBE_API_KEY to .env
npm run build:channels
```

### Build bookmarklet

```bash
npm run build:bookmarklet
```

### Run tests

```bash
npm run test        # unit tests
npm run check       # type checking
npm run build       # production build
```

## Deploy Your Own Instance

1. **Fork this repo**
2. **Set environment variables** in your CI/deployment:
   - `BASE_PATH` — set to `/your-repo-name` for GitHub Pages subdirectory hosting (or leave empty for root)
   - `YOUTUBE_API_KEY` — only needed if you want to rebuild default channel data
3. **For GitHub Pages**: enable Pages in repo settings → Source: GitHub Actions. The included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically on push to master.

## Architecture

```
Browser (client-side only)
├── Scheduler (pure function) — deterministic video selection from timestamp
├── YouTube IFrame Player — single iframe, swapped on channel change
├── TV Guide — computed from getScheduleRange(), pixel-positioned blocks
├── IndexedDB — persisted user-imported channels
├── localStorage — settings, theme, last channel, hidden defaults
└── Static JSON — pre-built default channel data (no runtime API calls)

Build time (local only)
├── YouTube Data API v3 — fetch videos for default topic channels
├── Round-robin balancing — interleave videos from multiple sources
└── esbuild — compile bookmarklet scraper to standalone JS
```

## Default Channels

| # | Channel | Sources |
|---|---------|---------|
| 1 | Science | Kurzgesagt, Veritasium, Vsauce, SmarterEveryDay, MinutePhysics |
| 2 | Mathematics | 3Blue1Brown, Numberphile, Mathologer, Stand-up Maths |
| 3 | Technology | Fireship, Technology Connections, Tom Scott, Computerphile |
| 4 | History | OverSimplified, Extra History, History Matters, Kings and Generals |
| 5 | Geography | Geography Now, RealLifeLore, WonderWhy, Atlas Pro |
| 6 | Cooking | Bon Appetit, Joshua Weissman, Binging with Babish, Adam Ragusea |
| 7 | Nature | BBC Earth, National Geographic, Deep Look, Brave Wilderness |
| 8 | Engineering | Mark Rober, Practical Engineering, Real Engineering, Wendover Productions |
| 9 | Documentary | LEMMiNO, ColdFusion, ElectroBOOM, Last Week Tonight |
| 10 | Space | PBS Space Time, Astrum, Cool Worlds, Scott Manley |

## License

Copyright (c) 2026 Ethan Wright

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

Attribution is required in all copies and derivative works.
