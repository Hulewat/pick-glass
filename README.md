# Pick Glass

A sourcing tool for an interior design studio. She gives a brief, some images or a link to a site she likes. The tool turns that into a direction, pulls real rooms and products to match, and keeps suggesting sources she hasn't tried.

The full plan is in the Phase 1 build spec (Claude doc: "Pick Glass — Phase 1 build spec").

## Build progress

| Step | What | Status |
| --- | --- | --- |
| 1 | Library, projects, folders, the start screen and the direction card | Done |
| 2 | The pull board with real product images, Keep / Pass | Next |
| 3 | Filters: price, colour, category, source, new to me | |
| 4 | Drop a website: site review and catalogue reading | |
| 5 | Sources panel, new makers and the Stretch dial | |
| 6 | Product detail with "More like this" and the Pick Glass loupe | |

## Run it on Vercel (about 20 minutes, once)

1. **Supabase:** create a project. Open SQL Editor, paste everything in `db/schema.sql`, and press Run. Then open Project Settings > API and copy the **Project URL** and the **service_role** key.
2. **Anthropic:** create an API key at console.anthropic.com.
3. **Vercel:** Add New > Project > import `Hulewat/pick-glass`. Before deploying, open Environment Variables and add:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STUDIO_PASSCODE`: any passphrase; she types it once per device
   - `SERPAPI_API_KEY`: needed from step 2
4. Press Deploy. The app is at the URL Vercel gives you.

Without the keys the app still runs. Directions are clearly marked samples, and projects are saved to a temporary folder.

## Run it on your computer

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

Open http://localhost:3000. Without Supabase, projects are saved in `.data/`.

## Tuning

Press **Shift+D** (or hold the "Pick Glass" wordmark) to open DialKit and tune spacing, corner radius and motion live. It's hidden by default, including for anyone opening a shared link.
