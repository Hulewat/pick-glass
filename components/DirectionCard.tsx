"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Direction } from "@/lib/types";
import { XIcon } from "./ui";
import { useTuning } from "./Tuning";

function EditableChips({
  items,
  onChange,
  addLabel,
  label,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  label: string;
}) {
  const { values } = useTuning();
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="chips" role="list" aria-label={label}>
      <AnimatePresence initial={false}>
        {items.map((it) => (
          <motion.span
            key={it}
            role="listitem"
            className="chip"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={values.motion.chip}
          >
            {it}
            <button type="button" className="x" aria-label={`Remove ${it}`} onClick={() => onChange(items.filter((x) => x !== it))}>
              <XIcon size={9} w={2} />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        className="chip-input"
        value={draft}
        placeholder={addLabel}
        aria-label={addLabel}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

export default function DirectionCard({ d, onChange }: { d: Direction; onChange: (next: Direction) => void }) {
  const set = <K extends keyof Direction>(k: K, v: Direction[K]) => onChange({ ...d, [k]: v });

  return (
    <article className="dcard" aria-label="Direction">
      <div className="dcard-head">
        <span className="label">Direction</span>
        <input className="title-input" value={d.style} aria-label="Style" onChange={(e) => set("style", e.target.value)} />
        {d.influence && <p className="body muted">with {d.influence} influence</p>}
        {d.summary && <p className="body">{d.summary}</p>}
      </div>

      <section className="dsection">
        <span className="label">Not this</span>
        <input className="line-input" value={d.not} aria-label="What it is not" onChange={(e) => set("not", e.target.value)} />
      </section>

      <section className="dsection">
        <span className="label">Materials</span>
        <EditableChips label="Materials" items={d.materials} onChange={(v) => set("materials", v)} addLabel="Add material" />
      </section>

      <section className="dsection">
        <span className="label">Palette</span>
        <div className="swatches">
          {d.palette.map((p, i) => (
            <div key={i} className="swatch">
              <div className="swatch-chip" style={{ background: p.hex }}>
                <button
                  type="button"
                  className="x icon-btn"
                  style={{ width: 18, height: 18, background: "rgba(0,0,0,.35)", color: "#fff" }}
                  aria-label={`Remove ${p.name}`}
                  onClick={() => set("palette", d.palette.filter((_, j) => j !== i))}
                >
                  <XIcon size={8} w={2} />
                </button>
              </div>
              <input
                value={p.name}
                aria-label="Colour name"
                onChange={(e) => set("palette", d.palette.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="dsection">
        <span className="label">Key pieces</span>
        <div className="rooms">
          {d.pieces.map((r, i) => (
            <div key={i} className="room">
              <input
                className="line-input"
                style={{ fontWeight: 600 }}
                value={r.room}
                aria-label="Room"
                onChange={(e) => set("pieces", d.pieces.map((x, j) => (j === i ? { ...x, room: e.target.value } : x)))}
              />
              <EditableChips
                label={r.room}
                items={r.items}
                onChange={(v) => set("pieces", d.pieces.map((x, j) => (j === i ? { ...x, items: v } : x)))}
                addLabel="Add piece"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="dsection">
        <span className="label">Search terms</span>
        <EditableChips label="Search terms" items={d.searchTerms} onChange={(v) => set("searchTerms", v)} addLabel="Add term" />
      </section>

      {d.adjacent.length > 0 && (
        <section className="dsection">
          <span className="label">Worth a look</span>
          <div className="adjacent">
            {d.adjacent.map((a) => (
              <div key={a.style} className="adjacent-row">
                <strong>{a.style}</strong>
                <span className="muted">{a.why}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
