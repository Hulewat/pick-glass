import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { buildDirection } from "@/lib/claude";

export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { brief = "", siteUrls = [] } = (await req.json()) as { brief?: string; siteUrls?: string[] };
  const s = store();
  const project = await s.getProject(id);
  if (!project) return NextResponse.json({ error: "That project doesn't exist." }, { status: 404 });

  const urls = siteUrls.filter((u) => /^https?:\/\//i.test(u)).slice(0, 5);
  const refs = await s.listRefs(id);
  const images = (
    await Promise.all(
      refs.slice(0, 6).map(async (r) => {
        const img = await s.getImage(r.imageId);
        return img
          ? { data: Buffer.from(img.bytes).toString("base64"), mediaType: (img.type === "image/png" ? "image/png" : "image/jpeg") as "image/png" | "image/jpeg" }
          : null;
      })
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);

  if (!brief.trim() && !images.length && !urls.length)
    return NextResponse.json({ error: "Add a few words, an image or a link first." }, { status: 400 });

  try {
    const direction = await buildDirection({ brief, siteUrls: urls, images });
    const updated = await s.updateProject(id, { brief, siteUrls: urls, direction, directionStatus: "draft" });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("direction failed", e);
    await s.updateProject(id, { brief, siteUrls: urls });
    return NextResponse.json({ error: "Claude couldn't build the direction just now. Try again in a moment." }, { status: 502 });
  }
}
