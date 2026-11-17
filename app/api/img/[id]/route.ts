import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const img = await store().getImage(id);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(img.bytes), {
    headers: { "Content-Type": img.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
