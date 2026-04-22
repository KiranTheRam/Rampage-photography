import { isAuthed } from "@/lib/auth";
import { updateVolume, moveVolume } from "@/lib/volumes";
import {
  MAX_TITLE_LENGTH,
  enforceSameOrigin,
  jsonNoStore,
  sanitizeText,
} from "@/lib/security";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "move-up" || body.action === "move-down") {
    const direction = body.action === "move-up" ? "up" : "down";
    const moved = await moveVolume(slug, direction);
    if (!moved) {
      return jsonNoStore({ error: "Cannot move further in that direction." }, { status: 400 });
    }
    return jsonNoStore({ ok: true });
  }

  const patch: Record<string, string> = {};
  if (typeof body.displayName === "string") {
    patch.displayName = sanitizeText(body.displayName, MAX_TITLE_LENGTH);
  }
  if (typeof body.volumeNumber === "string") {
    patch.volumeNumber = sanitizeText(body.volumeNumber, MAX_TITLE_LENGTH);
  }
  if (typeof body.heroText === "string") {
    patch.heroText = sanitizeText(body.heroText, 500);
  }

  const updated = await updateVolume(slug, patch);
  if (!updated) {
    return jsonNoStore({ error: "Volume not found." }, { status: 404 });
  }
  return jsonNoStore({ volume: updated });
}
