// End-to-end check of the Limestone Ledger. Usage: node flow.test.js <chromium|webkit> <width> <height>
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const BASE = process.env.BASE || "http://localhost:8765/";
const OUT = path.join(__dirname, "shots");   // screenshots + exported PNGs land here (git-ignored)
fs.mkdirSync(OUT, { recursive: true });
const [engine = "chromium", W = "360", H = "800"] = process.argv.slice(2);
const RM = process.env.RM === "1";
const tag = `${engine}-${W}x${H}${RM ? "-rm" : ""}`;
const results = [];
const check = (name, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`); };

function addExifOrientation6(jpeg) {
  const app1 = Buffer.from([0xFF, 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 8,
    0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
  return Buffer.concat([jpeg.slice(0, 2), app1, jpeg.slice(2)]);
}

(async () => {
  const browser = await (engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2, isMobile: engine === "chromium" && +W < 700, hasTouch: +W < 700, acceptDownloads: true, reducedMotion: RM ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const external = [];
  page.on("request", r => { if (!r.url().startsWith(BASE) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) external.push(r.url()); });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const noHScroll = async (label) => {
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(`no horizontal scroll: ${label}`, sw <= iw, `${sw} vs ${iw}`);
  };
  const shot = async n => { await page.waitForTimeout(1100); return page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`), fullPage: true }); };

  // Make a landscape JPEG (1800x1200, red bar on TOP) tagged with EXIF orientation 6 (= rotate 90° clockwise).
  const gen = await chromium.launch(); const gp = await gen.newPage();
  const b64 = await gp.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 1800; c.height = 1200;
    const x = c.getContext("2d"); x.fillStyle = "#4a90d9"; x.fillRect(0, 0, 1800, 1200);
    x.fillStyle = "#ff0000"; x.fillRect(0, 0, 1800, 200);
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  await gen.close();
  const jpgPath = path.join(OUT, "test-exif6.jpg");
  fs.writeFileSync(jpgPath, addExifOrientation6(Buffer.from(b64, "base64")));

  await page.goto(BASE);
  await noHScroll("consent");
  await shot("01-consent");
  check("start disabled before 18+ checkbox", await page.locator("#startBtn").isDisabled());
  await page.check("#adult");
  await page.click("#startBtn");
  await page.waitForSelector("text=A clerk's last riddle");
  await page.check("#tabletop"); await page.waitForSelector("svg.map");
  await noHScroll("intro + map"); await shot("02-intro-tabletop");
  await page.uncheck("#tabletop");
  await page.click("#toFirst");

  // Stop 1: two wrong answers -> skip appears; then correct answer with odd casing/spaces
  await page.fill("#answer", "church"); await page.click("#answerForm button[type=submit]");
  check("skip hidden after 1 wrong", await page.locator("#skipBtn").isHidden());
  await page.fill("#answer", "fountain"); await page.click("#answerForm button[type=submit]");
  check("skip visible after 2 wrong", await page.locator("#skipBtn").isVisible());
  await noHScroll("stop 1 locked"); await shot("03-stop1-locked");
  await page.fill("#answer", "  The MARKET  "); await page.click("#answerForm button[type=submit]");
  await page.waitForSelector("text=Did you know?");
  await page.waitForTimeout(900); await noHScroll("stop 1 stamp"); await shot("04a-stop1-stamp");
  check("loose match: '  The MARKET  ' accepted", true);
  await page.setInputFiles("#photoInput", jpgPath);
  await page.waitForSelector("#photoBox img");
  const dims = await page.evaluate(() => { const i = document.querySelector("#photoBox img"); return [i.naturalWidth, i.naturalHeight]; });
  check("photo shrunk to 1600 long edge and EXIF-rotated to portrait", dims[0] === 1067 && dims[1] === 1600, dims.join("x"));
  const redRight = await page.evaluate(async () => {
    const i = document.querySelector("#photoBox img"); const c = document.createElement("canvas");
    c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext("2d"); x.drawImage(i, 0, 0);
    const r = x.getImageData(c.width - 20, c.height / 2, 1, 1).data, l = x.getImageData(20, c.height / 2, 1, 1).data;
    return r[0] > 200 && r[2] < 80 && l[2] > 150;
  });
  check("orientation correct (red bar on right after 90° CW)", redRight);
  await page.waitForTimeout(1200);
  await page.fill("#caption", "Apples & <b>tags</b>");
  await noHScroll("stop 1 unlocked"); await shot("04-stop1-unlocked");
  await page.click("#nextBtn");

  // Stop 2: two progressive hints -> skip
  await page.click("#hintBtn");
  check("skip visible after hint", await page.locator("#skipBtn").isVisible());
  await page.waitForTimeout(800); await shot("03b-hint1");
  await page.click("#hintBtn");
  await page.waitForTimeout(800);
  check("second hint reveals first letter + length", /starts with .D. and has 4 letters/.test(await page.locator("#hintBox").innerText()));
  check("hint button gone after 2 hints", await page.locator("#hintBtn").isHidden());
  await noHScroll("stop 2 hints"); await shot("03c-hint2");
  await page.click("#skipBtn");
  await page.waitForSelector("text=Kingston City Hall");
  await page.setInputFiles("#galleryInput", jpgPath); await page.waitForSelector("#photoBox img");
  await page.click("#nextBtn");

  // Reload mid-trail: progress + photos should survive
  await page.reload();
  await page.waitForSelector(".chap-no:has-text('Chapter III of')");
  check("progress survives refresh (on clue 3)", true);
  await page.locator("[data-goto='0']").click();
  await page.waitForSelector("#photoBox img");
  check("stop 1 photo survives refresh", true);
  check("caption survives refresh and is escaped", (await page.inputValue("#caption")) === "Apples & <b>tags</b>");
  await page.locator("[data-goto='2']").click();

  // Stop 3: synonym; Stop 4: no photo
  await page.fill("#answer", "Locomotive"); await page.press("#answer", "Enter");
  await page.waitForSelector("text=Confederation Park");
  await page.click("#nextBtn");
  await page.fill("#answer", "martello towers"); await page.click("#answerForm button[type=submit]");
  await page.waitForSelector("text=Shoal Tower");
  await page.click("text=Solve the mystery");

  // Solved
  await page.waitForSelector("#dlLink, #shareBtn", { timeout: 15000 });
  await page.waitForTimeout(1600);
  await noHScroll("solved"); await shot("05-solved");
  const times = await page.locator("table.times").innerText();
  check("times table shows hint/skip notes", /hints? used/.test(times) && /skipped/.test(times) && /2 wrong tries/.test(times));
  const dl = page.locator("#dlLink");
  if (await dl.count()) {
    const [d] = await Promise.all([page.waitForEvent("download"), dl.click()]);
    const p = path.join(OUT, `${tag}-scrapbook.png`); await d.saveAs(p);
    const buf = fs.readFileSync(p);
    check("scrapbook PNG downloaded", buf.slice(1, 4).toString() === "PNG", `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);

    const px = await page.evaluate(async b64 => {
      const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode();
      const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d"); x.drawImage(i, 0, 0);
      return [[280, 650], [800, 650]].map(([a, b]) => Array.from(x.getImageData(a, b, 1, 1).data.slice(0, 3)));
    }, buf.toString("base64"));
    check("exported photos 1 and 2 actually drawn (not white)", px.every(([r, g, b]) => !(r > 235 && g > 235 && b > 235)), JSON.stringify(px));
  } else check("scrapbook PNG link present", false);

  // Start over
  await page.click("text=Start over");
  await page.click("#resetOk");
  await page.waitForSelector("#adult");
  const leftovers = await page.evaluate(async () => {
    const ls = Object.keys(localStorage).length;
    const dbs = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : [];
    return { ls, dbs };
  });
  check("start over clears localStorage + IndexedDB", leftovers.ls === 0 && !leftovers.dbs.includes("limestone-ledger"), JSON.stringify(leftovers));
  await page.reload(); await page.waitForSelector("#adult");
  check("after reload, back at consent screen", true);

  // Demo mode
  for (const sc of ["solved", "stop1", "intro"]) {
    await page.goto(BASE + "?demo=1&screen=" + sc);
    await page.waitForTimeout(sc === "solved" ? 1500 : 600);
    await noHScroll("demo " + sc); await shot("demo-" + sc);
  }
  const demoLs = await page.evaluate(() => Object.keys(localStorage).length);
  check("demo mode doesn't write to storage", demoLs === 0);

  await page.goto(BASE + "postcard.html"); await page.waitForTimeout(300); await shot("postcard");

  check("zero external network requests", external.length === 0, external.join(", "));
  check("no JS errors", errors.length === 0, errors.join(" | "));
  console.log(`== ${tag} ==\n` + results.join("\n"));
  await browser.close();
  process.exit(results.some(r => r.startsWith("FAIL")) ? 1 : 0);
})().catch(e => { console.log(`== ${tag} ==\n` + results.join("\n") + "\nCRASH: " + e.message); process.exit(2); });
