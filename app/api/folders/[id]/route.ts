import { NextResponse } from "next/server";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Give the folder a name." }, { status: 400 });
  await store().renameFolder(id, name.trim().slice(0, 80));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await store().deleteFolder(id);
  return NextResponse.json({ ok: true });
}
