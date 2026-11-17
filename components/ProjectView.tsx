"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Direction, Project, Ref } from "@/lib/types";
import { api, findLinks, imgUrl, prepareImage } from "./client";
import DirectionCard from "./DirectionCard";
import { Shimmer, Toast, XIcon, useFlash } from "./ui";
import { useTuning } from "./Tuning";

type Pending = { key: string; url: string };
type Save = "idle" | "saving" | "saved" | "error";
const SAVE_LABEL: Record<Save, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Not saved. Check your connection." };
const MAX_REFS = 12;

export default function ProjectView({ id }: { id: string }) {
  const { values } = useTuning();
  const { message, flash } = useFlash();
  const [project, setProject] = useState<Project | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [missing, setMissing] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [brief, setBrief] = useState("");
  const [dropped, setDropped] = useState<string[]>([]); // links she removed
  const [building, setBuilding] = useState(false);
  const [editingBrief, setEditingBrief] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [save, setSave] = useState<Save>("idle");
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api<{ project: Project; refs: Ref[] }>(`/api/projects/${id}`)
      .then(({ project, refs }) => {
        setProject(project);
        setRefs(refs);
        setBrief(project.brief);
        setName(project.name);
      })
      .catch(() => setMissing(true));
  }, [id]);

  const links = useMemo(() => findLinks(brief).filter((l) => !dropped.includes(l)), [brief, dropped]);

  /* ---------- saving ---------- */
  const patch = useCallback(
    async (p: Partial<Project>) => {
      setSave("saving");
      try {
        const next = await api<Project>(`/api/projects/${id}`, { method: "PATCH", json: p });
        setProject((cur) => (cur ? { ...cur, ...next, direction: p.direction !== undefined ? cur.direction : next.direction } : next));
        setSave("saved");
      } catch (e) {
        setSave("error");
        flash((e as Error).message);
      }
    },
    [id, flash]
  );

  const changeDirection = (d: Direction) => {
    setProject((p) => (p ? { ...p, direction: d } : p));
    clearTimeout(saveTimer.current);
    setSave("saving");
    saveTimer.current = setTimeout(() => patch({ direction: d }), 700);
  };

  /* ---------- images ---------- */
  const addFiles = useCallback(
    async (files: FileList | File[] | null) => {
      const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (!list.length) return flash("That isn't an image. Try a JPG, PNG or WebP.");
      const room = MAX_REFS - refs.length - pending.length;
      if (room <= 0) return flash(`A project holds up to ${MAX_REFS} references.`);
      for (const f of list.slice(0, room)) {
        const key = Math.random().toString(36).slice(2);
        const url = URL.createObjectURL(f);
        setPending((p) => [...p, { key, url }]);
        try {
          const { blob, w, h } = await prepareImage(f);
          const form = new FormData();
          form.append("file", blob, "ref.jpg");
          form.append("w", String(w));
          form.append("h", String(h));
          const ref = await api<Ref>(`/api/projects/${id}/refs`, { method: "POST", body: form });
          setRefs((r) => [...r, ref]);
        } catch (e) {
          flash((e as Error).message || "That image couldn't be added.");
        } finally {
          setPending((p) => p.filter((x) => x.key !== key));
          URL.revokeObjectURL(url);
        }
      }
      if (list.length > room) flash(`Added ${room}. A project holds up to ${MAX_REFS} references.`);
    },
    [id, refs.length, pending.length, flash]
  );

  const removeRef = (refId: string) => {
    setRefs((r) => r.filter((x) => x.id !== refId));
    api(`/api/projects/${id}/refs/${refId}`, { method: "DELETE" }).catch((e) => flash(e.message));
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])]
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  /* ---------- direction ---------- */
  const build = async () => {
    if (!brief.trim() && !refs.length && !links.length) return flash("Add a few words, an image or a link first.");
    setBuilding(true);
    setEditingBrief(false);
    try {
      const next = await api<Project>(`/api/projects/${id}/direction`, { method: "POST", json: { brief, siteUrls: links } });
      setProject(next);
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBuilding(false);
    }
  };

  const commitName = () => {
    const v = name.trim() || "Untitled project";
    setName(v);
    if (project && v !== project.name) patch({ name: v });
  };

  if (missing)
    return (
      <div className="app">
        <header className="bar">
          <Link href="/" className="text-btn back">
            ← All projects
          </Link>
        </header>
        <main className="start-wrap">
          <p className="body muted">This project doesn&apos;t exist. It may have been deleted.</p>
        </main>
      </div>
    );

  const showStart = project && (project.directionStatus === "none" || editingBrief) && !building;
  const d = project?.direction;

  const thumbs = (
    <div className="thumbs">
      <AnimatePresence initial={false}>
        {refs.map((r) => (
          <motion.div
            key={r.id}
            className="thumb"
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={values.motion.chip}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl(r.imageId)} alt="Reference" />
            <button type="button" className="thumb-x" aria-label="Remove image" onClick={() => removeRef(r.id)}>
              <XIcon size={9} w={2} />
            </button>
          </motion.div>
        ))}
        {pending.map((p) => (
          <motion.div key={p.key} className="thumb loading" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="app">
      <header className="bar">
        <div className="crumbs">
          <Link href="/" className="text-btn back">
            ← All projects
          </Link>
          {project && (
            <input
              className="name-input"
              value={name}
              aria-label="Project name"
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          )}
          <span className="hint">{SAVE_LABEL[save]}</span>
        </div>
      </header>

      <main
        className={dragging ? "stage dragging" : "stage"}
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {!project && (
          <div className="start-wrap">
            <div className="start">
              <Shimmer />
            </div>
          </div>
        )}

        {showStart && (
          <div className="start-wrap">
            <motion.div className="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={values.motion.enter}>
              <h1 className="title">What are you after?</h1>
              <div className="start-box">
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe the room, paste a link to a site you like, or drop in images. E.g. calm family home by the coast, lots of oak, nothing beachy."
                  aria-label="Brief"
                  autoFocus
                />
                {links.length > 0 && (
                  <div className="chips" aria-label="Sites to read">
                    {links.map((l) => (
                      <span key={l} className="chip link-chip">
                        {new URL(l).hostname.replace(/^www\./, "")}
                        <button type="button" className="x" aria-label={`Don't read ${l}`} onClick={() => setDropped((x) => [...x, l])}>
                          <XIcon size={9} w={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {(refs.length > 0 || pending.length > 0) && thumbs}
                <div className="attach-row">
                  <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
                    Add images
                  </button>
                  <div className="actions-row">
                    {editingBrief && (
                      <button type="button" className="btn ghost" onClick={() => setEditingBrief(false)}>
                        Cancel
                      </button>
                    )}
                    <button type="button" className="btn primary" onClick={build}>
                      {project?.direction ? "Rebuild the direction" : "Build the direction"}
                    </button>
                  </div>
                </div>
              </div>
              <p className="hint">Drag images anywhere on this page, or paste them.</p>
            </motion.div>
          </div>
        )}

        {building && (
          <div className="start-wrap">
            <div className="start">
              <span className="label">Building the direction{links.length ? `, reading ${links.length} site${links.length > 1 ? "s" : ""}` : ""}</span>
              <div className="dcard">
                <Shimmer lines={6} />
              </div>
            </div>
          </div>
        )}

        {project && d && !showStart && !building && (
          <div className="direction-wrap">
            <motion.div className="direction-layout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={values.motion.enter}>
              <DirectionCard d={d} onChange={changeDirection} />
              <aside className="side">
                {d.sample && (
                  <p className="sample-note body">This is a sample direction. Add the Claude key to build real ones from her brief.</p>
                )}
                <div className="side-block">
                  {project.directionStatus === "approved" ? (
                    <>
                      <span className="label approved-mark">Approved</span>
                      <p className="body muted">Next: the pull board, build step 2.</p>
                    </>
                  ) : (
                    <>
                      <p className="body muted">Edit anything that&apos;s off, then approve it. Every pull is built from this.</p>
                      <div>
                        <button type="button" className="btn primary" onClick={() => patch({ directionStatus: "approved" })}>
                          Approve direction
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="side-block">
                  <span className="label">References</span>
                  {project.siteUrls.length > 0 && (
                    <div className="chips">
                      {project.siteUrls.map((u) => (
                        <a key={u} className="chip link-chip" href={u} target="_blank" rel="noopener noreferrer">
                          {new URL(u).hostname.replace(/^www\./, "")} ↗
                        </a>
                      ))}
                    </div>
                  )}
                  {(refs.length > 0 || pending.length > 0) && thumbs}
                  <div className="actions-row">
                    <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
                      Add images
                    </button>
                    <button type="button" className="text-btn muted" onClick={() => setEditingBrief(true)}>
                      Change the brief
                    </button>
                  </div>
                </div>
              </aside>
            </motion.div>
          </div>
        )}
      </main>
      <Toast message={message} />
    </div>
  );
}
