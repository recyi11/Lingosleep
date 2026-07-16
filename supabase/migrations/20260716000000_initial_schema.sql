create extension if not exists pgcrypto;

create table if not exists public.vocabulary (
  id text primary key,
  target_language text not null check (target_language in ('ja', 'ko')),
  level text not null check (level in ('basic', 'intermediate', 'advanced')),
  topic text not null,
  target_text text not null,
  reading text,
  romanization text,
  meaning_en text not null,
  meaning_zh_cn text,
  meaning_zh_tw text,
  example_text text,
  example_translation_en text,
  example_translation_zh_cn text,
  example_translation_zh_tw text,
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id text not null references public.vocabulary(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'learning', 'familiar', 'mastered')),
  times_played integer not null default 0 check (times_played >= 0),
  is_favorite boolean not null default false,
  last_played_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vocabulary_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_language text not null check (target_language in ('ja', 'ko')),
  native_language text not null,
  level text not null check (level in ('basic', 'intermediate', 'advanced')),
  topic text not null,
  playback_mode text not null,
  planned_duration_minutes integer not null check (planned_duration_minutes > 0),
  actual_duration_seconds integer check (actual_duration_seconds >= 0),
  background_sound text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  vocabulary_id text not null references public.vocabulary(id) on delete restrict,
  play_order integer not null check (play_order >= 0),
  played_count integer not null default 1 check (played_count >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, vocabulary_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_language text not null default 'ja' check (target_language in ('ja', 'ko')),
  native_language text not null default 'en',
  default_level text not null default 'basic' check (default_level in ('basic', 'intermediate', 'advanced')),
  default_duration_minutes integer not null default 20 check (default_duration_minutes > 0),
  default_background_sound text not null default 'rain',
  voice_volume numeric(3,2) not null default 0.72 check (voice_volume >= 0 and voice_volume <= 1),
  background_volume numeric(3,2) not null default 0.34 check (background_volume >= 0 and background_volume <= 1),
  romanization_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vocabulary_updated_at on public.vocabulary;
create trigger set_vocabulary_updated_at
before update on public.vocabulary
for each row execute function public.set_updated_at();

drop trigger if exists set_user_progress_updated_at on public.user_progress;
create trigger set_user_progress_updated_at
before update on public.user_progress
for each row execute function public.set_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.vocabulary enable row level security;
alter table public.user_progress enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Anyone can read vocabulary" on public.vocabulary;
create policy "Anyone can read vocabulary"
on public.vocabulary
for select
to anon, authenticated
using (true);

drop policy if exists "Users can read own progress" on public.user_progress;
create policy "Users can read own progress"
on public.user_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.user_progress;
create policy "Users can insert own progress"
on public.user_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.user_progress;
create policy "Users can update own progress"
on public.user_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own progress" on public.user_progress;
create policy "Users can delete own progress"
on public.user_progress
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own sessions" on public.sessions;
create policy "Users can read own sessions"
on public.sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.sessions;
create policy "Users can insert own sessions"
on public.sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on public.sessions;
create policy "Users can update own sessions"
on public.sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.sessions;
create policy "Users can delete own sessions"
on public.sessions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own session items" on public.session_items;
create policy "Users can read own session items"
on public.session_items
for select
to authenticated
using (
  exists (
    select 1
    from public.sessions
    where sessions.id = session_items.session_id
      and sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own session items" on public.session_items;
create policy "Users can insert own session items"
on public.session_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sessions
    where sessions.id = session_items.session_id
      and sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own session items" on public.session_items;
create policy "Users can update own session items"
on public.session_items
for update
to authenticated
using (
  exists (
    select 1
    from public.sessions
    where sessions.id = session_items.session_id
      and sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.sessions
    where sessions.id = session_items.session_id
      and sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own session items" on public.session_items;
create policy "Users can delete own session items"
on public.session_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.sessions
    where sessions.id = session_items.session_id
      and sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own preferences" on public.user_preferences;
create policy "Users can read own preferences"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert own preferences"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.vocabulary (
  id,
  target_language,
  level,
  topic,
  target_text,
  reading,
  romanization,
  meaning_en,
  meaning_zh_cn,
  meaning_zh_tw,
  example_text,
  example_translation_en,
  example_translation_zh_cn,
  example_translation_zh_tw
) values
  ('ja-life-basic-1', 'ja', 'basic', 'daily life', '寝る', 'ねる', 'neru', 'to sleep', '睡觉', '睡覺', '十一時に寝ます。', 'I go to sleep at eleven.', '我十一点睡觉。', '我十一點睡覺。'),
  ('ja-food-basic-1', 'ja', 'basic', 'food', 'ご飯', 'ごはん', 'gohan', 'meal; cooked rice', '米饭；餐', '米飯；餐', '朝ご飯を食べます。', 'I eat breakfast.', '我吃早饭。', '我吃早飯。'),
  ('ko-life-basic-1', 'ko', 'basic', 'daily life', '자다', '자다', 'jada', 'to sleep', '睡觉', '睡覺', '열한 시에 자요.', 'I sleep at eleven.', '我十一点睡觉。', '我十一點睡覺。'),
  ('ko-food-basic-1', 'ko', 'basic', 'food', '밥', '밥', 'bap', 'rice; meal', '米饭；饭', '米飯；飯', '밥을 먹어요.', 'I eat a meal.', '我吃饭。', '我吃飯。')
on conflict (id) do update set
  target_language = excluded.target_language,
  level = excluded.level,
  topic = excluded.topic,
  target_text = excluded.target_text,
  reading = excluded.reading,
  romanization = excluded.romanization,
  meaning_en = excluded.meaning_en,
  meaning_zh_cn = excluded.meaning_zh_cn,
  meaning_zh_tw = excluded.meaning_zh_tw,
  example_text = excluded.example_text,
  example_translation_en = excluded.example_translation_en,
  example_translation_zh_cn = excluded.example_translation_zh_cn,
  example_translation_zh_tw = excluded.example_translation_zh_tw;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  true,
  52428800,
  array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read public audio" on storage.objects;
create policy "Anyone can read public audio"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'audio');

drop policy if exists "Authenticated users can upload audio" on storage.objects;
create policy "Authenticated users can upload audio"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'audio');
