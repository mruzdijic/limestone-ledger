/* Tiny offline QR code generator (byte mode, error correction level M, versions 1-10).
   Runs entirely in the browser, so no QR web service ever sees the URL.
   Usage: QR.svg("https://example.com", { scale: 8, margin: 4 }) -> SVG string
          QR.matrix(text) -> 2D array of booleans (true = dark)
   Based on the public QR Code spec (ISO/IEC 18004). */
(function (root) {
  "use strict";
  // [ecCodewordsPerBlock, blocksG1, dataPerBlockG1, blocksG2, dataPerBlockG2] for level M
  const EC_M = [null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  // GF(256) arithmetic, primitive polynomial 0x11D
  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    const r = new Array(degree).fill(0); r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) {
      const f = b ^ r.shift(); r.push(0);
      div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
  }

  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 0;
    for (let v = 1; v <= 10; v++) {
      const e = EC_M[v], cap = e[1] * e[2] + e[3] * e[4];
      const need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
      if (need <= cap * 8) { ver = v; break; }
    }
    if (!ver) throw new Error("Text too long for this QR generator (max ~210 bytes).");
    const [ecLen, b1, d1, b2, d2] = EC_M[ver];
    const capBytes = b1 * d1 + b2 * d2;
    // Bit stream
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, capBytes * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let p = 0; data.length < capBytes; p++) data.push(p % 2 ? 0x11 : 0xEC);
    // Blocks + error correction
    const div = rsDivisor(ecLen), blocks = [];
    let k = 0;
    for (let i = 0; i < b1 + b2; i++) {
      const len = i < b1 ? d1 : d2, dat = data.slice(k, k + len); k += len;
      blocks.push({ dat, ec: rsRemainder(dat, div) });
    }
    const out = [];
    const maxD = Math.max(d1, d2);
    for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.dat.length) out.push(b.dat[i]); });
    for (let i = 0; i < ecLen; i++) blocks.forEach(b => out.push(b.ec[i]));
    return { ver, codewords: out };
  }

  function build(ver, codewords, mask) {
    const size = ver * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
    // timing
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    // finders + separators
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    });
    // alignment
    const al = ALIGN[ver], n = al.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // format info (level M = 0b00)
    const fdata = (0 << 3) | mask;
    let rem = fdata;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fbits = ((fdata << 10) | rem) ^ 0x5412;
    const fb = i => ((fbits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, fb(i));
    set(8, 7, fb(6)); set(8, 8, fb(7)); set(7, 8, fb(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, fb(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fb(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, fb(i));
    set(8, size - 8, true);
    // version info
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const vb = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const bit = ((vb >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3);
        set(a, b, bit); set(b, a, bit);
      }
    }
    // data (zigzag)
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (fn[y][x]) continue;
        if (bi < codewords.length * 8) m[y][x] = ((codewords[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1;
        bi++;
      }
    }
    // mask
    const MASKS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
      if (!fn[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
    return m;
  }

  function penalty(m) {
    const size = m.length; let p = 0, dark = 0;
    const lines = [];
    for (let i = 0; i < size; i++) { lines.push(m[i]); lines.push(m.map(r => r[i])); }
    for (const line of lines) {
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && line[i] === line[i - 1]) run++;
        else { if (run >= 5) p += run - 2; run = 1; }
      }
      const s = line.map(b => (b ? "1" : "0")).join("");
      let idx = -1;
      while ((idx = s.indexOf("1011101", idx + 1)) !== -1) {
        if (s.slice(Math.max(0, idx - 4), idx) === "0000" && idx >= 4) p += 40;
        else if (s.slice(idx + 7, idx + 11) === "0000") p += 40;
      }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    m.forEach(r => r.forEach(b => { if (b) dark++; }));
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  }

  function matrix(text) {
    const { ver, codewords } = encode(text);
    let best = null, bestP = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const mm = build(ver, codewords, mask), pp = penalty(mm);
      if (pp < bestP) { bestP = pp; best = mm; }
    }
    return best;
  }

  function svg(text, opts) {
    const o = Object.assign({ scale: 8, margin: 4, dark: "#000", light: "#fff" }, opts || {});
    const m = matrix(text), n = m.length + o.margin * 2;
    let d = "";
    m.forEach((row, y) => row.forEach((b, x) => { if (b) d += `M${x + o.margin} ${y + o.margin}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * o.scale}" height="${n * o.scale}" shape-rendering="crispEdges" role="img" aria-label="QR code linking to ${text.replace(/[<>&"]/g, "")}"><rect width="${n}" height="${n}" fill="${o.light}"/><path d="${d}" fill="${o.dark}"/></svg>`;
  }

  root.QR = { matrix, svg };
  if (typeof module !== "undefined") module.exports = root.QR;
})(typeof window !== "undefined" ? window : globalThis);
