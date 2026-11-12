// EVOLVE — the weekly report as a PDF.
//
// Each A4 page is drawn on a canvas (so Arabic joins and reads right to left
// exactly like on screen), saved as a JPEG and placed on a page of a small PDF
// written here by hand — no library. On iPhone the file goes to the share
// sheet (Save to Files, WhatsApp, Mail, another app…); elsewhere it downloads.

const PAGE_W = 595.28, PAGE_H = 841.89;   // A4, points
const W = 1190, H = 1684;                  // canvas pixels (2 per point)
const M = 88, FOOT = 56, CW = W - 2 * M;
const C = { ink: "#0f1c16", sub: "#3d4b44", muted: "#6b7a72", line: "#dde5e0", tile: "#f1f5f2", head: "#eaf1ec", accent: "#087a3a", ok: "#087a3a", warn: "#a35a00" };
const KIND_COLOR = { train: "#087a3a", food: "#c2410c", up: "#087a3a", stall: "#a35a00", sync: "#1d6fa5", good: "#087a3a" };

// ── Drawing the blocks ───────────────────────────────────────────────────────
export function drawDoc(blocks, { lang = "en", title = "" } = {}) {
  const rtl = lang === "ar";
  const fam = rtl ? '"IBM Plex Sans Arabic", "Inter", sans-serif' : '"Inter", "IBM Plex Sans Arabic", sans-serif';
  const nums = '"Barlow Condensed", "Inter", sans-serif';
  const pages = [];
  let cv, ctx, y;
  const page = () => {
    cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.direction = rtl ? "rtl" : "ltr"; ctx.textBaseline = "alphabetic";
    pages.push(cv); y = M;
  };
  const room = (h) => { if (y + h > H - M - FOOT) { page(); return true; } return false; };
  const font = (size, weight = 400, f = fam) => { ctx.font = `${weight} ${size}px ${f}`; };
  const sx = (off) => (rtl ? W - M - off : M + off);   // x of an offset from the start edge
  const put = (s, off, yy, { color = C.ink, end = false, ltr = false } = {}) => {
    ctx.fillStyle = color;
    if (ltr && rtl) { ctx.direction = "ltr"; ctx.textAlign = end ? "left" : "right"; }
    else ctx.textAlign = end ? "end" : "start";
    ctx.fillText(String(s), sx(off), yy);
    ctx.direction = rtl ? "rtl" : "ltr";
  };
  const wrap = (s, maxW) => {
    const words = String(s ?? "").split(/\s+/).filter(Boolean), lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxW || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };
  const rect = (off, top, w, h, color, r = 14) => {
    const x = rtl ? W - M - off - w : M + off;
    ctx.fillStyle = color; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, top, w, h, r); else ctx.rect(x, top, w, h);
    ctx.fill();
  };
  const cellText = (c) => (c && typeof c === "object" ? c.text : c ?? "");
  const toneColor = (c, base) => (c && typeof c === "object" && c.tone ? C[c.tone] || base : base);

  page();
  for (const b of blocks) {
    if (b.type === "title") {
      font(50, 800); room(80); y += 50; put(b.text, 0, y, { color: C.accent }); y += 16;
    } else if (b.type === "sub") {
      font(24, 500); y += 30; put(b.text, 0, y, { color: C.muted }); y += 30;
    } else if (b.type === "h2") {
      room(150); y += 44;
      rect(0, y - 30, 8, 36, C.accent, 4);
      font(32, 800); put(b.text, 22, y, { color: C.ink }); y += 22;
    } else if (b.type === "p") {
      font(b.small ? 19 : 23, b.muted ? 400 : 500);
      const lh = b.small ? 28 : 36;
      for (const line of wrap(b.text, CW)) { room(lh); y += lh - 4; put(line, 0, y, { color: b.muted ? C.muted : C.sub }); y += 4; }
      y += 8;
    } else if (b.type === "stats") {
      const cols = 3, gap = 16, pad = 20, tw = (CW - gap * (cols - 1)) / cols;
      for (let i = 0; i < b.items.length; i += cols) {
        const row = b.items.slice(i, i + cols);
        const lay = row.map((it) => {
          font(19, 600); const l = wrap(it.l, tw - 2 * pad);
          font(18, 600); const d = it.d?.text ? wrap(it.d.text, tw - 2 * pad) : [];
          return { it, l, d, h: pad + 48 + 6 + l.length * 25 + (d.length ? 6 + d.length * 23 : 0) + pad };
        });
        const rh = Math.max(...lay.map((x) => x.h));
        room(rh + gap); y += 4;
        lay.forEach((x, j) => {
          const off = j * (tw + gap);
          rect(off, y, tw, rh, C.tile, 16);
          let yy = y + pad + 44;
          font(46, 700, nums); put(x.it.v, off + pad, yy, { color: C.ink }); yy += 10;
          font(19, 600); x.l.forEach((s) => { yy += 25; put(s, off + pad, yy - 4, { color: C.muted }); });
          if (x.d.length) { yy += 6; font(18, 600); x.d.forEach((s) => { yy += 23; put(s, off + pad, yy - 4, { color: toneColor(x.it.d, C.sub) }); }); }
        });
        y += rh + gap - 4;
      }
    } else if (b.type === "bars") {
      if (b.title) { font(22, 700); room(40); y += 34; put(b.title, 0, y, { color: C.sub }); y += 6; }
      const lw = 230, vw = 150, bw = CW - lw - vw - 20;
      for (const it of b.items) {
        room(40); y += 38;
        font(21, 600); put(it.l, 0, y - 6, { color: C.ink });
        rect(lw, y - 26, bw, 18, C.tile, 9);
        rect(lw, y - 26, Math.max(10, (it.v / (it.max || 1)) * bw), 18, C.accent, 9);
        font(21, 700); put(it.text, CW, y - 6, { color: C.sub, end: true });
      }
      y += 10;
    } else if (b.type === "table") {
      if (b.title) { font(22, 700); room(90); y += 36; put(b.title, 0, y, { color: C.sub }); y += 6; }
      const total = b.cols.reduce((a, c) => a + (c.w || 1), 0);
      const xs = []; let acc = 0;
      for (const c of b.cols) { const w = (CW * (c.w || 1)) / total; xs.push([acc, acc + w]); acc += w; }
      const pad = 12;
      const header = () => {
        room(46); y += 8; rect(0, y, CW, 44, C.head, 10);
        font(19, 700);
        b.cols.forEach((c, i) => put(c.h, c.end ? xs[i][1] - pad : xs[i][0] + pad, y + 29, { color: C.muted, end: !!c.end }));
        y += 44;
      };
      header();
      for (const row of b.rows) {
        font(21, 500);
        const lines = row.map((c, i) => (i === 0 ? wrap(cellText(c), xs[0][1] - xs[0][0] - 2 * pad) : [String(cellText(c))]));
        const rh = Math.max(...lines.map((l) => l.length)) * 28 + 18;
        if (room(rh)) header();
        font(21, 500);
        lines.forEach((ls, i) => {
          const col = b.cols[i];
          ls.forEach((s, k) => put(s, col.end ? xs[i][1] - pad : xs[i][0] + pad, y + 32 + k * 28, { color: toneColor(row[i], i === 0 ? C.ink : C.sub), end: !!col.end, ltr: !!col.ltr }));
        });
        y += rh;
        ctx.fillStyle = C.line; ctx.fillRect(M, y - 1, CW, 2);
      }
      y += 12;
    } else if (b.type === "list") {
      for (const it of b.items) {
        font(22, 500);
        const lines = wrap(it.text, CW - 40);
        room(lines.length * 34 + 12); y += 8;
        ctx.fillStyle = KIND_COLOR[it.kind] || C.accent; ctx.beginPath(); ctx.arc(sx(10), y + 20, 7, 0, Math.PI * 2); ctx.fill();
        lines.forEach((s) => { y += 34; put(s, 32, y - 4, { color: C.ink }); });
        y += 6;
      }
    } else if (b.type === "checkin" && b.text) {
      room(130); y += 44; rect(0, y - 30, 8, 36, C.accent, 4);
      font(32, 800); put(b.title || "", 22, y, { color: C.ink }); y += 14;
      font(23, 500); for (const line of wrap(b.text, CW)) { room(36); y += 32; put(line, 0, y, { color: C.sub }); y += 4; }
      y += 8;
    }
  }
  // Footer on every page: "Evolve · title · 2/3"
  pages.forEach((p, i) => {
    const c = p.getContext("2d");
    c.direction = rtl ? "rtl" : "ltr"; c.textAlign = "center"; c.fillStyle = C.muted; c.font = `500 18px ${fam}`;
    c.fillText(`Evolve · ${title} · ${i + 1}/${pages.length}`, W / 2, H - M / 2);
  });
  return pages;
}

