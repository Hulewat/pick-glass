"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DialRoot, useDialKit, type DialConfig } from "dialkit";
import type { Transition } from "motion/react";
import "dialkit/styles.css";

// DialKit: live tuning for spacing and motion. Hidden on load and for anyone
// opening a shared link; Shift+D (or holding the wordmark) toggles it.

const CONFIG: DialConfig = {
  library: { cardMin: [220, 160, 340, 2], gap: [20, 8, 40, 1], gutter: [28, 12, 56, 1] },
  surface: { radius: [14, 0, 28, 1] },
  motion: {
    enter: { type: "spring", visualDuration: 0.3, bounce: 0.1 },
    menu: { type: "spring", visualDuration: 0.18, bounce: 0 },
    chip: { type: "spring", visualDuration: 0.25, bounce: 0.25 },
  },
};

type Values = {
  library: { cardMin: number; gap: number; gutter: number };
  surface: { radius: number };
  motion: { enter: Transition; menu: Transition; chip: Transition };
};
const Ctx = createContext<{ values: Values; toggle: () => void } | null>(null);

export function useTuning() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTuning outside TuningProvider");
  return v;
}

export function TuningProvider({ children }: { children: ReactNode }) {
  const values = useDialKit("Pick Glass", CONFIG) as unknown as Values;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--card-min", `${values.library.cardMin}px`);
    r.setProperty("--grid-gap", `${values.library.gap}px`);
    r.setProperty("--gutter", `${values.library.gutter}px`);
    r.setProperty("--radius", `${values.surface.radius}px`);
  }, [values]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.shiftKey && e.key.toLowerCase() === "d") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ values, toggle: () => setOpen((o) => !o) }}>
      {children}
      {open && <DialRoot productionEnabled defaultOpen position="bottom-left" />}
    </Ctx.Provider>
  );
}
