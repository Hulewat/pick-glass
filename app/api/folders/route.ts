import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Give the folder a name." }, { status: 400 });
  return NextResponse.json(await store().createFolder(name.trim().slice(0, 80)));
}
