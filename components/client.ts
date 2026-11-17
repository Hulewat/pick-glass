"use client";

// Small helpers shared by the screens.

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers || {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Try again.");
  return data as T;
}

export const imgUrl = (imageId: string) => `/api/img/${imageId}`;

function loadImg(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}

/** Shrinks a picked image to at most 1600px and re-encodes it as JPEG. */
export async function prepareImage(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.86));
    return { blob, w: c.width, h: c.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+|\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|co|net|org|design|studio|shop|store|us|uk|co\.uk|eu|it|fr|de|nl|dk|se|au|ca|jp|io)(?:\/[^\s<>"')]*)?/gi;

/** Finds website links in what she typed, so a pasted link just works. */
export function findLinks(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.match(URL_RE) ?? []) {
    const raw = m.replace(/[.,;:]+$/, "");
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      found.add(u.origin + (u.pathname === "/" ? "" : u.pathname));
    } catch {
      /* not a link */
    }
  }
  return [...found].slice(0, 5);
}
