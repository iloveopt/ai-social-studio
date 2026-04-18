-- AI Social Studio — Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── campaigns ───
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete set null,
  brand_name text not null,
  ip_name text not null,
  target_audience text not null,
  campaign_goal text not null,
  platforms text[] not null default '{}',
  tone text not null default 'emotional',
  deadline date,
  status text not null default 'draft' check (status in ('draft','active','archived'))
);

-- ─── topics ───
create table if not exists topics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  seq_num int not null,
  title text not null,
  hook text not null,
  thinking text,
  exec_plan jsonb default '{}',
  handoff jsonb default '[]',
  refs jsonb default '[]',
  persona jsonb default '{}',
  status text not null default 'pending' check (status in ('pending','approved','discussing','rejected')),
  ai_avg_score numeric(3,1),
  deleted_at timestamptz,
  unique(campaign_id, seq_num)
);

-- ─── ai_evaluations ───
create table if not exists ai_evaluations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  topic_id uuid references topics(id) on delete cascade not null,
  persona_name text not null,
  persona_desc text,
  emoji text,
  score numeric(3,1) not null check (score >= 0 and score <= 5),
  quote text not null,
  verdict text,
  reasoning text
);

-- ─── comments ───
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  topic_id uuid references topics(id) on delete cascade not null,
  user_name text not null,
  user_role text,
  content text not null,
  deleted_at timestamptz
);

-- ─── RLS Policies ───
-- For demo: allow all reads, restrict writes to authenticated or anon with service key
alter table campaigns enable row level security;
alter table topics enable row level security;
alter table ai_evaluations enable row level security;
alter table comments enable row level security;

-- Public read for demo
create policy "public read campaigns" on campaigns for select using (true);
create policy "public read topics" on topics for select using (true);
create policy "public read evaluations" on ai_evaluations for select using (true);
create policy "public read comments" on comments for select using (true);

-- Write: authenticated users or service role
create policy "auth insert campaigns" on campaigns for insert with check (true);
create policy "auth update campaigns" on campaigns for update using (true);
create policy "auth insert topics" on topics for insert with check (true);
create policy "auth update topics" on topics for update using (true);
create policy "auth insert evaluations" on ai_evaluations for insert with check (true);
create policy "auth insert comments" on comments for insert with check (true);

-- ─── Realtime ───
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table topics;

-- ─── Indexes ───
create index idx_topics_campaign_id on topics(campaign_id);
create index idx_evaluations_topic_id on ai_evaluations(topic_id);
create index idx_comments_topic_id on comments(topic_id);
