import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { hasClaude } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = store();
  const [folders, projects] = await Promise.all([s.listFolders(), s.listProjects()]);
  return NextResponse.json({ folders, projects, storage: s.kind, claude: hasClaude() });
}
