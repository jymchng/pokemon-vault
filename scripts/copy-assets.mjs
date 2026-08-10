// Copies the static `public/` folder into `.next/public` so Netlify's
// `publish = ".next"` serves `/images/*`, `/favicon.ico`, etc.
// (Netlify only publishes one directory; without this, static assets
// referenced from `/` 404 on the deployed site.)
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "public");
const dst = join(root, ".next", "public");

if (!existsSync(src)) {
  console.log("public/ not found — nothing to copy");
  process.exit(0);
}

cpSync(src, dst, { recursive: true });
console.log(`copied public/ -> .next/public`);
