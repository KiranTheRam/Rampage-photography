import { isAuthed } from "@/lib/auth";
import { loadVolumes, createVolume } from "@/lib/volumes";
import {
  MAX_TITLE_LENGTH,
  enforceSameOrigin,
  jsonNoStore,
  sanitizeText,
} from "@/lib/security";

export const dynamic = "force-dynamic";

function safeVolumeSlug(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
}

export async function GET() {
  return jsonNoStore({ volumes: await loadVolumes() });
}

export async function POST(req: Request) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const displayName = sanitizeText(
    typeof body.displayName === "string" ? body.displayName : "",
    MAX_TITLE_LENGTH,
  );
  if (!displayName) {
    return jsonNoStore({ error: "displayName is required." }, { status: 400 });
  }

  const rawSlug =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug
      : displayName;
  const slug = safeVolumeSlug(rawSlug);
  if (!slug) {
    return jsonNoStore({ error: "Could not generate a valid slug." }, { status: 400 });
  }

  // Check for slug collision
  const existing = await loadVolumes();
  if (existing.some((v) => v.slug === slug)) {
    return jsonNoStore(
      { error: `A volume with the slug "${slug}" already exists.` },
      { status: 409 },
    );
  }

  const volume = await createVolume(slug, {
    displayName,
    volumeNumber: sanitizeText(
      typeof body.volumeNumber === "string" ? body.volumeNumber : "",
      MAX_TITLE_LENGTH,
    ),
    heroText: sanitizeText(
      typeof body.heroText === "string" ? body.heroText : "",
      500,
    ),
  });

  return jsonNoStore({ volume }, { status: 201 });
}
