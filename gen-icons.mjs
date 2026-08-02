import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const base = "C:/Users/Usuario/Documents/só/so-cookies-app";
const out = `${base}/public/icons`;

mkdirSync(out, { recursive: true });

const svg = readFileSync(`${base}/assets/logo-source.svg`, "utf8");
const m = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
if (!m) throw new Error("embedded PNG not found in SVG");
const embedded = Buffer.from(m[1], "base64");

async function silhouette({ white }) {
  const { data, info } = await sharp(embedded)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.max(data[i], data[i + 1], data[i + 2]);
    out[i] = white ? 255 : 0;
    out[i + 1] = white ? 255 : 0;
    out[i + 2] = white ? 255 : 0;
    out[i + 3] = g;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer();
}

async function makeIcon(size, scale, name) {
  const mark = await silhouette({ white: true });
  const logoBuf = await sharp(mark)
    .clone()
    .resize({
      width: Math.round(size * scale),
      height: Math.round(size * scale),
      fit: "inside",
    })
    .png()
    .toBuffer();

  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: [17, 17, 17, 255] },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toBuffer();

  await sharp(buf).toFile(`${out}/${name}.png`);
  console.log(`generated ${name}.png (${size}x${size})`);
}

await makeIcon(180, 0.8, "apple-touch-icon");
await makeIcon(192, 0.8, "icon-192");
await makeIcon(512, 0.8, "icon-512");
await makeIcon(512, 0.6, "icon-512-maskable");

async function makeSplash(width, height, name) {
  const mark = await silhouette({ white: false });
  const logoHeight = Math.round(height * 0.16);
  const logoBuf = await sharp(mark)
    .clone()
    .resize({ width: Math.round(width * 0.5), height: logoHeight, fit: "inside" })
    .png()
    .toBuffer();

  const buf = await sharp({
    create: { width, height, channels: 4, background: [247, 243, 236, 255] },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toBuffer();

  await sharp(buf).toFile(`${out}/${name}.png`);
  console.log(`generated ${name}.png (${width}x${height})`);
}

await makeSplash(1179, 2556, "splash-1179x2556");
await makeSplash(1284, 2778, "splash-1284x2778");
await makeSplash(1290, 2796, "splash-1290x2796");
await makeSplash(1206, 2622, "splash-1206x2622");
