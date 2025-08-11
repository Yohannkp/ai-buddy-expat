-- X extensions: campus/city/categories, events, reactions, reports, groups, tags, mentions, polls, messaging

-- Posts enrichment
alter table if exists public.posts
  add column if not exists campus text,
  add column if not exists city text,
  add column if not exists categories text[] default '{}',
  add column if not exists is_event boolean default false,
  add column if not exists event_at timestamptz,
  add column if not exists location_name text,
  add column if not exists link_url text,
  add column if not exists promos text[] default '{}',
  add column if not exists fields text[] default '{}',
  add column if not exists group_id uuid;

-- Reactions (multi-emoji)
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(post_id, user_id, emoji)
);

alter table public.post_reactions enable row level security;
do $$ begin
  create policy if not exists "post_reactions_select" on public.post_reactions for select using (true);
  create policy if not exists "post_reactions_insert" on public.post_reactions for insert with check (auth.uid() = user_id);
  create policy if not exists "post_reactions_delete" on public.post_reactions for delete using (auth.uid() = user_id);
end $$;

-- Reports
create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_reports enable row level security;
do $$ begin
  create policy if not exists "post_reports_select" on public.post_reports for select using (auth.uid() is not null);
  create policy if not exists "post_reports_insert" on public.post_reports for insert with check (auth.uid() = user_id);
end $$;

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.groups enable row level security;
do $$ begin
  create policy if not exists "groups_select" on public.groups for select using (true);
  create policy if not exists "groups_insert" on public.groups for insert with check (auth.uid() = created_by);
end $$;

create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;
do $$ begin
  create policy if not exists "group_members_select" on public.group_members for select using (auth.uid() is not null);
  create policy if not exists "group_members_insert" on public.group_members for insert with check (auth.uid() = user_id);
  create policy if not exists "group_members_delete" on public.group_members for delete using (auth.uid() = user_id);
end $$;

-- Link post to group
alter table if exists public.posts
  add constraint if not exists posts_group_id_fkey foreign key (group_id) references public.groups(id) on delete set null;

-- Tags and mentions
create table if not exists public.post_tags (
  post_id uuid references public.posts(id) on delete cascade,
  tag text not null,
  primary key (post_id, tag)
);
alter table public.post_tags enable row level security;
do $$ begin
  create policy if not exists "post_tags_select" on public.post_tags for select using (true);
  create policy if not exists "post_tags_insert" on public.post_tags for insert with check (auth.uid() is not null);
end $$;

create table if not exists public.post_mentions (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);
alter table public.post_mentions enable row level security;
do $$ begin
  create policy if not exists "post_mentions_select" on public.post_mentions for select using (auth.uid() is not null);
  create policy if not exists "post_mentions_insert" on public.post_mentions for insert with check (auth.uid() is not null);
end $$;

-- Polls for posts
create table if not exists public.post_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  question text not null,
  closes_at timestamptz
);
alter table public.post_polls enable row level security;
do $$ begin
  create policy if not exists "post_polls_select" on public.post_polls for select using (true);
  create policy if not exists "post_polls_insert" on public.post_polls for insert with check (auth.uid() is not null);
end $$;

create table if not exists public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.post_polls(id) on delete cascade,
  text text not null
);
alter table public.post_poll_options enable row level security;
do $$ begin
  create policy if not exists "post_poll_options_select" on public.post_poll_options for select using (true);
  create policy if not exists "post_poll_options_insert" on public.post_poll_options for insert with check (auth.uid() is not null);
end $$;

create table if not exists public.post_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.post_polls(id) on delete cascade,
  option_id uuid references public.post_poll_options(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (poll_id, user_id)
);
alter table public.post_poll_votes enable row level security;
do $$ begin
  create policy if not exists "post_poll_votes_select" on public.post_poll_votes for select using (auth.uid() is not null);
  create policy if not exists "post_poll_votes_insert" on public.post_poll_votes for insert with check (auth.uid() = user_id);
end $$;

-- Messaging (simple)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);
alter table public.conversations enable row level security;
do $$ begin
  create policy if not exists "conversations_select" on public.conversations for select using (auth.uid() is not null);
  create policy if not exists "conversations_insert" on public.conversations for insert with check (auth.uid() is not null);
end $$;

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_participants enable row level security;
do $$ begin
  create policy if not exists "conversation_participants_select" on public.conversation_participants for select using (auth.uid() is not null);
  create policy if not exists "conversation_participants_insert" on public.conversation_participants for insert with check (auth.uid() = user_id);
  create policy if not exists "conversation_participants_delete" on public.conversation_participants for delete using (auth.uid() = user_id);
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
do $$ begin
  create policy if not exists "messages_select" on public.messages for select using (
    auth.uid() in (select user_id from public.conversation_participants where conversation_id = messages.conversation_id)
  );
  create policy if not exists "messages_insert" on public.messages for insert with check (auth.uid() = sender_id);
end $$;

-- Helpful indexes
create index if not exists idx_posts_event_at on public.posts(event_at);
create index if not exists idx_posts_categories on public.posts using gin (categories);
create index if not exists idx_posts_promos on public.posts using gin (promos);
create index if not exists idx_posts_fields on public.posts using gin (fields);
create index if not exists idx_post_tags_tag on public.post_tags(tag);
create index if not exists idx_post_reactions_post on public.post_reactions(post_id);
create index if not exists idx_post_polls_post on public.post_polls(post_id);
