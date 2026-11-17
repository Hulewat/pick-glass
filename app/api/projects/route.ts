import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(req: Request) {
  const { folderId } = (await req.json().catch(() => ({}))) as { folderId?: string | null };
  return NextResponse.json(await store().createProject({ folderId: folderId ?? null }));
}