// ── A minimal PDF: one JPEG per A4 page ─────────────────────────────────────
const enc = new TextEncoder();
const utf16hex = (s) => {
  let hex = "FEFF";
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    const units = cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp];
    units.forEach((u) => { hex += u.toString(16).toUpperCase().padStart(4, "0"); });
  }
  return `<${hex}>`;
};

// pages: [{ bytes: Uint8Array (JPEG), w, h }] → Uint8Array of a PDF file
export function pdfBytes(pages, { title = "" } = {}) {
  const chunks = []; let offset = 0; const offsets = [];
  const push = (d) => { const b = typeof d === "string" ? enc.encode(d) : d; chunks.push(b); offset += b.length; };
  const obj = (n, body) => { offsets[n] = offset; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
  push("%PDF-1.4\n"); push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const n = pages.length;
  const info = 3 + 3 * n;
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(" ")}] /Count ${n} >>`));
  pages.forEach((img, i) => {
    const p = 3 + 3 * i, im = p + 1, c = p + 2;
    obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${c} 0 R >>`));
    obj(im, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);
      push(img.bytes); push("\nendstream");
    });
    const content = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im${i} Do Q`;
    obj(c, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  });
  obj(info, () => push(`<< /Title ${utf16hex(title)} /Producer (Evolve) >>`));
  const xref = offset, size = info + 1;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let k = 1; k < size; k++) push(`${String(offsets[k]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(offset);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

const jpeg = (cv) => new Promise((resolve, reject) => cv.toBlob(async (b) => {
  if (!b) { reject(new Error("canvas")); return; }
  resolve({ bytes: new Uint8Array(await b.arrayBuffer()), w: cv.width, h: cv.height });
}, "image/jpeg", 0.88));

async function fontsReady(lang) {
  if (!document.fonts?.load) return;
  const fams = lang === "ar" ? ['"IBM Plex Sans Arabic"', '"Inter"'] : ['"Inter"'];
  const specs = [...fams.flatMap((f) => [`400 20px ${f}`, `600 20px ${f}`, `700 20px ${f}`]), '700 20px "Barlow Condensed"'];
  await Promise.all(specs.map((s) => document.fonts.load(s, "سعرة Evolve 0123").catch(() => null)));
}

export async function docToPdf(blocks, { lang, title }) {
  await fontsReady(lang);
  const pages = drawDoc(blocks, { lang, title });
  const imgs = [];
  for (const p of pages) imgs.push(await jpeg(p));
  return new Blob([pdfBytes(imgs, { title })], { type: "application/pdf" });
}

// Hand the file over: the share sheet where there is one (iPhone), else a download.
// Returns "shared" | "cancelled" | "downloaded" | "needs-tap" (share must follow a fresh tap).
export async function shareOrSave(blob, filename, { title } = {}) {
  const file = typeof File !== "undefined" ? new File([blob], filename, { type: blob.type }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return "shared"; }
    catch (e) {
      if (e?.name === "AbortError") return "cancelled";
      if (e?.name === "NotAllowedError") return "needs-tap";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "downloaded";
}
