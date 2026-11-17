import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Direction } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

export const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

const VOICE = `You work with an interior designer who runs a high-end studio. She has a trained eye but is still building her trade vocabulary, so use real interior trade terms, the words a showroom rep or vendor would use. Be specific and never invent. Avoid anything generic or big-box: if a direction could describe any catalogue, it is not specific enough.`;

const DIRECTION_SHAPE = `Reply with only a JSON object:
{
  "style": "the style name, 1-3 words",
  "influence": "a secondary influence, 1-2 words, or null",
  "not": "what this direction is NOT, under 6 words, e.g. \\"coastal, not beachy\\"",
  "summary": "the brief restated as one sentence, under 24 words",
  "materials": ["5 to 8 materials and finishes, 1-4 words each, trade terms"],
  "palette": [{"name": "colour named as a material, e.g. \\"Raw linen\\"", "hex": "#rrggbb, an approximate swatch"}],
  "pieces": [{"room": "room name", "items": ["2 to 5 key pieces for that room, 1-4 words each, e.g. \\"low plinth-base sofa\\""]}],
  "searchTerms": ["6 to 10 search phrases for vendor sites, 3-6 words each"],
  "adjacent": [{"style": "a neighbouring style worth a look", "why": "what it shares with this direction and what it adds, under 14 words"}]
}
"palette" holds 4 to 6 entries. "adjacent" holds 2 or 3 styles that share materials or mood but have a different signature, so she sees past her usual choices.`;

export type DirectionInput = {
  brief: string;
  siteUrls: string[];
  images: { data: string; mediaType: "image/jpeg" | "image/png" }[];
};

function extractJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(body) as T;
}

function clean(d: Partial<Direction>): Direction {
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && !!s.trim()) : []);
  return {
    style: String(d.style || "Untitled direction"),
    influence: d.influence ? String(d.influence) : null,
    not: String(d.not || ""),
    summary: String(d.summary || ""),
    materials: list(d.materials),
    palette: Array.isArray(d.palette)
      ? d.palette
          .filter((p) => p && typeof p.name === "string")
          .map((p) => ({ name: p.name, hex: /^#[0-9a-f]{6}$/i.test(p.hex) ? p.hex : "#d9d4cc" }))
      : [],
    pieces: Array.isArray(d.pieces)
      ? d.pieces.filter((p) => p && typeof p.room === "string").map((p) => ({ room: p.room, items: list(p.items) }))
      : [],
    searchTerms: list(d.searchTerms),
    adjacent: Array.isArray(d.adjacent)
      ? d.adjacent.filter((a) => a && typeof a.style === "string").map((a) => ({ style: a.style, why: String(a.why || "") }))
      : [],
  };
}

export async function buildDirection(input: DirectionInput): Promise<Direction> {
  if (!hasClaude()) return sampleDirection(input.brief);

  const parts: Anthropic.ContentBlockParam[] = [];
  input.images.slice(0, 6).forEach((img, i) => {
    parts.push({ type: "text", text: `Reference image ${i + 1}:` });
    parts.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  });
  const lines = [
    VOICE,
    "",
    "She is starting a project. Build the direction for it from what she gave you.",
    input.brief ? `Her words: """${input.brief.slice(0, 2000)}"""` : "She gave no words, only references.",
    input.images.length ? `She attached ${input.images.length} reference image(s) above. Read their style, materials and palette.` : "",
    input.siteUrls.length
      ? `She shared these websites as references. Fetch each one (the home page is enough) and read its style, materials and price level: ${input.siteUrls.join(", ")}`
      : "",
    "",
    DIRECTION_SHAPE,
  ];
  parts.push({ type: "text", text: lines.filter(Boolean).join("\n") });

  const domains = input.siteUrls
    .map((u) => {
      try {
        return new URL(u).hostname;
      } catch {
        return null;
      }
    })
    .filter((d): d is string => !!d);

  const res = await claude().messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: "user", content: parts }],
    ...(domains.length
      ? { tools: [{ type: "web_fetch_20250910" as const, name: "web_fetch" as const, max_uses: 4, allowed_domains: domains }] }
      : {}),
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return clean(extractJson<Partial<Direction>>(text));
}

/** A clearly-labelled stand-in so the app works before a Claude key is added. */
function sampleDirection(brief: string): Direction {
  return {
    sample: true,
    style: "Warm minimalism",
    influence: "Japandi",
    not: "minimal, not cold",
    summary: brief ? brief.slice(0, 140) : "A calm, warm home built on natural materials.",
    materials: ["Rift-sawn white oak", "Lime plaster", "Washed linen", "Honed travertine", "Unlacquered brass", "Bouclé"],
    palette: [
      { name: "Raw linen", hex: "#e6dfd3" },
      { name: "Lime plaster", hex: "#d9d2c5" },
      { name: "White oak", hex: "#c8ab85" },
      { name: "Travertine", hex: "#d6c3a5" },
      { name: "Smoked oak", hex: "#6b5444" },
    ],
    pieces: [
      { room: "Living room", items: ["Low plinth-base sofa", "Travertine coffee table", "Bouclé lounge chair", "Paper floor lamp"] },
      { room: "Kitchen", items: ["Fluted oak island", "Zellige backsplash", "Brass pendant"] },
      { room: "Primary bath", items: ["Tadelakt walls", "Stone vessel sink", "Oak vanity"] },
    ],
    searchTerms: [
      "low plinth base linen sofa",
      "honed travertine coffee table",
      "white oak fluted sideboard",
      "bouclé lounge chair oak frame",
      "handmade zellige white tile",
      "unlacquered brass pendant",
    ],
    adjacent: [
      { style: "70s Italian modern", why: "Same travertine and low seating, with more curve and confidence." },
      { style: "Belgian farmhouse", why: "Shares the lime and linen, adds age and heavier timber." },
    ],
  };
}
