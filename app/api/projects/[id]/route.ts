import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { ProjectPatch } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const s = store();
  const project = await s.getProject(id);
  if (!project) return NextResponse.json({ error: "That project doesn't exist." }, { status: 404 });
  return NextResponse.json({ project, refs: await s.listRefs(id) });
}

const KEYS = ["name", "folderId", "brief", "siteUrls", "direction", "directionStatus", "stretch"] as const;

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const patch: ProjectPatch = {};
  for (const k of KEYS) if (k in body) (patch as Record<string, unknown>)[k] = body[k];
  if (typeof patch.name === "string") patch.name = patch.name.trim().slice(0, 120) || "Untitled project";
  if (patch.directionStatus && !["none", "draft", "approved"].includes(patch.directionStatus))
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  const project = await store().updateProject(id, patch);
  if (!project) return NextResponse.json({ error: "That project doesn't exist." }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await store().deleteProject(id);
  return NextResponse.json({ ok: true });
}
