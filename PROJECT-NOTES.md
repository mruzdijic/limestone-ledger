# Project notes: The Limestone Ledger

*Read this first if you're coming back to the project later.* `README.md` covers setup and editing; this file records **where things stand, how the code is organized, what was decided, and why**.

Last updated: **23 November 2026**.

---

## At a glance

| | |
|---|---|
| **What** | Mobile-first digital scrapbook mystery: guests follow 4 riddles around downtown Kingston, unlock a page and take a photo at each stop, and save the finished scrapbook as one image. Low-fidelity prototype of a hotel offer (printed scrapbook + instant camera). |
| **Course** | ENIN 301 Creative Entrepreneurship, Queen's University, Team 37 ("Designing short-term stays guests talk about") |
| **Live site** | https://mruzdijic.github.io/limestone-ledger/ |
| **Postcard (print)** | https://mruzdijic.github.io/limestone-ledger/postcard.html (QR code verified to scan to the live site) |
| **Report screenshots** | https://mruzdijic.github.io/limestone-ledger/?demo=1 (also `&screen=consent`, `intro`, `stop1` … `stop4`, `&tabletop=1`) |
| **Repo** | https://github.com/mruzdijic/limestone-ledger (public, `main` branch, GitHub Pages from root) |
| **Local folder** | `C:\projects\ENIN301Site` |
| **Feedback form** | Google Form set as `FEEDBACK_FORM_URL` in `index.html` (anonymous, no sign-in required) |
| **Testing window** | 6–8 adult testers, until about 25 November 2026 |
| **Offline cache version** | `ledger-v6` in `sw.js` |

## Hard rules (from the course handout; never break)

1. **Photos never leave the phone.** No uploads, servers, cloud or image APIs.
2. **No personal information.** No login, names, emails, contact details, location, cookies, analytics or trackers.
3. **No third-party runtime resources.** No CDNs, Google Fonts or map tiles. Everything (fonts, sound, QR code) is served from the repo. A Content-Security-Policy in `index.html` enforces this.
4. **The only external link** is the anonymous feedback form.
5. **History must be accurate.** Only the verified facts in the config appear on the page. Anything new goes in a `// TODO: verify` comment first.

---

## How the code is organized

Everything runs in the browser; there is no build step. Edit the files directly and push.

```
index.html          the whole app: <style> design system, then <script>
sw.js               offline cache (network-first, 4 s fallback). Bump VERSION after any edit!
postcard.html       printable 6×4 in postcard; SITE_URL constant feeds the QR code
qr.js               offline QR generator (byte mode, level M, versions 1–10)
fonts/              Fraunces (serif) + Caveat (handwriting), OFL licences included
sounds/             page-flip.mp3 (page-turn sound)
icon.svg, manifest.webmanifest
tests/flow.test.js  end-to-end Playwright test (see "Testing" below)
README.md           setup, editing, privacy, choices, manual test checklist
```

**Inside `index.html`'s `<script>`**, in order:

1. **EDIT HERE block:** `FEEDBACK_FORM_URL` and `CONFIG` (story text, the 4 stops with clue / answers / hint / facts / keepsake, demo captions, `wrongTriesBeforeSkip`). Content changes only ever happen here.
2. **Core:** state (`localStorage` key `limestone-ledger-v1`), photos in IndexedDB (`limestone-ledger` database, stored as ArrayBuffers), in-memory fallback with a warning banner, answer matching (`norm`/`isCorrect`), photo processing (EXIF orientation, ≤1600 px JPEG at 0.85), `photoSquare()` (verified decode for the export).
3. **Screens:** page-turn sound (`playPageTurn`, `FLIP_START`/`FLIP_LEN`), `go()`/`render()` with direction-aware page turns, route progress bar, journal cover (consent), prologue letter, chapter pages (clue + 2-step hints), scrapbook pages (stamp, polaroid, field note), footer (Re-read story · Sound on/off · Start over).
4. **Illustrations:** inline SVG landmark art (recoloured to the palette), tabletop sketch map, demo-mode loader.
5. **Finale + export:** solved page (wax seal, assembled spread, field log, feedback), `buildScrapbookImage()` (1080×~2500 PNG canvas), Web Share / download.
6. **Boot.**

**Design system** (CSS variables at the top of `<style>`): parchment `#F5F0E6`, limestone `#D8CEBD`, forest `#344B3C` (all interactive), lake `#627F91`, brass `#AD9160`, charcoal `#292B28`, oxblood `#7E3B2F` (wax seals). Animations use **held frames** (`steps(1)` between hand-placed keyframes, about 12 fps) for a stop-motion feel; all are off under `prefers-reduced-motion`.

---

## History (what happened, in order)

