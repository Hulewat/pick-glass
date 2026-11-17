"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Folder, Project } from "@/lib/types";
import { api, imgUrl } from "./client";
import { InlineInput, Toast, useFlash } from "./ui";
import { useTuning } from "./Tuning";

type LibraryData = { folders: Folder[]; projects: Project[]; storage: "supabase" | "local"; claude: boolean };

const fmtDate = (t: string) => {
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
};

function Covers({ p }: { p: Project }) {
  const c = p.covers.slice(0, 3);
  if (!c.length)
    return (
      <div className="covers cover-word" aria-hidden="true">
        {p.direction?.style ?? ""}
      </div>
    );
  return (
    <div className={`covers n${c.length}`} aria-hidden="true">
      {c.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={imgUrl(id)} alt="" draggable={false} loading="lazy" />
      ))}
    </div>
  );
}

function ProjectCard({
  p,
  folders,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: {
  p: Project;
  folders: Folder[];
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const { values } = useTuning();
  const [menu, setMenu] = useState<null | "main" | "move" | "delete">(null);
  const [renaming, setRenaming] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setMenu(null);
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [menu]);
  const meta = [
    p.refCount ? `${p.refCount} reference${p.refCount === 1 ? "" : "s"}` : p.direction?.style || "Not started",
    fmtDate(p.updatedAt),
  ].join(" · ");

  return (
    <motion.article
      className="pcard"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={values.motion.enter}
      draggable={!renaming}
      onDragStart={(e) => (e as unknown as React.DragEvent).dataTransfer?.setData("text/x-project", p.id)}
    >
      <button type="button" className="pcard-open" onClick={() => !renaming && onOpen(p.id)} aria-label={`Open ${p.name}`}>
        <Covers p={p} />
      </button>
      <div className="pcard-foot" ref={box}>
        <div className="pcard-text">
          {renaming ? (
            <InlineInput
              initial={p.name}
              placeholder="Project name"
              onDone={(v) => {
                onRename(p.id, v);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <button type="button" className="pcard-name" onClick={() => onOpen(p.id)}>
              {p.name}
            </button>
          )}
          <span className="hint">{meta}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Project options"
          aria-expanded={!!menu}
          onClick={() => setMenu(menu ? null : "main")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="3" cy="7" r="1.2" fill="currentColor" />
            <circle cx="7" cy="7" r="1.2" fill="currentColor" />
            <circle cx="11" cy="7" r="1.2" fill="currentColor" />
          </svg>
        </button>
        <AnimatePresence>
          {menu && (
            <motion.div
              className="menu"
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={values.motion.menu}
            >
              {menu === "main" && (
                <>
                  <button type="button" onClick={() => (setMenu(null), setRenaming(true))}>
                    Rename
                  </button>
                  <button type="button" onClick={() => setMenu("move")} disabled={!folders.length && !p.folderId}>
                    Move to folder
                  </button>
                  <button type="button" className="danger" onClick={() => setMenu("delete")}>
                    Delete
                  </button>
                </>
              )}
              {menu === "move" && (
                <>
                  {p.folderId && (
                    <button type="button" onClick={() => (onMove(p.id, null), setMenu(null))}>
                      No folder
                    </button>
                  )}
                  {folders
                    .filter((f) => f.id !== p.folderId)
                    .map((f) => (
                      <button key={f.id} type="button" onClick={() => (onMove(p.id, f.id), setMenu(null))}>
                        {f.name}
                      </button>
                    ))}
                </>
              )}
              {menu === "delete" && (
                <div className="menu-confirm">
                  <p className="body">Delete this project and its images?</p>
                  <div className="actions-row">
                    <button type="button" className="btn small danger-fill" onClick={() => (onDelete(p.id), setMenu(null))}>
                      Delete
                    </button>
                    <button type="button" className="btn small" onClick={() => setMenu(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export default function Library() {
  const router = useRouter();
  const { toggle } = useTuning();
  const { message, flash } = useFlash();
  const [data, setData] = useState<LibraryData | null>(null);
  const [folder, setFolder] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [confirmFolder, setConfirmFolder] = useState(false);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(() => {
    api<LibraryData>("/api/library")
      .then(setData)
      .catch((e) => flash(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  useEffect(() => {
    setRenamingFolder(false);
    setConfirmFolder(false);
  }, [folder]);

  const folders = data?.folders ?? [];
  const projects = data?.projects ?? [];
  const current = folders.find((f) => f.id === folder) ?? null;
  const shown = projects
    .filter((p) => (folder === "all" ? true : p.folderId === folder))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const countIn = (id: string) => projects.filter((p) => p.folderId === id).length;

  const patchProject = (id: string, patch: Partial<Project>) =>
    setData((d) => (d ? { ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : d));

  const act = async (fn: () => Promise<unknown>, rollback = true) => {
    try {
      await fn();
    } catch (e) {
      flash((e as Error).message);
      if (rollback) load();
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      const p = await api<Project>("/api/projects", { method: "POST", json: { folderId: current?.id ?? null } });
      router.push(`/p/${p.id}`);
    } catch (e) {
      flash((e as Error).message);
      setCreating(false);
    }
  };
  const rename = (id: string, name: string) => {
    patchProject(id, { name });
    act(() => api(`/api/projects/${id}`, { method: "PATCH", json: { name } }));
  };
  const move = (id: string, folderId: string | null) => {
    patchProject(id, { folderId });
    act(() => api(`/api/projects/${id}`, { method: "PATCH", json: { folderId } }));
  };
  const remove = (id: string) => {
    setData((d) => (d ? { ...d, projects: d.projects.filter((p) => p.id !== id) } : d));
    act(() => api(`/api/projects/${id}`, { method: "DELETE" }));
  };
  const addFolder = (name: string) =>
    act(async () => {
      const f = await api<Folder>("/api/folders", { method: "POST", json: { name } });
      setData((d) => (d ? { ...d, folders: [...d.folders, f] } : d));
    });
  const renameFolder = (id: string, name: string) => {
    setData((d) => (d ? { ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name } : f)) } : d));
    act(() => api(`/api/folders/${id}`, { method: "PATCH", json: { name } }));
  };
  const deleteFolder = (id: string) => {
    setData((d) =>
      d
        ? {
            ...d,
            folders: d.folders.filter((f) => f.id !== id),
            projects: d.projects.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)),
          }
        : d
    );
    setFolder("all");
    act(() => api(`/api/folders/${id}`, { method: "DELETE" }));
  };

  const dropProps = (id: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if ([...e.dataTransfer.types].includes("text/x-project")) {
        e.preventDefault();
        setDropOn(id);
      }
    },
    onDragLeave: () => setDropOn(null),
    onDrop: (e: React.DragEvent) => {
      const pid = e.dataTransfer.getData("text/x-project");
      setDropOn(null);
      if (pid) move(pid, id === "all" ? null : id);
    },
  });

  const notice = !data
    ? null
    : !data.claude
      ? "Stand-in mode: directions are samples until the Claude key is added."
      : data.storage === "local" && process.env.NODE_ENV === "production"
        ? "Projects are saved temporarily. Connect Supabase to keep them."
        : null;

  return (
    <div className="app">
      <header className="bar">
        <Link
          href="/"
          className="wordmark"
          onPointerDown={() => (press.current = setTimeout(toggle, 650))}
          onPointerUp={() => clearTimeout(press.current)}
          onPointerLeave={() => clearTimeout(press.current)}
        >
          Pick Glass
        </Link>
      </header>
      <main className="library">
        <nav className="folders" aria-label="Folders">
          <button
            type="button"
            className={["folder-row", folder === "all" && "is-on", dropOn === "all" && "is-drop"].filter(Boolean).join(" ")}
            onClick={() => setFolder("all")}
            {...dropProps("all")}
          >
            <span>All projects</span>
            <span className="hint">{projects.length || ""}</span>
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className={["folder-row", folder === f.id && "is-on", dropOn === f.id && "is-drop"].filter(Boolean).join(" ")}
              onClick={() => setFolder(f.id)}
              {...dropProps(f.id)}
            >
              <span>{f.name}</span>
              <span className="hint">{countIn(f.id) || ""}</span>
            </button>
          ))}
          {adding ? (
            <InlineInput
              placeholder="Folder name"
              onDone={(v) => {
                addFolder(v);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button type="button" className="folder-row add" onClick={() => setAdding(true)}>
              + New folder
            </button>
          )}
        </nav>

        <section className="shelf">
          {notice && <p className="notice-line">{notice}</p>}
          <div className="shelf-head">
            {current && renamingFolder ? (
              <InlineInput
                className="inline-input title-size"
                initial={current.name}
                placeholder="Folder name"
                onDone={(v) => {
                  renameFolder(current.id, v);
                  setRenamingFolder(false);
                }}
                onCancel={() => setRenamingFolder(false)}
              />
            ) : (
              <h1 className="title">{current ? current.name : "All projects"}</h1>
            )}
            <div className="actions-row">
              {current && !confirmFolder && (
                <>
                  <button type="button" className="text-btn muted" onClick={() => setRenamingFolder(true)}>
                    Rename
                  </button>
                  <button type="button" className="text-btn muted" onClick={() => setConfirmFolder(true)}>
                    Delete folder
                  </button>
                </>
              )}
              {current && confirmFolder && (
                <>
                  <span className="hint">Projects inside move to All projects.</span>
                  <button type="button" className="btn small danger-fill" onClick={() => deleteFolder(current.id)}>
                    Delete folder
                  </button>
                  <button type="button" className="btn small" onClick={() => setConfirmFolder(false)}>
                    Cancel
                  </button>
                </>
              )}
              <button type="button" className="btn primary" onClick={create} disabled={creating}>
                New project
              </button>
            </div>
          </div>

          {!data ? (
            <div className="grid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="ghost-card" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="shelf-empty">
              <p className="body muted">
                {current
                  ? "No projects in this folder yet. Drag one here, or start a new one."
                  : "No projects yet. Start one with a few words, some images or a link to a site you like."}
              </p>
            </div>
          ) : (
            <motion.div className="grid" layout>
              <AnimatePresence>
                {shown.map((p) => (
                  <ProjectCard
                    key={p.id}
                    p={p}
                    folders={folders}
                    onOpen={(id) => router.push(`/p/${id}`)}
                    onRename={rename}
                    onMove={move}
                    onDelete={remove}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>
      <Toast message={message} />
    </div>
  );
}
