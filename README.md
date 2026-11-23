# The Limestone Ledger: A Kingston Scrapbook Mystery

> **Coming back later?** Start with [PROJECT-NOTES.md](PROJECT-NOTES.md): where things stand, how the code is organized, history and open items.

A low-fidelity prototype for ENIN 301 (Creative Entrepreneurship), Queen's University, Team 37.
Guests scan a QR code on a postcard, follow four riddles to downtown Kingston landmarks, add a photo at each stop, and save the finished scrapbook as one image.

It's a static website with no server, no sign-up, no analytics, and nothing loaded from other websites. Photos never leave the phone.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The whole app (design, story, clues, logic). **The clues and the feedback link are at the top of the `<script>` section.** |
| `sw.js` | Service worker: keeps the site working on a weak signal once it has loaded. |
| `postcard.html` | Printable 6×4 in postcard (front and back) with a QR code. |
| `qr.js` | Small QR code generator used by the postcard. It runs offline, so no QR website ever sees your link. |
| `fonts/` | Bundled fonts: **Fraunces** (headings) and **Caveat** (handwriting), both SIL Open Font License (licence files included). Served from the repo, so no font service is contacted. |
| `sounds/` | The page-turn sound (MP3, about 80 KB). |
| `tests/flow.test.js` | Automated end-to-end test (how to run it: see PROJECT-NOTES.md). |
| `PROJECT-NOTES.md` | Project state, history, decisions, open items. |
| `icon.svg`, `manifest.webmanifest` | Browser tab icon and "Add to Home Screen" info. |

---

## 1. Put it online with GitHub Pages (about 10 minutes, free)

1. Go to <https://github.com> and sign in, or create a free account.
2. Click the **+** at the top right, then **New repository**.
   - **Repository name:** something like `limestone-ledger` (it becomes part of the web address).
   - Choose **Public**. Free GitHub Pages requires a public repository; that's fine, because the site contains no personal data.
   - Click **Create repository**.
3. On the new repository page, click the **uploading an existing file** link (or **Add file → Upload files**).
4. Drag in **all the files in this folder**: `index.html`, `sw.js`, `postcard.html`, `qr.js`, `icon.svg`, `manifest.webmanifest`, `README.md`. Click **Commit changes**.
5. Go to **Settings** (tab at the top of the repository) → **Pages** (left sidebar).
6. Under **Build and deployment → Source**, choose **Deploy from a branch**. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
7. Wait 1 to 2 minutes and refresh the Settings → Pages screen. A box appears saying **"Your site is live at https://YOUR-USERNAME.github.io/limestone-ledger/"**. That's your live URL. Open it on your phone to check.

## 2. Paste in the Google Form link

1. In your Google Form, make sure **Settings → Responses → Collect email addresses** is set to **Do not collect**, and that sign-in is **not** required.
2. Click **Send** → the link icon → copy the link.
3. On GitHub, open `index.html` and click the **pencil icon** (Edit).
4. Near the top of the script you'll see:
   ```js
   const FEEDBACK_FORM_URL = "PASTE_FORM_LINK_HERE";
   ```
   Replace `PASTE_FORM_LINK_HERE` with your link, keeping the quotes, for example `"https://forms.gle/AbC123"`.
5. Click **Commit changes**. The site updates within a minute or two.

Until a real link (starting with `https://`) is pasted, the final page shows a greyed-out "Feedback form coming soon" button.

## 3. Make the postcard

1. On GitHub, edit `postcard.html`. Near the bottom, find:
   ```js
   const SITE_URL = "https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/";
   ```
   Paste your live URL from step 1.7, then commit.
2. Open `https://YOUR-USERNAME.github.io/limestone-ledger/postcard.html` on a computer and print it (instructions are on the page: 4×6 in paper, margins **None**, **Background graphics** on).
3. **Scan the printed QR code with a phone before handing cards out.**

## 4. Editing clues, answers, hints and facts

Everything is in one block at the top of the `<script>` in `index.html`, between `EDIT HERE` and `END OF EDITABLE SECTION`. Each stop looks like this:

```js
{
  name: "Springer Market Square",
  place: "Behind City Hall, at King and Brock streets",
  clue: "Where King meets Brock, ...",          // \n = new line
  answers: ["market", "marketplace", ...],      // any of these unlocks the page
  hint: "Head to the big open square ...",
  facts: ["A public market has run on this square since 1801 ...", "..."],
  photoPrompt: "...", captionPlaceholder: "...",
  illustration: "market",                       // leave as is
  keepsake: "A public market here since 1801",  // one short line under the photo in the final spread
},
```

