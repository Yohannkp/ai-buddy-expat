-- Schema migration for social features
-- Note: Run these statements in Supabase SQL editor or via CLI. Adjust types if needed.

-- Events core (extend if exists)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  date date not null,
  location text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  image_url text,
  video_url text,
  category text not null default 'événement',
  tags text[] not null default '{}',
  seats int,
  seats_taken int,
  co_organizers text[],
  lat double precision,
  lng double precision
);

-- Likes
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Reactions
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, emoji)
);

-- Registrations
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'registered',
  unique (event_id, user_id)
);

-- Polls
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  text text not null
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('event','comment')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Gamification
create table if not exists public.user_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Messaging (private messages)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  language text
);

-- Policies (simplified, adjust for production)
alter table public.events enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.registrations enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.reports enable row level security;
alter table public.user_points enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "read_all_events" on public.events for select using (true);
create policy "insert_own_event" on public.events for insert with check (auth.uid() = user_id);
create policy "update_own_event" on public.events for update using (auth.uid() = user_id);
create policy "delete_own_event" on public.events for delete using (auth.uid() = user_id);

-- Likes: lecture publique, écriture par l'utilisateur
create policy if not exists "likes_select" on public.likes for select using (true);
create policy if not exists "likes_write" on public.likes for insert with check (auth.uid() = user_id);
create policy if not exists "likes_delete" on public.likes for delete using (auth.uid() = user_id);

-- Comments: lecture publique, écriture par l'utilisateur
create policy if not exists "comments_select" on public.comments for select using (true);
create policy if not exists "comments_write" on public.comments for insert with check (auth.uid() = user_id);
create policy if not exists "comments_delete" on public.comments for delete using (auth.uid() = user_id);

-- Reactions: lecture publique, écriture par l'utilisateur
create policy if not exists "reactions_select" on public.reactions for select using (true);
create policy if not exists "reactions_write" on public.reactions for insert with check (auth.uid() = user_id);
create policy if not exists "reactions_delete" on public.reactions for delete using (auth.uid() = user_id);
create policy "registrations_rw" on public.registrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "polls_r" on public.polls for select using (true);
create policy "polls_w" on public.polls for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "poll_options_rw" on public.poll_options for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "poll_votes_rw" on public.poll_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reports_rw" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_points_r" on public.user_points for select using (true);
create policy "user_points_upsert" on public.user_points for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "badges_r" on public.badges for select using (true);
create policy "user_badges_rw" on public.user_badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations_r" on public.conversations for select using (exists (select 1 from conversation_participants cp where cp.conversation_id = conversations.id and cp.user_id = auth.uid()));
create policy "conversations_w" on public.conversations for insert with check (auth.uid() is not null);
create policy "conversation_participants_rw" on public.conversation_participants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_rw" on public.messages for all using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

-- RPC: safe_register (atomic seat reservation)
create or replace function public.safe_register(p_event uuid)
returns table (success boolean, message text, seats_taken int)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- lock row
  perform 1 from public.events where id = p_event for update;
  if not found then
    return query select false, 'Event not found', null::int;
    return;
  end if;

  -- get seats
  declare v_seats int;
  declare v_taken int;
  select seats, coalesce(seats_taken,0) into v_seats, v_taken from public.events where id = p_event;
  if v_seats is null then
    return query select false, 'No seat limit on this event', v_taken;
    return;
  end if;
  if v_taken >= v_seats then
    return query select false, 'No remaining seats', v_taken;
    return;
  end if;

  -- create or update registration
  insert into public.registrations(event_id, user_id, status)
  values (p_event, auth.uid(), 'registered')
  on conflict (event_id, user_id) do update set status = 'registered';

  update public.events set seats_taken = coalesce(seats_taken,0) + 1 where id = p_event;
  select seats_taken into v_taken from public.events where id = p_event;
  return query select true, 'Registered', v_taken;
end;
$$;

-- Stub de traduction (retourne le texte tel quel). Remplacez par une Edge Function réelle.
create or replace function public.translate_text(text text, target_lang text)
returns table (translated text, detected_lang text)
language sql
as $$
  select $1 as translated, 'auto'::text as detected_lang
$$;

-- RPC: increment_points
create or replace function public.increment_points(delta int)
returns table (success boolean, total int)
language plpgsql
as $$
begin
  insert into public.user_points(user_id, points) values (auth.uid(), delta)
  on conflict (user_id) do update set points = public.user_points.points + excluded.points, updated_at = now();
  return query select true, (select points from public.user_points where user_id = auth.uid());
end;
$$;

-- Storage bucket (media) note: create via UI or storage.sql; ensure public read policy for files

-- RPC: popular_events (naïf par comptage de likes)
create or replace function public.popular_events()
returns table (id uuid, title text, likes int)
language sql
as $$
  select e.id, e.title, coalesce(l.cnt,0)::int as likes
  from public.events e
  left join (
    select event_id, count(*) as cnt from public.likes group by event_id
  ) l on l.event_id = e.id
  order by likes desc, e.created_at desc
  limit 50
$$;

-- Note: Pour les rappels automatiques la veille, créer une Edge Function (cron) côté Supabase
-- qui sélectionne les événements du lendemain et envoie des mails/notifications aux inscrits.

-- RPC: safe_cancel_register (annulation et décrément du compteur)
create or replace function public.safe_cancel_register(p_event uuid)
returns table (success boolean, message text, seats_taken int)
language plpgsql
security definer
set search_path = public
as $$
declare v_taken int;
begin
  perform 1 from public.events where id = p_event for update;
  if not found then
    return query select false, 'Event not found', null::int;
    return;
  end if;
  update public.registrations set status = 'cancelled' where event_id = p_event and user_id = auth.uid();
  update public.events set seats_taken = greatest(0, coalesce(seats_taken,0) - 1) where id = p_event;
  select seats_taken into v_taken from public.events where id = p_event;
  return query select true, 'Cancelled', v_taken;
end;
$$;

-- Seed badges
insert into public.badges(id, code, name, description)
values
  (gen_random_uuid(), 'organizer', 'Organisateur d’événements', 'A créé un événement'),
  (gen_random_uuid(), 'ambassador', 'Ambassadeur de la communauté', 'Participe activement et aide les autres')
on conflict (code) do nothing;
