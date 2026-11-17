import { NextResponse } from "next/server";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string; refId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, refId } = await params;
  await store().deleteRef(id, refId);
  return NextResponse.json({ ok: true });
}
