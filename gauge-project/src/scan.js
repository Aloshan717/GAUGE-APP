// Getting an InBody photo or PDF to /api/scan.
//
// Phone photos are routinely 3–8 MB. Base64 adds a third, and Vercel refuses
// any request over 4.5 MB with a plain-text "Request Entity Too Large" — which
// used to surface as a JSON parse error, so the scan simply "didn't read".
// Photos are therefore redrawn on a canvas: at most 2400 px on the long side
// (still sharp enough to read every number on an A4 sheet) and re-encoded as
// JPEG. That also turns HEIC/other formats the browser can show into a JPEG.

import { fitWithin, scanHttpError } from "./logic";

const MAX_SIDE = 2400;
const MAX_BYTES = 3.2 * 1024 * 1024;   // ≈ 4.3 MB once base64-encoded

const mb = (n) => (n / 1024 / 1024).toFixed(1);

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("Couldn't read that file."));
    r.readAsDataURL(blob);
  });
}

async function decodeImage(file) {
  // createImageBitmap applies the EXIF rotation, so sideways phone photos
  // reach the reader upright.
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* fall back */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("This photo format can't be opened here. Take a screenshot of the photo and upload that, or choose a JPG/PNG.");
  }
}

function encode(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

async function shrinkImage(file) {
  const img = await decodeImage(file);
  const release = () => { if (img.close) img.close(); else if (img.src?.startsWith("blob:")) URL.revokeObjectURL(img.src); };
  const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
  for (const [side, quality] of [[MAX_SIDE, 0.88], [2000, 0.8], [1600, 0.75]]) {
    const size = fitWithin(w, h, side);
    const canvas = document.createElement("canvas");
    canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";               // transparent PNGs → white, not black
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(img, 0, 0, size.width, size.height);
    const blob = await encode(canvas, quality);
    if (blob && blob.size <= MAX_BYTES) {
      release();
      return { media_type: "image/jpeg", data: await toBase64(blob) };
    }
  }
  release();
  throw new Error("That photo is too large to send even after shrinking it. Try a screenshot of it instead.");
}

export async function prepareScanFile(file) {
  if (!file) throw new Error("No file selected.");
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (isPdf) {
    if (file.size > MAX_BYTES) {
      throw new Error(`That PDF is ${mb(file.size)} MB — the limit is ${mb(MAX_BYTES)} MB. Take a photo or screenshot of the result page instead.`);
    }
    return { media_type: "application/pdf", data: await toBase64(file) };
  }
  return shrinkImage(file);
}

// Sends the prepared file and returns the raw reading from the server.
// Errors are thrown with a message that can be shown as-is.
export async function requestScan(payload, token) {
  let res;
  try {
    res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No connection — the scan wasn't sent. Try again when you're online.");
  }
  const text = await res.text().catch(() => "");
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!res.ok || !body?.reading) throw new Error(scanHttpError(res.status, body));
  return body.reading;
}
