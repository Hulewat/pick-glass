import { promises as fs } from "fs";
import path from "path";
import type { Folder, Project, Ref } from "../types";
import { newId, type Store } from "./types";

// Saves to a folder on disk. Good for trying the app on your own computer.
// On Vercel only /tmp is writable and it is wiped often, so connect Supabase there.

type DB = { folders: Folder[]; projects: Project[]; refs: Ref[] };

const ROOT = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/pick-glass" : path.join(process.cwd(), ".data"));
const DB_FILE = path.join(ROOT, "db.json");
const IMG_DIR = path.join(ROOT, "images");

let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function read(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch {
    return { folders: [], projects: [], refs: [] };
  }
}
async function write(db: DB) {
  await fs.mkdir(ROOT, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, DB_FILE);
}
const mutate = <T>(fn: (db: DB) => T | Promise<T>) =>
  serial(async () => {
    const db = await read();
    const out = await fn(db);
    await write(db);
    return out;
  });

const now = () => new Date().toISOString();

function refreshCovers(db: DB, projectId: string) {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p) return;
  const refs = db.refs.filter((r) => r.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  p.covers = refs.slice(0, 3).map((r) => r.imageId);
  p.refCount = refs.length;
  p.updatedAt = now();
}

export const localStore: Store = {
  kind: "local",

  listFolders: async () => (await read()).folders,
  createFolder: (name) =>
    mutate((db) => {
      const f = { id: newId(), name, createdAt: now() };
      db.folders.push(f);
      return f;
    }),
  renameFolder: (id, name) =>
    mutate((db) => {
      const f = db.folders.find((x) => x.id === id);
      if (f) f.name = name;
    }),
  deleteFolder: (id) =>
    mutate((db) => {
      db.folders = db.folders.filter((x) => x.id !== id);
      db.projects.forEach((p) => p.folderId === id && (p.folderId = null));
    }),

  listProjects: async () => (await read()).projects,
  getProject: async (id) => (await read()).projects.find((p) => p.id === id) ?? null,
  createProject: ({ name, folderId }) =>
    mutate((db) => {
      const p: Project = {
        id: newId(),
        name: name || "Untitled project",
        folderId: folderId ?? null,
        brief: "",
        siteUrls: [],
        direction: null,
        directionStatus: "none",
        stretch: 0.35,
        covers: [],
        refCount: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      db.projects.push(p);
      return p;
    }),
  updateProject: (id, patch) =>
    mutate((db) => {
      const p = db.projects.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, patch, { updatedAt: now() });
      return p;
    }),
  deleteProject: (id) =>
    mutate(async (db) => {
      const refs = db.refs.filter((r) => r.projectId === id);
      await Promise.all(refs.map((r) => fs.rm(path.join(IMG_DIR, r.imageId), { force: true })));
      db.refs = db.refs.filter((r) => r.projectId !== id);
      db.projects = db.projects.filter((p) => p.id !== id);
    }),

  listRefs: async (projectId) =>
    (await read()).refs.filter((r) => r.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  addRef: async (projectId, image) => {
    const imageId = newId() + (image.type === "image/png" ? ".png" : ".jpg");
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.writeFile(path.join(IMG_DIR, imageId), image.bytes);
    return mutate((db) => {
      const r: Ref = { id: newId(), projectId, imageId, w: image.w, h: image.h, createdAt: now() };
      db.refs.push(r);
      refreshCovers(db, projectId);
      return r;
    });
  },
  deleteRef: (projectId, refId) =>
    mutate(async (db) => {
      const r = db.refs.find((x) => x.id === refId && x.projectId === projectId);
      if (!r) return;
      await fs.rm(path.join(IMG_DIR, r.imageId), { force: true });
      db.refs = db.refs.filter((x) => x.id !== refId);
      refreshCovers(db, projectId);
    }),
  getImage: async (imageId) => {
    if (!/^[a-z0-9]+\.(jpg|png)$/.test(imageId)) return null;
    try {
      const bytes = await fs.readFile(path.join(IMG_DIR, imageId));
      return { bytes: new Uint8Array(bytes), type: imageId.endsWith(".png") ? "image/png" : "image/jpeg" };
    } catch {
      return null;
    }
  },
};
