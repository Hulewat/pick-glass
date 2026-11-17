import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Folder, Project, ProjectPatch, Ref } from "../types";
import { newId, type Store } from "./types";

const BUCKET = "images";

type ProjectRow = {
  id: string;
  name: string;
  folder_id: string | null;
  brief: string;
  site_urls: string[];
  direction: Project["direction"];
  direction_status: Project["directionStatus"];
  stretch: number;
  covers: string[];
  ref_count: number;
  created_at: string;
  updated_at: string;
};
type RefRow = { id: string; project_id: string; image_id: string; w: number; h: number; created_at: string };

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  folderId: r.folder_id,
  brief: r.brief,
  siteUrls: r.site_urls ?? [],
  direction: r.direction,
  directionStatus: r.direction_status,
  stretch: r.stretch,
  covers: r.covers ?? [],
  refCount: r.ref_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toRef = (r: RefRow): Ref => ({ id: r.id, projectId: r.project_id, imageId: r.image_id, w: r.w, h: r.h, createdAt: r.created_at });

function patchRow(p: ProjectPatch) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.name !== undefined) row.name = p.name;
  if (p.folderId !== undefined) row.folder_id = p.folderId;
  if (p.brief !== undefined) row.brief = p.brief;
  if (p.siteUrls !== undefined) row.site_urls = p.siteUrls;
  if (p.direction !== undefined) row.direction = p.direction;
  if (p.directionStatus !== undefined) row.direction_status = p.directionStatus;
  if (p.stretch !== undefined) row.stretch = p.stretch;
  return row;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function supabaseStore(url: string, key: string): Store {
  const sb: SupabaseClient = createClient(url, key, { auth: { persistSession: false } });

  async function refreshCovers(projectId: string) {
    const refs = must(
      await sb.from("refs").select("image_id").eq("project_id", projectId).order("created_at", { ascending: true })
    ) as { image_id: string }[];
    must(
      await sb
        .from("projects")
        .update({ covers: refs.slice(0, 3).map((r) => r.image_id), ref_count: refs.length, updated_at: new Date().toISOString() })
        .eq("id", projectId)
    );
  }

  return {
    kind: "supabase",

    listFolders: async () =>
      (must(await sb.from("folders").select("*").order("created_at")) as { id: string; name: string; created_at: string }[]).map(
        (f): Folder => ({ id: f.id, name: f.name, createdAt: f.created_at })
      ),
    createFolder: async (name) => {
      const f = must(await sb.from("folders").insert({ id: newId(), name }).select().single()) as {
        id: string;
        name: string;
        created_at: string;
      };
      return { id: f.id, name: f.name, createdAt: f.created_at };
    },
    renameFolder: async (id, name) => void must(await sb.from("folders").update({ name }).eq("id", id)),
    deleteFolder: async (id) => {
      must(await sb.from("projects").update({ folder_id: null }).eq("folder_id", id));
      must(await sb.from("folders").delete().eq("id", id));
    },

    listProjects: async () => (must(await sb.from("projects").select("*")) as ProjectRow[]).map(toProject),
    getProject: async (id) => {
      const r = must(await sb.from("projects").select("*").eq("id", id).maybeSingle()) as ProjectRow | null;
      return r ? toProject(r) : null;
    },
    createProject: async ({ name, folderId }) =>
      toProject(
        must(
          await sb
            .from("projects")
            .insert({ id: newId(), name: name || "Untitled project", folder_id: folderId ?? null })
            .select()
            .single()
        ) as ProjectRow
      ),
    updateProject: async (id, patch) => {
      const r = must(await sb.from("projects").update(patchRow(patch)).eq("id", id).select().maybeSingle()) as ProjectRow | null;
      return r ? toProject(r) : null;
    },
    deleteProject: async (id) => {
      const refs = must(await sb.from("refs").select("image_id").eq("project_id", id)) as { image_id: string }[];
      if (refs.length) await sb.storage.from(BUCKET).remove(refs.map((r) => r.image_id));
      must(await sb.from("projects").delete().eq("id", id));
    },

    listRefs: async (projectId) =>
      (must(await sb.from("refs").select("*").eq("project_id", projectId).order("created_at")) as RefRow[]).map(toRef),
    addRef: async (projectId, image) => {
      const imageId = newId() + (image.type === "image/png" ? ".png" : ".jpg");
      const up = await sb.storage.from(BUCKET).upload(imageId, image.bytes, { contentType: image.type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      const r = must(
        await sb.from("refs").insert({ id: newId(), project_id: projectId, image_id: imageId, w: image.w, h: image.h }).select().single()
      ) as RefRow;
      await refreshCovers(projectId);
      return toRef(r);
    },
    deleteRef: async (projectId, refId) => {
      const r = must(await sb.from("refs").select("image_id").eq("id", refId).eq("project_id", projectId).maybeSingle()) as {
        image_id: string;
      } | null;
      if (!r) return;
      await sb.storage.from(BUCKET).remove([r.image_id]);
      must(await sb.from("refs").delete().eq("id", refId));
      await refreshCovers(projectId);
    },
    getImage: async (imageId) => {
      const res = await sb.storage.from(BUCKET).download(imageId);
      if (res.error || !res.data) return null;
      return { bytes: new Uint8Array(await res.data.arrayBuffer()), type: res.data.type || "image/jpeg" };
    },
  };
}
