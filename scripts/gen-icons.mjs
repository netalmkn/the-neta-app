// Generates PWA icons from an SVG using sharp
import sharp from "sharp";
import { writeFileSync } from "fs";

// Indigo (#6366F1) background with white "N" — matches the app's accent
const makeSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#6366F1"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="700" font-size="${size * 0.52}" fill="white">N</text>
</svg>`;

const sizes = [
  { file: "icon-192.png",        size: 192 },
  { file: "icon-512.png",        size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of sizes) {
  const svg = Buffer.from(makeSvg(size));
  await sharp(svg).png().toFile(`public/icons/${file}`);
  console.log(`✓ public/icons/${file}`);
}
