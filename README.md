# Agency Prospect — animated explainer series

Five animated explainer videos (plus a combined cut) for the Twenty CRM **`agencyProspects`** object. Built from the narration script in [`content/agency-prospects.txt`](content/agency-prospects.txt).

- 1080p / 30 fps, deterministic render (same input → same frames).
- Narration: Deepgram Aura (`aura-asteria-en`).
- Music: a 120 BPM bed synthesized in code (kick/snare/hat/bass/pad/arp).
- Visuals: HTML + canvas `seek(t)` engine — closed-form springs, particles, count-ups, gauges, dependency graph, funnel, kanban.

## Videos

| # | Section | Length | File |
|---|---------|--------|------|
| 1 | The object | 0:37 | [`videos/agency-prospect-1-the-object.mp4`](videos/agency-prospect-1-the-object.mp4) |
| 2 | What goes inside | 0:35 | [`videos/agency-prospect-2-what-goes-inside.mp4`](videos/agency-prospect-2-what-goes-inside.mp4) |
| 3 | Why it matters | 0:36 | [`videos/agency-prospect-3-why-it-matters.mp4`](videos/agency-prospect-3-why-it-matters.mp4) |
| 4 | Where it is used | 0:36 | [`videos/agency-prospect-4-where-it-is-used.mp4`](videos/agency-prospect-4-where-it-is-used.mp4) |
| 5 | Before you use it | 0:58 | [`videos/agency-prospect-5-before-you-use-it.mp4`](videos/agency-prospect-5-before-you-use-it.mp4) |
| — | **Full series** | **3:21** | [`videos/agency-prospect-full-series.mp4`](videos/agency-prospect-full-series.mp4) |

Narration clips: [`videos/narration/`](videos/narration/). MP4/MP3 are stored with **Git LFS**.

## Layout

```
src/index.html        deterministic seek(t)/seekScene(i,t) canvas engine (5 act-based scenes)
scripts/narrate.mjs   Deepgram Aura TTS -> out/vo/secN.mp3  (reads DEEPGRAM_API_KEY from .env)
scripts/audio.mjs     synthesizes the 120 BPM music bed -> out/audio.wav
scripts/render-scenes.mjs  Playwright Chromium + ffmpeg-static -> out/sections/silentN.mp4
content/agency-prospects.txt  source narration script
```

## Reproduce

```bash
npm install                       # playwright + ffmpeg-static
npx playwright install chromium
echo "DEEPGRAM_API_KEY=..." > .env   # never commit this
node scripts/narrate.mjs          # narration clips + durations
node scripts/audio.mjs            # music bed
node scripts/render-scenes.mjs    # silent section videos
# then mux per-section with the bed + VO (see the commit history / session notes)
```

Notes:
- `capture` frames with `canvas.toDataURL('image/jpeg')` (~28 ms/frame); Playwright element screenshots are ~13× slower.
- Call `seekScene()` **inside** the same `page.evaluate` that reads the canvas, or frames render blank.
- `.env` and `node_modules/` are git-ignored.
