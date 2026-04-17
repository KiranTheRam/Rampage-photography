import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const PHOTOS_DIR = join(ROOT, "public", "photos");
const DATA_DIR = join(ROOT, "data");
const METADATA = join(DATA_DIR, "photos.json");

const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic"]);

function normalizePhoto(photo) {
  return {
    filename: photo.filename,
    width: photo.width ?? 0,
    height: photo.height ?? 0,
    title: photo.title ?? "",
    caption: photo.caption ?? "",
    addedAt: photo.addedAt ?? new Date().toISOString(),
  };
}

async function loadExisting() {
  try {
    const raw = await readFile(METADATA, "utf8");
    return JSON.parse(raw);
  } catch {
    return { photos: [] };
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const existing = await loadExisting();
  const byFilename = new Map(existing.photos.map((p) => [p.filename, normalizePhoto(p)]));

  const entries = await readdir(PHOTOS_DIR);
  const files = entries
    .filter((f) => EXTS.has(extname(f).toLowerCase()))
    .filter((f) => !f.startsWith("."));

  const photos = [];
  for (const filename of files) {
    const prev = byFilename.get(filename);
    if (prev && prev.width && prev.height) {
      photos.push(normalizePhoto(prev));
      continue;
    }
    const full = join(PHOTOS_DIR, filename);
    try {
      const meta = await sharp(full).metadata();
      const s = await stat(full);
      const photo = {
        filename,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        title: prev?.title ?? "",
        caption: prev?.caption ?? "",
        addedAt: prev?.addedAt ?? s.birthtime?.toISOString() ?? new Date().toISOString(),
      };
      photos.push(normalizePhoto(photo));
      process.stdout.write(`  ${filename} ${meta.width}x${meta.height}\n`);
    } catch (err) {
      console.error(`! skipped ${filename}: ${err.message}`);
    }
  }

  photos.sort((a, b) => (b.addedAt > a.addedAt ? 1 : -1));
  await writeFile(METADATA, JSON.stringify({ photos }, null, 2));
  console.log(`\nWrote metadata for ${photos.length} photos to ${METADATA}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
