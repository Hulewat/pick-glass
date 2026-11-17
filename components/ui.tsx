"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function XIcon({ size = 12, w = 1.6 }: { size?: number; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
    </svg>
  );
}

export function Shimmer({ lines = 3 }: { lines?: number }) {
  return (
    <div className="shimmer" aria-hidden="true">
      <span style={{ width: "48%", height: 22 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} style={{ width: `${90 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function InlineInput({
  initial = "",
  placeholder,
  onDone,
  onCancel,
  className = "inline-input",
}: {
  initial?: string;
  placeholder: string;
  onDone: (v: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const settled = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const done = () => {
    if (settled.current) return;
    settled.current = true;
    if (v.trim()) onDone(v.trim());
    else onCancel();
  };
  return (
    <input
      ref={ref}
      className={className}
      value={v}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === "Enter") done();
        if (e.key === "Escape") {
          settled.current = true;
          onCancel();
        }
      }}
    />
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useFlash() {
  const [message, setMessage] = useState("");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flash = (m: string) => {
    setMessage(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMessage(""), 4500);
  };
  return { message, flash };
}