1. **v1 build (22 Nov).** Static site per the original brief: consent → story → 4 stops → solved → save image; tabletop + demo modes; service worker; QR postcard; README. Fixes found while testing: `hidden` buttons still showing, the page-turn animation widening phones past 360 px, and WebKit not storing Blobs in IndexedDB (so photos are now stored as ArrayBuffers).
2. **Deployed (23 Nov)** to GitHub Pages; postcard pointed at the live URL.
3. **Bug: white photos in the exported image on mobile.** Photos were drawn before they had finished decoding. Fixed by decoding first, loading one at a time, verifying real pixels, and retrying another way if blank. The same check guards photo capture.
4. **Feedback form linked.**
5. **Visual redesign** ("a physical travel journal brought to life"): new palette, bundled fonts, journal cover that swings open, chapter pages with postmarks, unfolding hint notes, ink stamp on unlock, polaroids placed with tape or photo corners (varies per page), sticky illustrated route bar, stop-motion animation, assembled finale spread, restyled export image and postcard. Added a **second hint** (auto-generated: first letter + length of `answers[0]`) and a **keepsake** line per stop.
6. **Polish from team feedback:** centred the "Case Closed" wax seal (now red wax, matching the clerk's "TP" seal), riddles in the Caveat handwriting font sitting on the ruled lines, removed "(he's made up; the places aren't)" from the prologue, added a page-turn sound with a Sound on/off toggle.
7. **Sound replaced (23 Nov):** the synthesized sound was "too crispy" (79% of its energy above 3 kHz), so it was replaced with the team's recording `sounds/page-flip.mp3` (21% above 3 kHz). The silent lead-in is skipped, 1.3 s plays with a fade, and the quiet file is volume-boosted.

## Decisions worth remembering

- **Two photo buttons** (Take photo / From gallery): `capture="environment"` opens the camera directly with no gallery option on most phones.
- **Saving the image:** on iPhone, the share sheet ("Save Image" → Photos). On Android, a plain PNG download by default, because the Android share sheet can push to cloud apps; "Share or save with…" is offered as a second button.
- **Fonts are bundled** (about 180 KB) instead of system fonts, so the journal looks the same on every phone.
- **Hint 2 is generated from the first answer.** Keep the main answer **first** in each `answers` list.
- **Demo mode never writes to storage**, so it can't overwrite a tester's real progress.
- **Answers:** market · dome · arch / train / locomotive · tower / martello (plus synonyms in the config).

## Still open / to confirm

- [ ] **Sound licence:** `page-flip.mp3` is "Page Flip 1" by oxidvideos. The filename suggests Pixabay, whose licence allows free use without credit; confirm the source.
- [ ] **Google Form settings:** "Collect email addresses: Do not collect" and "Limit to 1 response: off" (that setting forces sign-in).
- [ ] **Real-phone checks** (README → "Please test by hand"): iPhone camera, Save Image to Photos, Reduce Motion, the sound on a speaker; Android download → Gallery; airplane mode after the first load.
- [ ] **Walk the route once:** every riddle's answer should be easy to spot on site; adjust the "30 to 60 minutes" estimate.
- [ ] **Print postcards** and scan a printed one before handing them out.

## Known limitations

- On iPhone, the **ring/silent switch mutes** the page-turn sound (normal for websites).
- Photos and progress live **in that phone's browser only**. Clearing site data, or a private tab, loses them (the app warns about private browsing).
- Step times are wall-clock from opening a clue to unlocking it, so breaks count.
- Public repo is required for free GitHub Pages; it contains no personal data.

---

## How to make changes later

1. Edit `index.html` (content: the `CONFIG` block at the top of the script) on GitHub with the pencil icon, or locally.
2. **Bump `VERSION` in `sw.js`** (`ledger-v6` → `ledger-v7`) so phones fetch the new copy.
3. Commit/push to `main`; GitHub Pages redeploys in about 30–60 seconds.
4. Testers reload the page once.

Locally: `cd C:\projects\ENIN301Site`, then `git pull` / `git push`. The GitHub CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` and signed in as `mruzdijic`.

## Testing

`tests/flow.test.js` runs the whole journey in a real browser engine and checks:
- no sideways scrolling
- the 18+ gate
- loose answer matching
- two hints, then skip
- photo shrink and EXIF rotation
- refresh persistence
- times table
- PNG export, including that the photos are really in it
- Start over clears everything
- demo mode
- zero external requests
- no script errors

```bash
# one-time setup (any empty folder, e.g. tests/):
cd tests
npm init -y && npm i playwright@1.49.1 && npx playwright install chromium webkit

# serve the site (from the project root, in another terminal):
python -m http.server 8765 --bind 127.0.0.1

# run: engine, width, height  (add RM=1 for reduced motion; BASE=<url> to test the live site)
node flow.test.js chromium 360 800
node flow.test.js webkit 390 844
BASE="https://mruzdijic.github.io/limestone-ledger/" node flow.test.js webkit 390 844
```

Screenshots and exported PNGs go to `tests/shots/` (git-ignored). Note: Playwright's WebKit build on Windows has no Web Audio and encodes "JPEG" as PNG, so its quirks aren't real iPhone bugs. Confirm on a real device.
