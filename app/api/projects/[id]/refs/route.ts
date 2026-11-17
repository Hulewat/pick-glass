import { NextResponse } from "next/server";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  const w = Number(form.get("w"));
  const h = Number(form.get("h"));
  if (!(file instanceof Blob) || !w || !h) return NextResponse.json({ error: "That upload was incomplete." }, { status: 400 });
  if (!["image/jpeg", "image/png"].includes(file.type)) return NextResponse.json({ error: "Use a JPG or PNG." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is too large." }, { status: 400 });
  const s = store();
  if (!(await s.getProject(id))) return NextResponse.json({ error: "That project doesn't exist." }, { status: 404 });
  const ref = await s.addRef(id, { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type, w, h });
  return NextResponse.json(ref);
}