- **Answers** are matched loosely: capitals, extra spaces, punctuation, "the"/"a", and a plural "s" are all ignored. So `"tower"` also accepts `The Towers`. To accept another word, add it to the list in quotes, separated by commas.
- **Facts:** keep to verified facts only. Put anything unverified in a comment marked `// TODO: verify`, not on the page.
- The **story** (intro, clerk's note, solution) is in `story:` in the same block.
- **Hints come in two steps.** The first is your `hint:` text. The second is written automatically from the first answer in `answers` ("starts with D and has 4 letters"), so **keep the main answer first in the list**.
- `keepsake:` is a short line shown under each photo on the final spread and in the saved image. Keep it to the verified facts.
- `wrongTriesBeforeSkip: 2` controls when the Skip button appears (it also appears right after the first hint).
- Edit carefully: keep the quotes and commas. If the page goes blank after an edit, a quote or comma is probably missing; use the repository's **History** to compare or revert.
- **After changing `index.html`, also edit `sw.js` and bump the number in `const VERSION = "ledger-v6"`** (to v7, then v8, and so on). That makes sure phones that already opened the site get the new version.

## 5. Demo mode (clean screenshots for the report)

Add `?demo=1` to the address. All four frames are filled with drawn illustrations (no people) and sample captions. Demo mode never saves anything, so it won't disturb a real tester's progress.

- `.../?demo=1`: solved page with the full scrapbook spread
- `.../?demo=1&screen=consent`, `&screen=intro`, `&screen=stop1` … `&screen=stop4`: individual pages
- add `&tabletop=1` to show the tabletop map

## 6. Tabletop mode

On the story page, testers who can't walk the route can tick **"Doing this from a table?"**. This shows a sketch map of the four stops (drawn in the page, no map service) and lets them add any photo from their gallery. The riddles stay the same.

---

## Design system (v2 redesign)

The idea: **a physical travel journal that has come to life.**

- **Palette:** parchment `#F5F0E6`, limestone `#D8CEBD`, forest green `#344B3C` (all buttons and interactive elements), lake blue `#627F91` and antique brass `#AD9160` as sparing accents, charcoal `#292B28` for text. All colours are CSS variables at the top of the `<style>` block.
- **Type:** Fraunces (serif) for titles and story; the phone's own sans-serif for instructions, clues and buttons (most readable outdoors); Caveat (handwriting) for captions, annotations and notes.
- **Journey:** a cloth-bound journal **cover** (welcome) swings open into the **prologue**. Each stop is a **chapter** (I–IV) with a postmark, a handwritten annotation and the clue on a ruled card with a folded corner. Hints are **notes that unfold** out of the margin. Unlocking **presses an ink stamp** ("FOUND", or "VISITED" if skipped) onto the page. Photos are **placed** onto the page as a polaroid with tape or photo corners, a different arrangement on each page. The finale **assembles all four polaroids** into one spread.
- **Progress:** a sticky route bar at the top shows the four stops as small landmark icons on a dashed route: filled when found, ringed in brass where you are, dashed when still ahead. Tap a visited stop to flip back to it.
- **Stop-motion animation:** animations are built from held frames (CSS `steps(1)` between hand-placed keyframes, about 12 fps) with small deliberate imperfections, so objects get *placed and settle* instead of gliding. Each one is short (0.3 to 0.8 s) and plays only in response to the visitor, with no constant decorative movement. With **Reduce Motion** turned on (iPhone: Settings → Accessibility → Motion), every animation is off and everything still works.
- **Buttons** press down physically (their edge shadow disappears and they drop 3 px).
- **Page-turn sound:** `sounds/page-flip.mp3` ("Page Flip 1" by oxidvideos, downloaded by the team; the filename suggests Pixabay, whose licence allows free use without credit, so please confirm the source). It plays on each page change and when the cover opens, served from this site, with nothing loaded from elsewhere. The app skips the file's silent first 0.7 s, plays 1.3 s with a short fade, and boosts the quiet recording. To use a different sound, replace that file (keep the name) and adjust `FLIP_START`/`FLIP_LEN` in `index.html`. Guests can switch it off with **Sound: on/off** at the bottom of any page. On iPhone, the silent switch mutes it.

## Privacy, as built

- **No network requests** besides the site's own files (checked with automated browser tests). A Content-Security-Policy in the page blocks loading anything from other websites, even by accident.
- **No** cookies, analytics, fonts from Google, CDNs, maps, or QR services.
- Progress is stored in the phone's **localStorage**; photos are stored in the phone's **IndexedDB**. Neither leaves the device. **Start over** (bottom of each page) erases both after a confirmation.
- Step times are recorded on the phone only and shown on the final page, so testers can choose to report them in the form.
- The only external link is the feedback form, which opens in a new tab and is sent no referrer.
- Note: GitHub (which hosts the site) keeps standard server logs, like any website host; the site itself adds no tracking. Google will see visits to the feedback form, as with any Google Form.

## Choices made (and why)

- **Title:** kept "The Limestone Ledger: A Kingston Scrapbook Mystery". The fictional clerk is **Thaddeus Penwright** (clearly labelled as made up).
- **Two photo buttons:** on most phones, `capture="environment"` opens the camera *directly* with no gallery option. So each stop has **Take photo** (camera) and **From gallery**. In tabletop mode, the single button opens the normal picker.
- **Answers:** Market Square → `market`; City Hall → `dome`; Confederation Park → `arch` **or** `train`/`locomotive`; Shoal Tower → `tower`/`martello`. Synonyms are in the config.
- **Saving the scrapbook:** on iPhone, the main button opens the share sheet so the guest can tap **Save Image** (saved to Photos). On Android, the main button downloads a PNG, which shows up in Gallery/Photos; a secondary **Share or save with…** button is offered too. The Android share sheet can push photos to cloud apps, so a plain download is the safer default. There's also a preview the guest can press and hold to save.
- **The image** is 1080 px wide, about 2,500 px tall, in the same style as the app: title, four taped polaroids in a 2×2 grid with handwritten captions, chapter names and keepsake lines, the solution card with a wax seal, and the date. Missing photos show a tasteful "a page left for next time" frame.
- **Photos** are shrunk to at most 1600 px on the long edge (JPEG, quality 0.85) and rotated correctly for iPhone photos.
- **Storage failure** (e.g., some private-browsing modes): the app keeps working in memory and shows a small banner saying a refresh will lose progress.
- **Fonts:** Fraunces and Caveat are bundled in `fonts/` (about 180 KB in total) so the journal looks the same on every phone. They load from the site itself, never from a font service.
- **Service worker:** network first, falling back to the saved copy after 4 seconds or when offline, so edits reach testers quickly.
- **Time estimate** on the welcome screen ("about 30 to 60 minutes") is a guess; adjust it in `index.html` after the first tests.

## What was tested automatically

Playwright, in Chromium (Android-like) and WebKit (Safari engine), at 360×800, 390×844 and 1280×800 (desktop), plus two runs with reduced motion turned on:
consent gate → story → wrong answers → two progressive hints → skip → correct answers with odd casing → camera and gallery photo → caption → **refresh** (progress, photos and captions survive) → stop with no photo → solved page → times table → **PNG download** (1080×2498, with a check that the photos really appear in it) → **Start over** (localStorage and IndexedDB empty) → demo mode. Results: **no horizontal scrolling**, **zero external requests**, **no script errors**. A test photo tagged "rotate 90°" came out upright and shrunk to 1067×1600. The QR generator was checked by decoding its output with a separate QR reader.

## Please test by hand before testers go out

**On a real iPhone (Safari):**
- [ ] Scan the printed postcard QR; the site opens.
- [ ] **Add photo** opens the camera; a portrait photo appears the right way up.
- [ ] **From gallery** lets you pick an existing photo (including a Live Photo).
- [ ] Lock the phone mid-walk, reopen Safari: you're still on the right stop and photos are still there.
- [ ] On the last page, **Save to Photos** → share sheet → **Save Image** → check it in the Photos app and that nothing is cut off.
- [ ] **Give anonymous feedback** opens the form in a new tab; switching back keeps the scrapbook.
- [ ] Try once in a Private tab: the yellow "refreshing will lose your progress" note appears and everything else still works.
- [ ] Text is readable outdoors in sunlight.

**On a real Android phone (Chrome):**
- [ ] QR opens the site; **Add photo** opens the camera; **From gallery** opens the picker.
- [ ] **Download my scrapbook** saves a PNG; it appears in Files/Downloads and in Google Photos or Gallery.
- [ ] Photos survive switching apps and coming back (Android sometimes reloads the tab after the camera closes; progress should still be there).
- [ ] Turn on airplane mode after loading the site once: the pages still open.

**On site, once:** walk the route and check every riddle is fair and every answer is visible (dome, arch, locomotive, tower), and that the time estimate is realistic.
