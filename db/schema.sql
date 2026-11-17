-- Pick Glass, Phase 1 schema. Run once in Supabase: SQL Editor > New query > paste > Run.
-- The app talks to these tables from the server only, with the service role key.

create table if not exists folders (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  name text not null default 'Untitled project',
  folder_id text references folders(id) on delete set null,
  brief text not null default '',
  site_urls jsonb not null default '[]',
  direction jsonb,
  direction_status text not null default 'none', -- none | draft | approved
  stretch real not null default 0.35,
  covers jsonb not null default '[]',             -- image ids of the first references
  ref_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists refs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  image_id text not null,
  w int not null,
  h int not null,
  spots jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists refs_project on refs(project_id, created_at);

-- Used from build step 2 onward.
create table if not exists items (
  id text primary key,
  kind text not null,              -- room | product
  image_url text not null,
  page_url text,
  title text,
  store text,
  price numeric,
  currency text,
  colors jsonb not null default '[]',
  category text,
  style_tags jsonb not null default '[]',
  source_domain text,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  project_id text not null references projects(id) on delete cascade,
  item_id text not null references items(id) on delete cascade,
  verdict text not null,           -- keep | pass
  thumb_id text,                   -- stored thumbnail, kept items only
  created_at timestamptz not null default now(),
  primary key (project_id, item_id)
);

create table if not exists sources (
  domain text primary key,
  name text not null,
  categories jsonb not null default '[]',
  style_tags jsonb not null default '[]',
  price_band text,
  has_catalog boolean,
  origin text not null default 'mine', -- mine | suggested
  keep_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Private bucket for reference images and kept thumbnails.
insert into storage.buckets (id, name, public) values ('images', 'images', false)
on conflict (id) do nothing;
