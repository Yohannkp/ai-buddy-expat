-- X-like social schema
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  media_urls text[] null,
  reply_to_id uuid null references public.posts(id) on delete cascade,
  quoted_post_id uuid null references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.post_reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- RLS
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_reposts enable row level security;
alter table public.follows enable row level security;
alter table public.post_bookmarks enable row level security;

-- Policies
create policy if not exists "Posts public readable" on public.posts for select using (true);
create policy if not exists "Posts insert by owner" on public.posts for insert with check (auth.uid() = user_id);
create policy if not exists "Posts update by owner" on public.posts for update using (auth.uid() = user_id);

create policy if not exists "Likes public readable" on public.post_likes for select using (true);
create policy if not exists "Likes insert by user" on public.post_likes for insert with check (auth.uid() = user_id);
create policy if not exists "Likes delete by user" on public.post_likes for delete using (auth.uid() = user_id);

create policy if not exists "Reposts public readable" on public.post_reposts for select using (true);
create policy if not exists "Reposts insert by user" on public.post_reposts for insert with check (auth.uid() = user_id);
create policy if not exists "Reposts delete by user" on public.post_reposts for delete using (auth.uid() = user_id);

create policy if not exists "Follows public readable" on public.follows for select using (true);
create policy if not exists "Follows insert by follower" on public.follows for insert with check (auth.uid() = follower_id);
create policy if not exists "Follows delete by follower" on public.follows for delete using (auth.uid() = follower_id);

-- Indexes
create index if not exists idx_posts_user_created on public.posts(user_id, created_at desc);
create index if not exists idx_posts_reply_to on public.posts(reply_to_id);
create index if not exists idx_posts_quoted on public.posts(quoted_post_id);
create index if not exists idx_post_likes_post on public.post_likes(post_id);
create index if not exists idx_post_reposts_post on public.post_reposts(post_id);
create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_followee on public.follows(followee_id);
create index if not exists idx_bookmarks_post on public.post_bookmarks(post_id);
create index if not exists idx_bookmarks_user on public.post_bookmarks(user_id);

-- Bookmark policies
create policy if not exists "Bookmarks public readable" on public.post_bookmarks for select using (true);
create policy if not exists "Bookmarks insert by user" on public.post_bookmarks for insert with check (auth.uid() = user_id);
create policy if not exists "Bookmarks delete by user" on public.post_bookmarks for delete using (auth.uid() = user_id);
