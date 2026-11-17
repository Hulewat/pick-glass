# Pick Glass: notes for Claude

Sourcing tool for an interior design studio. Next.js 15 (App Router) + TypeScript, Claude API, Supabase (falls back to a local folder store), Motion, DialKit.

## Where things live
- `lib/store/`: one `Store` interface; `supabase.ts` when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, otherwise `local.ts` (`.data/`, or `/tmp` on Vercel).
- `lib/claude.ts`: all prompts. Without `ANTHROPIC_API_KEY` it returns clearly-labelled sample output (`sample: true`), so the UI always works.
- `middleware.ts`: single studio passcode (`STUDIO_PASSCODE`). Empty = open (local only).
- `components/Tuning.tsx`: DialKit provider. Expose spacing, radius and motion values for anything new.
- `db/schema.sql`: full Phase 1 schema, including tables used from step 2.

## Rules
- DialKit on everything: new animated components or layout values go through `useTuning()` / the DialKit config. Hidden on load; Shift+D toggles.
- Never use a stroke or outline to show a selected or active state. Use fill, weight or scale.
- Never show the same information twice in one area. Don't add elements that weren't asked for.
- Craft comes from spacing and a light touch: three type sizes (12, 14, 24), one accent colour.
- Keep action buttons in a list or panel aligned on the same edge.
- Selection states animate in place where clicked; they never slide over from the previous item.
- Charts are interactive (hover detail). No view toggle when there's only one view.
- Every price, number or claim shown must come from real data. If a value is missing, say so ("Price on request"); never invent one.
- Copy: short, plain and active. Lead with what she can do.
