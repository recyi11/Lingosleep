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
  example_text text,
  example_translation_en text,
  example_translation_zh_cn text,
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
  example_text,
  example_translation_en,
  example_translation_zh_cn
) values
  ('ja-food-basic-1', 'ja', 'basic', 'food', 'ご飯', 'ごはん', 'gohan', 'meal', '饭', '朝ご飯を食べます。', 'I eat breakfast.', '我吃早饭。'),
  ('ja-travel-basic-1', 'ja', 'basic', 'travel', '駅', 'えき', 'eki', 'station', '车站', '駅はどこですか。', 'Where is the station?', '车站在哪里？'),
  ('ja-life-basic-1', 'ja', 'basic', 'daily life', '寝る', 'ねる', 'neru', 'sleep', '睡觉', '十一時に寝ます。', 'I go to sleep at eleven.', '我十一点睡觉。'),
  ('ja-numbers-basic-1', 'ja', 'basic', 'numbers', '七', 'なな / しち', 'nana / shichi', 'seven', '七', '七つください。', 'Seven, please.', '请给我七个。'),
  ('ja-verbs-basic-1', 'ja', 'basic', 'common verbs', '見る', 'みる', 'miru', 'see', '看', '映画を見ます。', 'I watch a movie.', '我看电影。'),
  ('ja-food-basic-2', 'ja', 'basic', 'food', '水', 'みず', 'mizu', 'water', '水', '水をください。', 'Water, please.', '请给我水。'),
  ('ja-travel-basic-2', 'ja', 'basic', 'travel', '切符', 'きっぷ', 'kippu', 'ticket', '票', '切符を買います。', 'I buy a ticket.', '我买票。'),
  ('ja-life-basic-2', 'ja', 'basic', 'daily life', '起きる', 'おきる', 'okiru', 'wake', '起床', '六時に起きます。', 'I get up at six.', '我六点起床。'),
  ('ja-numbers-basic-2', 'ja', 'basic', 'numbers', '百', 'ひゃく', 'hyaku', 'hundred', '百', '百円です。', 'It is one hundred yen.', '是一百日元。'),
  ('ja-verbs-basic-2', 'ja', 'basic', 'common verbs', '行く', 'いく', 'iku', 'go', '去', '学校へ行きます。', 'I go to school.', '我去学校。'),
  ('ko-food-basic-1', 'ko', 'basic', 'food', '밥', '밥', 'bap', 'rice', '米饭', '밥을 먹어요.', 'I eat a meal.', '我吃饭。'),
  ('ko-travel-basic-1', 'ko', 'basic', 'travel', '역', '역', 'yeok', 'station', '车站', '역이 어디예요?', 'Where is the station?', '车站在哪里？'),
  ('ko-life-basic-1', 'ko', 'basic', 'daily life', '자다', '자다', 'jada', 'sleep', '睡觉', '열한 시에 자요.', 'I sleep at eleven.', '我十一点睡觉。'),
  ('ko-numbers-basic-1', 'ko', 'basic', 'numbers', '일곱', '일곱', 'ilgop', 'seven', '七', '일곱 개 주세요.', 'Seven, please.', '请给我七个。'),
  ('ko-verbs-basic-1', 'ko', 'basic', 'common verbs', '보다', '보다', 'boda', 'see', '看', '드라마를 봐요.', 'I watch a drama.', '我看电视剧。'),
  ('ko-food-basic-2', 'ko', 'basic', 'food', '물', '물', 'mul', 'water', '水', '물 주세요.', 'Water, please.', '请给我水。'),
  ('ko-travel-basic-2', 'ko', 'basic', 'travel', '표', '표', 'pyo', 'ticket', '票', '표를 사요.', 'I buy a ticket.', '我买票。'),
  ('ko-life-basic-2', 'ko', 'basic', 'daily life', '일어나다', '일어나다', 'ireonada', 'wake', '起床', '여섯 시에 일어나요.', 'I get up at six.', '我六点起床。'),
  ('ko-numbers-basic-2', 'ko', 'basic', 'numbers', '백', '백', 'baek', 'hundred', '百', '백 원이에요.', 'It is one hundred won.', '是一百韩元。'),
  ('ko-verbs-basic-2', 'ko', 'basic', 'common verbs', '가다', '가다', 'gada', 'go', '去', '학교에 가요.', 'I go to school.', '我去学校。'),
  ('ja-food-basic-3', 'ja', 'basic', 'food', 'お茶', 'おちゃ', 'ocha', 'tea', '茶', '温かいお茶を飲みます。', 'I drink warm tea.', '我喝热茶。'),
  ('ja-life-basic-3', 'ja', 'basic', 'daily life', '友達', 'ともだち', 'tomodachi', 'friend', '朋友', '友達に会います。', 'I meet a friend.', '我见朋友。'),
  ('ja-travel-basic-3', 'ja', 'basic', 'travel', '病院', 'びょういん', 'byoin', 'hospital', '医院', '病院は近いです。', 'The hospital is nearby.', '医院很近。'),
  ('ja-verbs-basic-3', 'ja', 'basic', 'common verbs', '買う', 'かう', 'kau', 'buy', '买', 'パンを買います。', 'I buy bread.', '我买面包。'),
  ('ko-food-basic-3', 'ko', 'basic', 'food', '차', '차', 'cha', 'tea', '茶', '따뜻한 차를 마셔요.', 'I drink warm tea.', '我喝热茶。'),
  ('ko-life-basic-3', 'ko', 'basic', 'daily life', '친구', '친구', 'chingu', 'friend', '朋友', '친구를 만나요.', 'I meet a friend.', '我见朋友。'),
  ('ko-travel-basic-3', 'ko', 'basic', 'travel', '병원', '병원', 'byeongwon', 'hospital', '医院', '병원이 가까워요.', 'The hospital is nearby.', '医院很近。'),
  ('ko-verbs-basic-3', 'ko', 'basic', 'common verbs', '사다', '사다', 'sada', 'buy', '买', '빵을 사요.', 'I buy bread.', '我买面包。'),
  ('ja-food-basic-4', 'ja', 'basic', 'food', 'パン', 'パン', 'pan', 'bread', '面包', 'パンを食べます。', 'I eat bread.', '我吃面包。'),
  ('ja-food-basic-5', 'ja', 'basic', 'food', '牛乳', 'ぎゅうにゅう', 'gyunyu', 'milk', '牛奶', '牛乳を飲みます。', 'I drink milk.', '我喝牛奶。'),
  ('ja-food-basic-6', 'ja', 'basic', 'food', '野菜', 'やさい', 'yasai', 'vegetables', '蔬菜', '野菜が好きです。', 'I like vegetables.', '我喜欢蔬菜。'),
  ('ja-travel-basic-4', 'ja', 'basic', 'travel', '空港', 'くうこう', 'kuko', 'airport', '机场', '空港へ行きます。', 'I go to the airport.', '我去机场。'),
  ('ja-travel-basic-5', 'ja', 'basic', 'travel', '道', 'みち', 'michi', 'road', '路', 'この道を歩きます。', 'I walk on this road.', '我走这条路。'),
  ('ja-travel-basic-6', 'ja', 'basic', 'travel', '地図', 'ちず', 'chizu', 'map', '地图', '地図を見ます。', 'I look at the map.', '我看地图。'),
  ('ja-life-basic-4', 'ja', 'basic', 'daily life', '家', 'いえ', 'ie', 'home', '家', '家に帰ります。', 'I go home.', '我回家。'),
  ('ja-life-basic-5', 'ja', 'basic', 'daily life', '電話', 'でんわ', 'denwa', 'phone', '电话', '電話をします。', 'I make a phone call.', '我打电话。'),
  ('ja-life-basic-6', 'ja', 'basic', 'daily life', '天気', 'てんき', 'tenki', 'weather', '天气', '今日は天気がいいです。', 'The weather is nice today.', '今天天气很好。'),
  ('ja-numbers-basic-3', 'ja', 'basic', 'numbers', '千', 'せん', 'sen', 'thousand', '千', '千円です。', 'It is one thousand yen.', '是一千日元。'),
  ('ja-numbers-basic-4', 'ja', 'basic', 'numbers', '半分', 'はんぶん', 'hanbun', 'half', '一半', '半分ください。', 'Please give me half.', '请给我一半。'),
  ('ja-verbs-basic-4', 'ja', 'basic', 'common verbs', '待つ', 'まつ', 'matsu', 'wait', '等', '少し待ちます。', 'I wait a little.', '我等一下。'),
  ('ja-verbs-basic-5', 'ja', 'basic', 'common verbs', '話す', 'はなす', 'hanasu', 'speak', '说话', '日本語を話します。', 'I speak Japanese.', '我说日语。'),
  ('ja-verbs-basic-6', 'ja', 'basic', 'common verbs', '聞く', 'きく', 'kiku', 'listen', '听', '音楽を聞きます。', 'I listen to music.', '我听音乐。'),
  ('ko-food-basic-4', 'ko', 'basic', 'food', '빵', '빵', 'ppang', 'bread', '面包', '빵을 먹어요.', 'I eat bread.', '我吃面包。'),
  ('ko-food-basic-5', 'ko', 'basic', 'food', '우유', '우유', 'uyu', 'milk', '牛奶', '우유를 마셔요.', 'I drink milk.', '我喝牛奶。'),
  ('ko-food-basic-6', 'ko', 'basic', 'food', '채소', '채소', 'chaeso', 'vegetables', '蔬菜', '채소를 좋아해요.', 'I like vegetables.', '我喜欢蔬菜。'),
  ('ko-travel-basic-4', 'ko', 'basic', 'travel', '공항', '공항', 'gonghang', 'airport', '机场', '공항에 가요.', 'I go to the airport.', '我去机场。'),
  ('ko-travel-basic-5', 'ko', 'basic', 'travel', '길', '길', 'gil', 'road', '路', '이 길로 걸어요.', 'I walk on this road.', '我走这条路。'),
  ('ko-travel-basic-6', 'ko', 'basic', 'travel', '지도', '지도', 'jido', 'map', '地图', '지도를 봐요.', 'I look at the map.', '我看地图。'),
  ('ko-life-basic-4', 'ko', 'basic', 'daily life', '집', '집', 'jip', 'home', '家', '집에 가요.', 'I go home.', '我回家。'),
  ('ko-life-basic-5', 'ko', 'basic', 'daily life', '전화', '전화', 'jeonhwa', 'phone', '电话', '전화를 해요.', 'I make a phone call.', '我打电话。'),
  ('ko-life-basic-6', 'ko', 'basic', 'daily life', '날씨', '날씨', 'nalssi', 'weather', '天气', '오늘은 날씨가 좋아요.', 'The weather is nice today.', '今天天气很好。'),
  ('ko-numbers-basic-3', 'ko', 'basic', 'numbers', '천', '천', 'cheon', 'thousand', '千', '천 원이에요.', 'It is one thousand won.', '是一千韩元。'),
  ('ko-numbers-basic-4', 'ko', 'basic', 'numbers', '반', '반', 'ban', 'half', '一半', '반 주세요.', 'Please give me half.', '请给我一半。'),
  ('ko-verbs-basic-4', 'ko', 'basic', 'common verbs', '기다리다', '기다리다', 'gidarida', 'wait', '等', '조금 기다려요.', 'I wait a little.', '我等一下。'),
  ('ko-verbs-basic-5', 'ko', 'basic', 'common verbs', '말하다', '말하다', 'malhada', 'speak', '说话', '한국어를 말해요.', 'I speak Korean.', '我说韩语。'),
  ('ko-verbs-basic-6', 'ko', 'basic', 'common verbs', '듣다', '듣다', 'deutda', 'listen', '听', '음악을 들어요.', 'I listen to music.', '我听音乐。'),
  ('ja-food-basic-7', 'ja', 'basic', 'food', '卵', 'たまご', 'tamago', 'egg', '鸡蛋', '卵を食べます。', 'I eat an egg.', '我吃鸡蛋。'),
  ('ko-food-basic-7', 'ko', 'basic', 'food', '계란', '계란', 'gyeran', 'egg', '鸡蛋', '계란을 먹어요.', 'I eat an egg.', '我吃鸡蛋。'),
  ('ja-food-basic-8', 'ja', 'basic', 'food', '魚', 'さかな', 'sakana', 'fish', '鱼', '魚を食べます。', 'I eat fish.', '我吃鱼。'),
  ('ko-food-basic-8', 'ko', 'basic', 'food', '생선', '생선', 'saengseon', 'fish', '鱼', '생선을 먹어요.', 'I eat fish.', '我吃鱼。'),
  ('ja-food-basic-9', 'ja', 'basic', 'food', '肉', 'にく', 'niku', 'meat', '肉', '肉を買います。', 'I buy meat.', '我买肉。'),
  ('ko-food-basic-9', 'ko', 'basic', 'food', '고기', '고기', 'gogi', 'meat', '肉', '고기를 사요.', 'I buy meat.', '我买肉。'),
  ('ja-food-basic-10', 'ja', 'basic', 'food', '果物', 'くだもの', 'kudamono', 'fruit', '水果', '果物が好きです。', 'I like fruit.', '我喜欢水果。'),
  ('ko-food-basic-10', 'ko', 'basic', 'food', '과일', '과일', 'gwail', 'fruit', '水果', '과일을 좋아해요.', 'I like fruit.', '我喜欢水果。'),
  ('ja-food-basic-11', 'ja', 'basic', 'food', 'コーヒー', 'コーヒー', 'kohi', 'coffee', '咖啡', 'コーヒーを飲みます。', 'I drink coffee.', '我喝咖啡。'),
  ('ko-food-basic-11', 'ko', 'basic', 'food', '커피', '커피', 'keopi', 'coffee', '咖啡', '커피를 마셔요.', 'I drink coffee.', '我喝咖啡。'),
  ('ja-food-basic-12', 'ja', 'basic', 'food', '朝食', 'ちょうしょく', 'choshoku', 'breakfast', '早饭', '朝食を作ります。', 'I prepare breakfast.', '我准备早饭。'),
  ('ko-food-basic-12', 'ko', 'basic', 'food', '아침 식사', '아침 식사', 'achim siksa', 'breakfast', '早饭', '아침 식사를 준비해요.', 'I prepare breakfast.', '我准备早饭。'),
  ('ja-food-basic-13', 'ja', 'basic', 'food', '昼食', 'ちゅうしょく', 'chushoku', 'lunch', '午饭', '昼食を食べます。', 'I eat lunch.', '我吃午饭。'),
  ('ko-food-basic-13', 'ko', 'basic', 'food', '점심', '점심', 'jeomsim', 'lunch', '午饭', '점심을 먹어요.', 'I eat lunch.', '我吃午饭。'),
  ('ja-food-basic-14', 'ja', 'basic', 'food', '夕食', 'ゆうしょく', 'yushoku', 'dinner', '晚饭', '夕食は七時です。', 'Dinner is at seven.', '晚饭是七点。'),
  ('ko-food-basic-14', 'ko', 'basic', 'food', '저녁', '저녁', 'jeonyeok', 'dinner', '晚饭', '저녁은 일곱 시예요.', 'Dinner is at seven.', '晚饭是七点。'),
  ('ja-travel-basic-7', 'ja', 'basic', 'travel', 'ホテル', 'ホテル', 'hoteru', 'hotel', '酒店', 'ホテルに泊まります。', 'I stay at a hotel.', '我住酒店。'),
  ('ko-travel-basic-7', 'ko', 'basic', 'travel', '호텔', '호텔', 'hotel', 'hotel', '酒店', '호텔에 묵어요.', 'I stay at a hotel.', '我住酒店。'),
  ('ja-travel-basic-8', 'ja', 'basic', 'travel', 'バス', 'バス', 'basu', 'bus', '公交车', 'バスに乗ります。', 'I take the bus.', '我坐公交车。'),
  ('ko-travel-basic-8', 'ko', 'basic', 'travel', '버스', '버스', 'beoseu', 'bus', '公交车', '버스를 타요.', 'I take the bus.', '我坐公交车。'),
  ('ja-travel-basic-9', 'ja', 'basic', 'travel', 'タクシー', 'タクシー', 'takushi', 'taxi', '出租车', 'タクシーを呼びます。', 'I call a taxi.', '我叫出租车。'),
  ('ko-travel-basic-9', 'ko', 'basic', 'travel', '택시', '택시', 'taeksi', 'taxi', '出租车', '택시를 불러요.', 'I call a taxi.', '我叫出租车。'),
  ('ja-travel-basic-10', 'ja', 'basic', 'travel', '左', 'ひだり', 'hidari', 'left', '左边', '左に曲がります。', 'I turn left.', '我向左转。'),
  ('ko-travel-basic-10', 'ko', 'basic', 'travel', '왼쪽', '왼쪽', 'oenjjok', 'left', '左边', '왼쪽으로 돌아요.', 'I turn left.', '我向左转。'),
  ('ja-travel-basic-11', 'ja', 'basic', 'travel', '右', 'みぎ', 'migi', 'right', '右边', '右に曲がります。', 'I turn right.', '我向右转。'),
  ('ko-travel-basic-11', 'ko', 'basic', 'travel', '오른쪽', '오른쪽', 'oreunjjok', 'right', '右边', '오른쪽으로 돌아요.', 'I turn right.', '我向右转。'),
  ('ja-travel-basic-12', 'ja', 'basic', 'travel', '入口', 'いりぐち', 'iriguchi', 'entrance', '入口', '入口はここです。', 'The entrance is here.', '入口在这里。'),
  ('ko-travel-basic-12', 'ko', 'basic', 'travel', '입구', '입구', 'ipgu', 'entrance', '入口', '입구는 여기예요.', 'The entrance is here.', '入口在这里。'),
  ('ja-travel-basic-13', 'ja', 'basic', 'travel', '出口', 'でぐち', 'deguchi', 'exit', '出口', '出口はあそこです。', 'The exit is over there.', '出口在那里。'),
  ('ko-travel-basic-13', 'ko', 'basic', 'travel', '출구', '출구', 'chulgu', 'exit', '出口', '출구는 저기예요.', 'The exit is over there.', '出口在那里。'),
  ('ja-travel-basic-14', 'ja', 'basic', 'travel', '荷物', 'にもつ', 'nimotsu', 'luggage', '行李', '荷物が重いです。', 'The luggage is heavy.', '行李很重。'),
  ('ko-travel-basic-14', 'ko', 'basic', 'travel', '짐', '짐', 'jim', 'luggage', '行李', '짐이 무거워요.', 'The luggage is heavy.', '行李很重。'),
  ('ja-life-basic-7', 'ja', 'basic', 'daily life', '朝', 'あさ', 'asa', 'morning', '早上', '朝に散歩します。', 'I take a walk in the morning.', '我早上散步。'),
  ('ko-life-basic-7', 'ko', 'basic', 'daily life', '아침', '아침', 'achim', 'morning', '早上', '아침에 산책해요.', 'I take a walk in the morning.', '我早上散步。'),
  ('ja-life-basic-8', 'ja', 'basic', 'daily life', '夜', 'よる', 'yoru', 'night', '晚上', '夜に勉強します。', 'I study at night.', '我晚上学习。'),
  ('ko-life-basic-8', 'ko', 'basic', 'daily life', '밤', '밤', 'bam', 'night', '晚上', '밤에 공부해요.', 'I study at night.', '我晚上学习。'),
  ('ja-life-basic-9', 'ja', 'basic', 'daily life', '部屋', 'へや', 'heya', 'room', '房间', '部屋を掃除します。', 'I clean the room.', '我打扫房间。'),
  ('ko-life-basic-9', 'ko', 'basic', 'daily life', '방', '방', 'bang', 'room', '房间', '방을 청소해요.', 'I clean the room.', '我打扫房间。'),
  ('ja-life-basic-10', 'ja', 'basic', 'daily life', '服', 'ふく', 'fuku', 'clothes', '衣服', '新しい服を買います。', 'I buy new clothes.', '我买新衣服。'),
  ('ko-life-basic-10', 'ko', 'basic', 'daily life', '옷', '옷', 'ot', 'clothes', '衣服', '새 옷을 사요.', 'I buy new clothes.', '我买新衣服。'),
  ('ja-life-basic-11', 'ja', 'basic', 'daily life', 'お金', 'おかね', 'okane', 'money', '钱', 'お金を払います。', 'I pay money.', '我付钱。'),
  ('ko-life-basic-11', 'ko', 'basic', 'daily life', '돈', '돈', 'don', 'money', '钱', '돈을 내요.', 'I pay money.', '我付钱。'),
  ('ja-life-basic-12', 'ja', 'basic', 'daily life', '時間', 'じかん', 'jikan', 'time', '时间', '時間があります。', 'I have time.', '我有时间。'),
  ('ko-life-basic-12', 'ko', 'basic', 'daily life', '시간', '시간', 'sigan', 'time', '时间', '시간이 있어요.', 'I have time.', '我有时间。'),
  ('ja-life-basic-13', 'ja', 'basic', 'daily life', '家族', 'かぞく', 'kazoku', 'family', '家人', '家族と話します。', 'I talk with my family.', '我和家人说话。'),
  ('ko-life-basic-13', 'ko', 'basic', 'daily life', '가족', '가족', 'gajok', 'family', '家人', '가족과 이야기해요.', 'I talk with my family.', '我和家人说话。'),
  ('ja-life-basic-14', 'ja', 'basic', 'daily life', '名前', 'なまえ', 'namae', 'name', '名字', '名前を書きます。', 'I write my name.', '我写名字。'),
  ('ko-life-basic-14', 'ko', 'basic', 'daily life', '이름', '이름', 'ireum', 'name', '名字', '이름을 써요.', 'I write my name.', '我写名字。'),
  ('ja-numbers-basic-5', 'ja', 'basic', 'numbers', '一', 'いち', 'ichi', 'one', '一', '一つあります。', 'There is one.', '有一个。'),
  ('ko-numbers-basic-5', 'ko', 'basic', 'numbers', '하나', '하나', 'hana', 'one', '一', '하나 있어요.', 'There is one.', '有一个。'),
  ('ja-numbers-basic-6', 'ja', 'basic', 'numbers', '二', 'に', 'ni', 'two', '二', '二つください。', 'Two, please.', '请给我两个。'),
  ('ko-numbers-basic-6', 'ko', 'basic', 'numbers', '둘', '둘', 'dul', 'two', '二', '둘 주세요.', 'Two, please.', '请给我两个。'),
  ('ja-numbers-basic-7', 'ja', 'basic', 'numbers', '三', 'さん', 'san', 'three', '三', '三人います。', 'There are three people.', '有三个人。'),
  ('ko-numbers-basic-7', 'ko', 'basic', 'numbers', '셋', '셋', 'set', 'three', '三', '셋이 있어요.', 'There are three people.', '有三个人。'),
  ('ja-numbers-basic-8', 'ja', 'basic', 'numbers', '四', 'よん / し', 'yon / shi', 'four', '四', '四時です。', 'It is four o''clock.', '现在四点。'),
  ('ko-numbers-basic-8', 'ko', 'basic', 'numbers', '넷', '넷', 'net', 'four', '四', '네 시예요.', 'It is four o''clock.', '现在四点。'),
  ('ja-numbers-basic-9', 'ja', 'basic', 'numbers', '五', 'ご', 'go', 'five', '五', '五分待ちます。', 'I wait five minutes.', '我等五分钟。'),
  ('ko-numbers-basic-9', 'ko', 'basic', 'numbers', '다섯', '다섯', 'daseot', 'five', '五', '다섯 분 기다려요.', 'I wait five minutes.', '我等五分钟。'),
  ('ja-numbers-basic-10', 'ja', 'basic', 'numbers', '六', 'ろく', 'roku', 'six', '六', '六時に起きます。', 'I get up at six.', '我六点起床。'),
  ('ko-numbers-basic-10', 'ko', 'basic', 'numbers', '여섯', '여섯', 'yeoseot', 'six', '六', '여섯 시에 일어나요.', 'I get up at six.', '我六点起床。'),
  ('ja-numbers-basic-11', 'ja', 'basic', 'numbers', '八', 'はち', 'hachi', 'eight', '八', '八時に出ます。', 'I leave at eight.', '我八点出门。'),
  ('ko-numbers-basic-11', 'ko', 'basic', 'numbers', '여덟', '여덟', 'yeodeol', 'eight', '八', '여덟 시에 나가요.', 'I leave at eight.', '我八点出门。'),
  ('ja-numbers-basic-12', 'ja', 'basic', 'numbers', '九', 'きゅう / く', 'kyu / ku', 'nine', '九', '九時に寝ます。', 'I sleep at nine.', '我九点睡觉。'),
  ('ko-numbers-basic-12', 'ko', 'basic', 'numbers', '아홉', '아홉', 'ahop', 'nine', '九', '아홉 시에 자요.', 'I sleep at nine.', '我九点睡觉。'),
  ('ja-numbers-basic-13', 'ja', 'basic', 'numbers', '十', 'じゅう', 'ju', 'ten', '十', '十個あります。', 'There are ten.', '有十个。'),
  ('ko-numbers-basic-13', 'ko', 'basic', 'numbers', '열', '열', 'yeol', 'ten', '十', '열 개 있어요.', 'There are ten.', '有十个。'),
  ('ja-numbers-basic-14', 'ja', 'basic', 'numbers', 'たくさん', 'たくさん', 'takusan', 'many', '很多', '本がたくさんあります。', 'There are many books.', '有很多书。'),
  ('ko-numbers-basic-14', 'ko', 'basic', 'numbers', '많이', '많이', 'mani', 'many', '很多', '책이 많이 있어요.', 'There are many books.', '有很多书。'),
  ('ja-verbs-basic-7', 'ja', 'basic', 'common verbs', '飲む', 'のむ', 'nomu', 'drink', '喝', '水を飲みます。', 'I drink water.', '我喝水。'),
  ('ko-verbs-basic-7', 'ko', 'basic', 'common verbs', '마시다', '마시다', 'masida', 'drink', '喝', '물을 마셔요.', 'I drink water.', '我喝水。'),
  ('ja-verbs-basic-8', 'ja', 'basic', 'common verbs', '読む', 'よむ', 'yomu', 'read', '读', '本を読みます。', 'I read a book.', '我读书。'),
  ('ko-verbs-basic-8', 'ko', 'basic', 'common verbs', '읽다', '읽다', 'ikda', 'read', '读', '책을 읽어요.', 'I read a book.', '我读书。'),
  ('ja-verbs-basic-9', 'ja', 'basic', 'common verbs', '書く', 'かく', 'kaku', 'write', '写', '手紙を書きます。', 'I write a letter.', '我写信。'),
  ('ko-verbs-basic-9', 'ko', 'basic', 'common verbs', '쓰다', '쓰다', 'sseuda', 'write', '写', '편지를 써요.', 'I write a letter.', '我写信。'),
  ('ja-verbs-basic-10', 'ja', 'basic', 'common verbs', '来る', 'くる', 'kuru', 'come', '来', '友達が来ます。', 'A friend comes.', '朋友来了。'),
  ('ko-verbs-basic-10', 'ko', 'basic', 'common verbs', '오다', '오다', 'oda', 'come', '来', '친구가 와요.', 'A friend comes.', '朋友来了。'),
  ('ja-verbs-basic-11', 'ja', 'basic', 'common verbs', '帰る', 'かえる', 'kaeru', 'return', '回来', '家に帰ります。', 'I return home.', '我回家。'),
  ('ko-verbs-basic-11', 'ko', 'basic', 'common verbs', '돌아가다', '돌아가다', 'doragada', 'return', '回来', '집에 돌아가요.', 'I return home.', '我回家。'),
  ('ja-verbs-basic-12', 'ja', 'basic', 'common verbs', '開ける', 'あける', 'akeru', 'open', '打开', '窓を開けます。', 'I open the window.', '我打开窗户。'),
  ('ko-verbs-basic-12', 'ko', 'basic', 'common verbs', '열다', '열다', 'yeolda', 'open', '打开', '창문을 열어요.', 'I open the window.', '我打开窗户。'),
  ('ja-verbs-basic-13', 'ja', 'basic', 'common verbs', '閉める', 'しめる', 'shimeru', 'close', '关上', 'ドアを閉めます。', 'I close the door.', '我关门。'),
  ('ko-verbs-basic-13', 'ko', 'basic', 'common verbs', '닫다', '닫다', 'datda', 'close', '关上', '문을 닫아요.', 'I close the door.', '我关门。'),
  ('ja-verbs-basic-14', 'ja', 'basic', 'common verbs', '使う', 'つかう', 'tsukau', 'use', '使用', 'スマホを使います。', 'I use a phone.', '我使用手机。'),
  ('ko-verbs-basic-14', 'ko', 'basic', 'common verbs', '사용하다', '사용하다', 'sayonghada', 'use', '使用', '휴대폰을 사용해요.', 'I use a phone.', '我使用手机。'),
  ('ja-food-basic-15', 'ja', 'basic', 'food', 'お菓子', 'おかし', 'okashi', 'snack', '零食', 'お菓子を少し食べます。', 'I eat a small snack.', '我吃一点零食。'),
  ('ko-food-basic-15', 'ko', 'basic', 'food', '과자', '과자', 'gwaja', 'snack', '零食', '과자를 조금 먹어요.', 'I eat a small snack.', '我吃一点零食。'),
  ('ja-travel-basic-15', 'ja', 'basic', 'travel', '橋', 'はし', 'hashi', 'bridge', '桥', '橋を渡ります。', 'I cross the bridge.', '我过桥。'),
  ('ko-travel-basic-15', 'ko', 'basic', 'travel', '다리', '다리', 'dari', 'bridge', '桥', '다리를 건너요.', 'I cross the bridge.', '我过桥。'),
  ('ja-life-basic-15', 'ja', 'basic', 'daily life', '鍵', 'かぎ', 'kagi', 'key', '钥匙', '鍵を持っています。', 'I have the key.', '我有钥匙。'),
  ('ko-life-basic-15', 'ko', 'basic', 'daily life', '열쇠', '열쇠', 'yeolsoe', 'key', '钥匙', '열쇠를 가지고 있어요.', 'I have the key.', '我有钥匙。'),
  ('ja-numbers-basic-15', 'ja', 'basic', 'numbers', '零', 'れい', 'rei', 'zero', '零', '答えは零です。', 'The answer is zero.', '答案是零。'),
  ('ko-numbers-basic-15', 'ko', 'basic', 'numbers', '영', '영', 'yeong', 'zero', '零', '답은 영이에요.', 'The answer is zero.', '答案是零。'),
  ('ja-verbs-basic-15', 'ja', 'basic', 'common verbs', '洗う', 'あらう', 'arau', 'wash', '洗', '手を洗います。', 'I wash my hands.', '我洗手。'),
  ('ko-verbs-basic-15', 'ko', 'basic', 'common verbs', '씻다', '씻다', 'ssitda', 'wash', '洗', '손을 씻어요.', 'I wash my hands.', '我洗手。'),
  ('ja-work-intermediate-1', 'ja', 'intermediate', 'work', '会議', 'かいぎ', 'kaigi', 'meeting', '会议', '午後に会議があります。', 'There is a meeting in the afternoon.', '下午有会议。'),
  ('ja-school-intermediate-1', 'ja', 'intermediate', 'school', '課題', 'かだい', 'kadai', 'assignment', '作业', '課題を提出しました。', 'I submitted the assignment.', '我提交了作业。'),
  ('ja-anime-intermediate-1', 'ja', 'intermediate', 'anime/drama', '主人公', 'しゅじんこう', 'shujinko', 'protagonist', '主角', '主人公は勇敢です。', 'The main character is brave.', '主角很勇敢。'),
  ('ja-work-intermediate-2', 'ja', 'intermediate', 'work', '締め切り', 'しめきり', 'shimekiri', 'deadline', '截止日期', '締め切りは金曜日です。', 'The deadline is Friday.', '截止日期是星期五。'),
  ('ja-school-intermediate-2', 'ja', 'intermediate', 'school', '復習', 'ふくしゅう', 'fukushu', 'review', '复习', '寝る前に復習します。', 'I review before sleeping.', '我睡前复习。'),
  ('ja-anime-intermediate-2', 'ja', 'intermediate', 'anime/drama', '場面', 'ばめん', 'bamen', 'scene', '场面', 'この場面が好きです。', 'I like this scene.', '我喜欢这个场面。'),
  ('ko-work-intermediate-1', 'ko', 'intermediate', 'work', '회의', '회의', 'hoeui', 'meeting', '会议', '오후에 회의가 있어요.', 'There is a meeting in the afternoon.', '下午有会议。'),
  ('ko-school-intermediate-1', 'ko', 'intermediate', 'school', '과제', '과제', 'gwaje', 'assignment', '作业', '과제를 냈어요.', 'I turned in the assignment.', '我交了作业。'),
  ('ko-drama-intermediate-1', 'ko', 'intermediate', 'anime/drama', '주인공', '주인공', 'juingong', 'protagonist', '主角', '주인공이 용감해요.', 'The main character is brave.', '主角很勇敢。'),
  ('ko-work-intermediate-2', 'ko', 'intermediate', 'work', '마감', '마감', 'magam', 'deadline', '截止', '마감은 금요일이에요.', 'The deadline is Friday.', '截止日期是星期五。'),
  ('ko-school-intermediate-2', 'ko', 'intermediate', 'school', '복습', '복습', 'bokseup', 'review', '复习', '자기 전에 복습해요.', 'I review before sleeping.', '我睡前复习。'),
  ('ko-drama-intermediate-2', 'ko', 'intermediate', 'anime/drama', '장면', '장면', 'jangmyeon', 'scene', '场面', '이 장면이 좋아요.', 'I like this scene.', '我喜欢这个场面。'),
  ('ja-work-intermediate-3', 'ja', 'intermediate', 'work', '連絡', 'れんらく', 'renraku', 'contact', '联系', '後で連絡します。', 'I will contact you later.', '我稍后联系你。'),
  ('ja-school-intermediate-3', 'ja', 'intermediate', 'school', '試験', 'しけん', 'shiken', 'exam', '考试', '明日は試験です。', 'Tomorrow is the exam.', '明天是考试。'),
  ('ja-anime-intermediate-3', 'ja', 'intermediate', 'anime/drama', '展開', 'てんかい', 'tenkai', 'development', '发展', '次の展開が気になります。', 'I wonder what happens next.', '我很好奇接下来的发展。'),
  ('ja-travel-intermediate-1', 'ja', 'intermediate', 'travel', '予約', 'よやく', 'yoyaku', 'reservation', '预约', 'ホテルを予約しました。', 'I booked a hotel.', '我预约了酒店。'),
  ('ko-work-intermediate-3', 'ko', 'intermediate', 'work', '연락', '연락', 'yeollak', 'contact', '联系', '나중에 연락할게요.', 'I will contact you later.', '我稍后联系你。'),
  ('ko-school-intermediate-3', 'ko', 'intermediate', 'school', '시험', '시험', 'siheom', 'exam', '考试', '내일은 시험이에요.', 'Tomorrow is the exam.', '明天是考试。'),
  ('ko-drama-intermediate-3', 'ko', 'intermediate', 'anime/drama', '전개', '전개', 'jeongae', 'development', '发展', '다음 전개가 궁금해요.', 'I wonder what happens next.', '我很好奇接下来的发展。'),
  ('ko-travel-intermediate-1', 'ko', 'intermediate', 'travel', '예약', '예약', 'yeyak', 'reservation', '预约', '호텔을 예약했어요.', 'I booked a hotel.', '我预约了酒店。'),
  ('ja-food-intermediate-1', 'ja', 'intermediate', 'food', '注文', 'ちゅうもん', 'chumon', 'order', '点餐', '料理を注文しました。', 'I ordered food.', '我点了菜。'),
  ('ja-life-intermediate-1', 'ja', 'intermediate', 'daily life', '準備', 'じゅんび', 'junbi', 'preparation', '准备', '旅行の準備をします。', 'I prepare for the trip.', '我准备旅行。'),
  ('ja-work-intermediate-4', 'ja', 'intermediate', 'work', '確認', 'かくにん', 'kakunin', 'confirmation', '确认', '資料を確認します。', 'I check the documents.', '我确认资料。'),
  ('ja-work-intermediate-5', 'ja', 'intermediate', 'work', '提案', 'ていあん', 'teian', 'proposal', '提案', '新しい提案があります。', 'I have a new proposal.', '我有新的提案。'),
  ('ja-school-intermediate-4', 'ja', 'intermediate', 'school', '合格', 'ごうかく', 'gokaku', 'passing', '合格', '試験に合格しました。', 'I passed the exam.', '我考试合格了。'),
  ('ja-school-intermediate-5', 'ja', 'intermediate', 'school', '発表', 'はっぴょう', 'happyo', 'presentation', '发表', '授業で発表します。', 'I give a presentation in class.', '我在课上发表。'),
  ('ja-anime-intermediate-4', 'ja', 'intermediate', 'anime/drama', '声優', 'せいゆう', 'seiyu', 'actor', '声优', 'この声優が好きです。', 'I like this voice actor.', '我喜欢这个声优。'),
  ('ja-anime-intermediate-5', 'ja', 'intermediate', 'anime/drama', '最終回', 'さいしゅうかい', 'saishukai', 'finale', '最后一集', '最終回を見ました。', 'I watched the final episode.', '我看了最后一集。'),
  ('ko-food-intermediate-1', 'ko', 'intermediate', 'food', '주문', '주문', 'jumun', 'order', '点餐', '음식을 주문했어요.', 'I ordered food.', '我点了菜。'),
  ('ko-life-intermediate-1', 'ko', 'intermediate', 'daily life', '준비', '준비', 'junbi', 'preparation', '准备', '여행 준비를 해요.', 'I prepare for the trip.', '我准备旅行。'),
  ('ko-work-intermediate-4', 'ko', 'intermediate', 'work', '확인', '확인', 'hwagin', 'confirmation', '确认', '자료를 확인해요.', 'I check the documents.', '我确认资料。'),
  ('ko-work-intermediate-5', 'ko', 'intermediate', 'work', '제안', '제안', 'jean', 'proposal', '提案', '새로운 제안이 있어요.', 'I have a new proposal.', '我有新的提案。'),
  ('ko-school-intermediate-4', 'ko', 'intermediate', 'school', '합격', '합격', 'hapgyeok', 'passing', '合格', '시험에 합격했어요.', 'I passed the exam.', '我考试合格了。'),
  ('ko-school-intermediate-5', 'ko', 'intermediate', 'school', '발표', '발표', 'balpyo', 'presentation', '发表', '수업에서 발표해요.', 'I give a presentation in class.', '我在课上发表。'),
  ('ko-drama-intermediate-4', 'ko', 'intermediate', 'anime/drama', '성우', '성우', 'seongu', 'actor', '声优', '이 성우를 좋아해요.', 'I like this voice actor.', '我喜欢这个声优。'),
  ('ko-drama-intermediate-5', 'ko', 'intermediate', 'anime/drama', '마지막 회', '마지막 회', 'majimak hoe', 'finale', '最后一集', '마지막 회를 봤어요.', 'I watched the final episode.', '我看了最后一集。'),
  ('ja-food-intermediate-2', 'ja', 'intermediate', 'food', 'メニュー', 'メニュー', 'menyu', 'menu', '菜单', 'メニューを確認します。', 'I check the menu.', '我确认菜单。'),
  ('ko-food-intermediate-2', 'ko', 'intermediate', 'food', '메뉴', '메뉴', 'menyu', 'menu', '菜单', '메뉴를 확인해요.', 'I check the menu.', '我确认菜单。'),
  ('ja-food-intermediate-3', 'ja', 'intermediate', 'food', '材料', 'ざいりょう', 'zairyo', 'ingredient', '食材', '材料を切ります。', 'I cut the ingredients.', '我切食材。'),
  ('ko-food-intermediate-3', 'ko', 'intermediate', 'food', '재료', '재료', 'jaeryo', 'ingredient', '食材', '재료를 썰어요.', 'I cut the ingredients.', '我切食材。'),
  ('ja-food-intermediate-4', 'ja', 'intermediate', 'food', '味', 'あじ', 'aji', 'taste', '味道', '味が濃いです。', 'The taste is strong.', '味道很浓。'),
  ('ko-food-intermediate-4', 'ko', 'intermediate', 'food', '맛', '맛', 'mat', 'taste', '味道', '맛이 진해요.', 'The taste is strong.', '味道很浓。'),
  ('ja-food-intermediate-5', 'ja', 'intermediate', 'food', '辛い', 'からい', 'karai', 'spicy', '辣的', 'この料理は辛いです。', 'This food is spicy.', '这道菜很辣。'),
  ('ko-food-intermediate-5', 'ko', 'intermediate', 'food', '맵다', '맵다', 'maepda', 'spicy', '辣的', '이 음식은 매워요.', 'This food is spicy.', '这道菜很辣。'),
  ('ja-travel-intermediate-2', 'ja', 'intermediate', 'travel', '出発', 'しゅっぱつ', 'shuppatsu', 'departure', '出发', '出発は朝です。', 'Departure is in the morning.', '早上出发。'),
  ('ko-travel-intermediate-2', 'ko', 'intermediate', 'travel', '출발', '출발', 'chulbal', 'departure', '出发', '출발은 아침이에요.', 'Departure is in the morning.', '早上出发。'),
  ('ja-travel-intermediate-3', 'ja', 'intermediate', 'travel', '到着', 'とうちゃく', 'tochaku', 'arrival', '到达', '到着は夜です。', 'Arrival is at night.', '晚上到达。'),
  ('ko-travel-intermediate-3', 'ko', 'intermediate', 'travel', '도착', '도착', 'dochag', 'arrival', '到达', '도착은 밤이에요.', 'Arrival is at night.', '晚上到达。'),
  ('ja-travel-intermediate-4', 'ja', 'intermediate', 'travel', '乗り換え', 'のりかえ', 'norikae', 'transfer', '换乘', '駅で乗り換えます。', 'I transfer at the station.', '我在车站换乘。'),
  ('ko-travel-intermediate-4', 'ko', 'intermediate', 'travel', '환승', '환승', 'hwanseung', 'transfer', '换乘', '역에서 환승해요.', 'I transfer at the station.', '我在车站换乘。'),
  ('ja-travel-intermediate-5', 'ja', 'intermediate', 'travel', '経路', 'けいろ', 'keiro', 'route', '路线', '経路を調べます。', 'I look up the route.', '我查路线。'),
  ('ko-travel-intermediate-5', 'ko', 'intermediate', 'travel', '경로', '경로', 'gyeongno', 'route', '路线', '경로를 찾아봐요.', 'I look up the route.', '我查路线。'),
  ('ja-life-intermediate-2', 'ja', 'intermediate', 'daily life', '約束', 'やくそく', 'yakusoku', 'appointment', '约定', '友達と約束があります。', 'I have an appointment with a friend.', '我和朋友有约。'),
  ('ko-life-intermediate-2', 'ko', 'intermediate', 'daily life', '약속', '약속', 'yaksok', 'appointment', '约定', '친구와 약속이 있어요.', 'I have an appointment with a friend.', '我和朋友有约。'),
  ('ja-life-intermediate-3', 'ja', 'intermediate', 'daily life', '習慣', 'しゅうかん', 'shukan', 'habit', '习惯', '早起きの習慣があります。', 'I have a habit of waking early.', '我有早起的习惯。'),
  ('ko-life-intermediate-3', 'ko', 'intermediate', 'daily life', '습관', '습관', 'seupgwan', 'habit', '习惯', '일찍 일어나는 습관이 있어요.', 'I have a habit of waking early.', '我有早起的习惯。'),
  ('ja-life-intermediate-4', 'ja', 'intermediate', 'daily life', '記憶', 'きおく', 'kioku', 'memory', '记忆', 'その記憶は大切です。', 'That memory is precious.', '那个记忆很珍贵。'),
  ('ko-life-intermediate-4', 'ko', 'intermediate', 'daily life', '기억', '기억', 'gieok', 'memory', '记忆', '그 기억은 소중해요.', 'That memory is precious.', '那个记忆很珍贵。'),
  ('ja-life-intermediate-5', 'ja', 'intermediate', 'daily life', '健康', 'けんこう', 'kenko', 'health', '健康', '健康に気をつけます。', 'I take care of my health.', '我注意健康。'),
  ('ko-life-intermediate-5', 'ko', 'intermediate', 'daily life', '건강', '건강', 'geongang', 'health', '健康', '건강을 챙겨요.', 'I take care of my health.', '我注意健康。'),
  ('ja-work-intermediate-6', 'ja', 'intermediate', 'work', '報告', 'ほうこく', 'hokoku', 'report', '报告', '結果を報告します。', 'I report the results.', '我报告结果。'),
  ('ko-work-intermediate-6', 'ko', 'intermediate', 'work', '보고', '보고', 'bogo', 'report', '报告', '결과를 보고해요.', 'I report the results.', '我报告结果。'),
  ('ja-work-intermediate-7', 'ja', 'intermediate', 'work', '承認', 'しょうにん', 'shonin', 'approval', '批准', '承認を待っています。', 'I am waiting for approval.', '我在等批准。'),
  ('ko-work-intermediate-7', 'ko', 'intermediate', 'work', '승인', '승인', 'seungin', 'approval', '批准', '승인을 기다려요.', 'I am waiting for approval.', '我在等批准。'),
  ('ja-work-intermediate-8', 'ja', 'intermediate', 'work', '予定', 'よてい', 'yotei', 'schedule', '日程', '予定を変更します。', 'I change the schedule.', '我改日程。'),
  ('ko-work-intermediate-8', 'ko', 'intermediate', 'work', '일정', '일정', 'iljeong', 'schedule', '日程', '일정을 바꿔요.', 'I change the schedule.', '我改日程。'),
  ('ja-work-intermediate-9', 'ja', 'intermediate', 'work', '顧客', 'こきゃく', 'kokyaku', 'client', '客户', '顧客に説明します。', 'I explain it to the client.', '我向客户说明。'),
  ('ko-work-intermediate-9', 'ko', 'intermediate', 'work', '고객', '고객', 'gogaek', 'client', '客户', '고객에게 설명해요.', 'I explain it to the client.', '我向客户说明。'),
  ('ja-work-intermediate-10', 'ja', 'intermediate', 'work', '契約', 'けいやく', 'keiyaku', 'contract', '合同', '契約を結びます。', 'We sign a contract.', '我们签合同。'),
  ('ko-work-intermediate-10', 'ko', 'intermediate', 'work', '계약', '계약', 'gyeyak', 'contract', '合同', '계약을 맺어요.', 'We sign a contract.', '我们签合同。'),
  ('ja-work-intermediate-11', 'ja', 'intermediate', 'work', '部署', 'ぶしょ', 'busho', 'department', '部门', '部署を移ります。', 'I move to another department.', '我调到别的部门。'),
  ('ko-work-intermediate-11', 'ko', 'intermediate', 'work', '부서', '부서', 'buseo', 'department', '部门', '부서를 옮겨요.', 'I move to another department.', '我调到别的部门。'),
  ('ja-work-intermediate-12', 'ja', 'intermediate', 'work', '責任', 'せきにん', 'sekinin', 'responsibility', '责任', '責任を持ちます。', 'I take responsibility.', '我承担责任。'),
  ('ko-work-intermediate-12', 'ko', 'intermediate', 'work', '책임', '책임', 'chaegim', 'responsibility', '责任', '책임을 져요.', 'I take responsibility.', '我承担责任。'),
  ('ja-school-intermediate-6', 'ja', 'intermediate', 'school', '講義', 'こうぎ', 'kogi', 'lecture', '讲课', '講義を受けます。', 'I attend a lecture.', '我听课。'),
  ('ko-school-intermediate-6', 'ko', 'intermediate', 'school', '강의', '강의', 'gangui', 'lecture', '讲课', '강의를 들어요.', 'I attend a lecture.', '我听课。'),
  ('ja-school-intermediate-7', 'ja', 'intermediate', 'school', '研究', 'けんきゅう', 'kenkyu', 'research', '研究', '日本語を研究します。', 'I research the language.', '我研究语言。'),
  ('ko-school-intermediate-7', 'ko', 'intermediate', 'school', '연구', '연구', 'yeongu', 'research', '研究', '한국어를 연구해요.', 'I research the language.', '我研究语言。'),
  ('ja-school-intermediate-8', 'ja', 'intermediate', 'school', '成績', 'せいせき', 'seiseki', 'grade', '成绩', '成績が上がりました。', 'My grades improved.', '我的成绩提高了。'),
  ('ko-school-intermediate-8', 'ko', 'intermediate', 'school', '성적', '성적', 'seongjeok', 'grade', '成绩', '성적이 올랐어요.', 'My grades improved.', '我的成绩提高了。'),
  ('ja-school-intermediate-9', 'ja', 'intermediate', 'school', '出席', 'しゅっせき', 'shusseki', 'attendance', '出席', '毎日出席します。', 'I attend every day.', '我每天出席。'),
  ('ko-school-intermediate-9', 'ko', 'intermediate', 'school', '출석', '출석', 'chulseok', 'attendance', '出席', '매일 출석해요.', 'I attend every day.', '我每天出席。'),
  ('ja-school-intermediate-10', 'ja', 'intermediate', 'school', '質問', 'しつもん', 'shitsumon', 'question', '问题', '先生に質問します。', 'I ask the teacher a question.', '我问老师问题。'),
  ('ko-school-intermediate-10', 'ko', 'intermediate', 'school', '질문', '질문', 'jilmun', 'question', '问题', '선생님께 질문해요.', 'I ask the teacher a question.', '我问老师问题。'),
  ('ja-school-intermediate-11', 'ja', 'intermediate', 'school', '説明', 'せつめい', 'setsumei', 'explanation', '说明', '説明を聞きます。', 'I listen to the explanation.', '我听说明。'),
  ('ko-school-intermediate-11', 'ko', 'intermediate', 'school', '설명', '설명', 'seolmyeong', 'explanation', '说明', '설명을 들어요.', 'I listen to the explanation.', '我听说明。'),
  ('ja-school-intermediate-12', 'ja', 'intermediate', 'school', '卒業', 'そつぎょう', 'sotsugyo', 'graduation', '毕业', '来年卒業します。', 'I graduate next year.', '我明年毕业。'),
  ('ko-school-intermediate-12', 'ko', 'intermediate', 'school', '졸업', '졸업', 'joreop', 'graduation', '毕业', '내년에 졸업해요.', 'I graduate next year.', '我明年毕业。'),
  ('ja-anime-intermediate-6', 'ja', 'intermediate', 'anime/drama', 'エピソード', 'エピソード', 'episodo', 'episode', '一集', '次のエピソードを見ます。', 'I watch the next episode.', '我看下一集。'),
  ('ko-drama-intermediate-6', 'ko', 'intermediate', 'anime/drama', '에피소드', '에피소드', 'episodeu', 'episode', '一集', '다음 에피소드를 봐요.', 'I watch the next episode.', '我看下一集。'),
  ('ja-anime-intermediate-7', 'ja', 'intermediate', 'anime/drama', '字幕', 'じまく', 'jimaku', 'subtitle', '字幕', '字幕をつけます。', 'I turn on subtitles.', '我打开字幕。'),
  ('ko-drama-intermediate-7', 'ko', 'intermediate', 'anime/drama', '자막', '자막', 'jamak', 'subtitle', '字幕', '자막을 켜요.', 'I turn on subtitles.', '我打开字幕。'),
  ('ja-anime-intermediate-8', 'ja', 'intermediate', 'anime/drama', '監督', 'かんとく', 'kantoku', 'director', '导演', '監督の名前を知っています。', 'I know the director''s name.', '我知道导演的名字。'),
  ('ko-drama-intermediate-8', 'ko', 'intermediate', 'anime/drama', '감독', '감독', 'gamdok', 'director', '导演', '감독 이름을 알아요.', 'I know the director''s name.', '我知道导演的名字。'),
  ('ja-anime-intermediate-9', 'ja', 'intermediate', 'anime/drama', '俳優', 'はいゆう', 'haiyu', 'actor', '演员', '俳優が上手です。', 'The actor performs well.', '演员演得很好。'),
  ('ko-drama-intermediate-9', 'ko', 'intermediate', 'anime/drama', '배우', '배우', 'baeu', 'actor', '演员', '배우가 연기를 잘해요.', 'The actor performs well.', '演员演得很好。'),
  ('ja-anime-intermediate-10', 'ja', 'intermediate', 'anime/drama', '筋', 'すじ', 'suji', 'plot', '剧情', '話の筋が面白いです。', 'The plot is interesting.', '剧情很有趣。'),
  ('ko-drama-intermediate-10', 'ko', 'intermediate', 'anime/drama', '줄거리', '줄거리', 'julgeori', 'plot', '剧情', '줄거리가 재미있어요.', 'The plot is interesting.', '剧情很有趣。'),
  ('ja-anime-intermediate-11', 'ja', 'intermediate', 'anime/drama', '結末', 'けつまつ', 'ketsumatsu', 'ending', '结局', '結末に驚きました。', 'I was surprised by the ending.', '结局让我吃惊。'),
  ('ko-drama-intermediate-11', 'ko', 'intermediate', 'anime/drama', '결말', '결말', 'gyeolmal', 'ending', '结局', '결말에 놀랐어요.', 'I was surprised by the ending.', '结局让我吃惊。'),
  ('ja-food-intermediate-6', 'ja', 'intermediate', 'food', '食材', 'しょくざい', 'shokuzai', 'ingredient', '食材', '新鮮な食材を選びます。', 'I choose fresh ingredients.', '我选择新鲜食材。'),
  ('ko-food-intermediate-6', 'ko', 'intermediate', 'food', '식재료', '식재료', 'sikjaeryo', 'ingredient', '食材', '신선한 식재료를 골라요.', 'I choose fresh ingredients.', '我选择新鲜食材。'),
  ('ja-food-intermediate-7', 'ja', 'intermediate', 'food', '味', 'あじ', 'aji', 'taste', '味道', '味を確認します。', 'I check the taste.', '我确认味道。'),
  ('ko-food-intermediate-7', 'ko', 'intermediate', 'food', '맛', '맛', 'mat', 'taste', '味道', '맛을 확인해요.', 'I check the taste.', '我确认味道。'),
  ('ja-food-intermediate-8', 'ja', 'intermediate', 'food', '栄養', 'えいよう', 'eiyo', 'nutrition', '营养', '栄養を考えます。', 'I consider nutrition.', '我考虑营养。'),
  ('ko-food-intermediate-8', 'ko', 'intermediate', 'food', '영양', '영양', 'yeongyang', 'nutrition', '营养', '영양을 생각해요.', 'I consider nutrition.', '我考虑营养。'),
  ('ja-food-intermediate-9', 'ja', 'intermediate', 'food', '食欲', 'しょくよく', 'shokuyoku', 'appetite', '食欲', '食欲があります。', 'I have an appetite.', '我有食欲。'),
  ('ko-food-intermediate-9', 'ko', 'intermediate', 'food', '식욕', '식욕', 'sigyok', 'appetite', '食欲', '식욕이 있어요.', 'I have an appetite.', '我有食欲。'),
  ('ja-food-intermediate-10', 'ja', 'intermediate', 'food', '調理', 'ちょうり', 'chori', 'cooking', '烹饪', '野菜を調理します。', 'I cook vegetables.', '我烹饪蔬菜。'),
  ('ko-food-intermediate-10', 'ko', 'intermediate', 'food', '조리', '조리', 'jori', 'cooking', '烹饪', '채소를 조리해요.', 'I cook vegetables.', '我烹饪蔬菜。'),
  ('ja-travel-intermediate-6', 'ja', 'intermediate', 'travel', '乗り換え', 'のりかえ', 'norikae', 'transfer', '换乘', '駅で乗り換えます。', 'I transfer at the station.', '我在车站换乘。'),
  ('ko-travel-intermediate-6', 'ko', 'intermediate', 'travel', '환승', '환승', 'hwanseung', 'transfer', '换乘', '역에서 환승해요.', 'I transfer at the station.', '我在车站换乘。'),
  ('ja-travel-intermediate-7', 'ja', 'intermediate', 'travel', '目的地', 'もくてきち', 'mokutekichi', 'destination', '目的地', '目的地に着きました。', 'I arrived at the destination.', '我到达目的地。'),
  ('ko-travel-intermediate-7', 'ko', 'intermediate', 'travel', '목적지', '목적지', 'mokjeokji', 'destination', '目的地', '목적지에 도착했어요.', 'I arrived at the destination.', '我到达目的地。'),
  ('ja-travel-intermediate-8', 'ja', 'intermediate', 'travel', '出発', 'しゅっぱつ', 'shuppatsu', 'departure', '出发', '出発は朝です。', 'Departure is in the morning.', '早上出发。'),
  ('ko-travel-intermediate-8', 'ko', 'intermediate', 'travel', '출발', '출발', 'chulbal', 'departure', '出发', '출발은 아침이에요.', 'Departure is in the morning.', '早上出发。'),
  ('ja-travel-intermediate-9', 'ja', 'intermediate', 'travel', '到着', 'とうちゃく', 'tochaku', 'arrival', '到达', '到着を待ちます。', 'I wait for arrival.', '我等待到达。'),
  ('ko-travel-intermediate-9', 'ko', 'intermediate', 'travel', '도착', '도착', 'dochag', 'arrival', '到达', '도착을 기다려요.', 'I wait for arrival.', '我等待到达。'),
  ('ja-travel-intermediate-10', 'ja', 'intermediate', 'travel', '観光', 'かんこう', 'kanko', 'sightseeing', '观光', '京都を観光します。', 'I go sightseeing.', '我去观光。'),
  ('ko-travel-intermediate-10', 'ko', 'intermediate', 'travel', '관광', '관광', 'gwangwang', 'sightseeing', '观光', '서울을 관광해요.', 'I go sightseeing.', '我去观光。'),
  ('ja-life-intermediate-6', 'ja', 'intermediate', 'daily life', '洗濯', 'せんたく', 'sentaku', 'laundry', '洗衣', '週末に洗濯します。', 'I do laundry on weekends.', '我周末洗衣服。'),
  ('ko-life-intermediate-6', 'ko', 'intermediate', 'daily life', '세탁', '세탁', 'setak', 'laundry', '洗衣', '주말에 세탁해요.', 'I do laundry on weekends.', '我周末洗衣服。'),
  ('ja-life-intermediate-7', 'ja', 'intermediate', 'daily life', '掃除', 'そうじ', 'soji', 'cleaning', '打扫', '部屋を掃除します。', 'I clean the room.', '我打扫房间。'),
  ('ko-life-intermediate-7', 'ko', 'intermediate', 'daily life', '청소', '청소', 'cheongso', 'cleaning', '打扫', '방을 청소해요.', 'I clean the room.', '我打扫房间。'),
  ('ja-life-intermediate-8', 'ja', 'intermediate', 'daily life', '予定', 'よてい', 'yotei', 'schedule', '日程', '予定を確認します。', 'I check the schedule.', '我确认日程。'),
  ('ko-life-intermediate-8', 'ko', 'intermediate', 'daily life', '일정', '일정', 'iljeong', 'schedule', '日程', '일정을 확인해요.', 'I check the schedule.', '我确认日程。'),
  ('ja-life-intermediate-9', 'ja', 'intermediate', 'daily life', '近所', 'きんじょ', 'kinjo', 'neighborhood', '附近', '近所を散歩します。', 'I walk around the neighborhood.', '我在附近散步。'),
  ('ko-life-intermediate-9', 'ko', 'intermediate', 'daily life', '동네', '동네', 'dongne', 'neighborhood', '附近', '동네를 산책해요.', 'I walk around the neighborhood.', '我在附近散步。'),
  ('ja-life-intermediate-10', 'ja', 'intermediate', 'daily life', '習慣', 'しゅうかん', 'shukan', 'habit', '习惯', '良い習慣を作ります。', 'I build a good habit.', '我养成好习惯。'),
  ('ko-life-intermediate-10', 'ko', 'intermediate', 'daily life', '습관', '습관', 'seupgwan', 'habit', '习惯', '좋은 습관을 만들어요.', 'I build a good habit.', '我养成好习惯。'),
  ('ja-work-intermediate-13', 'ja', 'intermediate', 'work', '報告', 'ほうこく', 'hokoku', 'report', '报告', '結果を報告します。', 'I report the result.', '我报告结果。'),
  ('ko-work-intermediate-13', 'ko', 'intermediate', 'work', '보고', '보고', 'bogo', 'report', '报告', '결과를 보고해요.', 'I report the result.', '我报告结果。'),
  ('ja-work-intermediate-14', 'ja', 'intermediate', 'work', '相談', 'そうだん', 'sodan', 'consultation', '商量', '上司に相談します。', 'I consult my manager.', '我和上司商量。'),
  ('ko-work-intermediate-14', 'ko', 'intermediate', 'work', '상담', '상담', 'sangdam', 'consultation', '商量', '상사와 상담해요.', 'I consult my manager.', '我和上司商量。'),
  ('ja-work-intermediate-15', 'ja', 'intermediate', 'work', '依頼', 'いらい', 'irai', 'request', '请求', '資料を依頼します。', 'I request the documents.', '我请求资料。'),
  ('ko-work-intermediate-15', 'ko', 'intermediate', 'work', '요청', '요청', 'yocheong', 'request', '请求', '자료를 요청해요.', 'I request the documents.', '我请求资料。'),
  ('ja-work-intermediate-16', 'ja', 'intermediate', 'work', '進捗', 'しんちょく', 'shinchoku', 'progress', '进展', '進捗を共有します。', 'I share progress.', '我分享进展。'),
  ('ko-work-intermediate-16', 'ko', 'intermediate', 'work', '진행', '진행', 'jinhaeng', 'progress', '进展', '진행 상황을 공유해요.', 'I share progress.', '我分享进展。'),
  ('ja-school-intermediate-13', 'ja', 'intermediate', 'school', '講義', 'こうぎ', 'kogi', 'lecture', '讲课', '講義を受けます。', 'I attend a lecture.', '我听课。'),
  ('ko-school-intermediate-13', 'ko', 'intermediate', 'school', '강의', '강의', 'gangui', 'lecture', '讲课', '강의를 들어요.', 'I attend a lecture.', '我听课。'),
  ('ja-school-intermediate-14', 'ja', 'intermediate', 'school', '教科書', 'きょうかしょ', 'kyokasho', 'textbook', '课本', '教科書を開きます。', 'I open the textbook.', '我打开课本。'),
  ('ko-school-intermediate-14', 'ko', 'intermediate', 'school', '교과서', '교과서', 'gyogwaseo', 'textbook', '课本', '교과서를 펴요.', 'I open the textbook.', '我打开课本。'),
  ('ja-school-intermediate-15', 'ja', 'intermediate', 'school', '欠席', 'けっせき', 'kesseki', 'absence', '缺席', '今日は欠席です。', 'I am absent today.', '我今天缺席。'),
  ('ko-school-intermediate-15', 'ko', 'intermediate', 'school', '결석', '결석', 'gyeolseok', 'absence', '缺席', '오늘은 결석이에요.', 'I am absent today.', '我今天缺席。'),
  ('ja-school-intermediate-16', 'ja', 'intermediate', 'school', '成績', 'せいせき', 'seiseki', 'grade', '成绩', '成績が上がりました。', 'My grade improved.', '我的成绩提高了。'),
  ('ko-school-intermediate-16', 'ko', 'intermediate', 'school', '성적', '성적', 'seongjeok', 'grade', '成绩', '성적이 올랐어요.', 'My grade improved.', '我的成绩提高了。'),
  ('ja-anime-intermediate-12', 'ja', 'intermediate', 'anime/drama', '脚本', 'きゃくほん', 'kyakuhon', 'script', '剧本', '脚本を読みます。', 'I read the script.', '我读剧本。'),
  ('ko-drama-intermediate-12', 'ko', 'intermediate', 'anime/drama', '대본', '대본', 'daebon', 'script', '剧本', '대본을 읽어요.', 'I read the script.', '我读剧本。'),
  ('ja-anime-intermediate-13', 'ja', 'intermediate', 'anime/drama', '演出', 'えんしゅつ', 'enshutsu', 'direction', '演出', '演出が印象的です。', 'The direction is impressive.', '演出令人印象深刻。'),
  ('ko-drama-intermediate-13', 'ko', 'intermediate', 'anime/drama', '연출', '연출', 'yeonchul', 'direction', '演出', '연출이 인상적이에요.', 'The direction is impressive.', '演出令人印象深刻。'),
  ('ja-jlpt-advanced-1', 'ja', 'advanced', 'JLPT', '恐縮', 'きょうしゅく', 'kyoshuku', 'obliged', '抱歉', 'お手数をおかけして恐縮です。', 'I am sorry to trouble you.', '给您添麻烦，我很不好意思。'),
  ('ja-jlpt-advanced-2', 'ja', 'advanced', 'JLPT', '曖昧', 'あいまい', 'aimai', 'vague', '模糊', '説明が曖昧でした。', 'The explanation was vague.', '说明很模糊。'),
  ('ja-jlpt-advanced-3', 'ja', 'advanced', 'JLPT', '促す', 'うながす', 'unagasu', 'urge', '催促', '先生は学生に発言を促しました。', 'The teacher encouraged the students to speak.', '老师鼓励学生发言。'),
  ('ko-topik-advanced-1', 'ko', 'advanced', 'TOPIK', '유지하다', '유지하다', 'yujihada', 'maintain', '维持', '건강한 습관을 유지해야 합니다.', 'You should maintain healthy habits.', '应该维持健康的习惯。'),
  ('ko-topik-advanced-2', 'ko', 'advanced', 'TOPIK', '모호하다', '모호하다', 'mohohada', 'vague', '模糊', '설명이 모호했어요.', 'The explanation was vague.', '说明很模糊。'),
  ('ko-topik-advanced-3', 'ko', 'advanced', 'TOPIK', '촉구하다', '촉구하다', 'chokguhada', 'urge', '敦促', '전문가들은 대책을 촉구했습니다.', 'Experts called for countermeasures.', '专家们敦促采取对策。'),
  ('ja-jlpt-advanced-4', 'ja', 'advanced', 'JLPT', '著しい', 'いちじるしい', 'ichijirushii', 'remarkable', '显著的', '著しい変化がありました。', 'There was a significant change.', '发生了显著变化。'),
  ('ja-jlpt-advanced-5', 'ja', 'advanced', 'JLPT', '推移', 'すいい', 'suii', 'transition', '变化趋势', '人口の推移を調べます。', 'I examine population trends.', '我调查人口变化趋势。'),
  ('ja-jlpt-advanced-6', 'ja', 'advanced', 'JLPT', '措置', 'そち', 'sochi', 'measure', '措施', '早急な措置が必要です。', 'Urgent measures are necessary.', '需要紧急措施。'),
  ('ja-jlpt-advanced-7', 'ja', 'advanced', 'JLPT', '矛盾', 'むじゅん', 'mujun', 'contradiction', '矛盾', 'その説明には矛盾があります。', 'There is a contradiction in that explanation.', '那个说明有矛盾。'),
  ('ja-jlpt-advanced-8', 'ja', 'advanced', 'JLPT', '考慮', 'こうりょ', 'koryo', 'consideration', '考虑', '安全を考慮します。', 'I take safety into consideration.', '我会考虑安全。'),
  ('ko-topik-advanced-4', 'ko', 'advanced', 'TOPIK', '현저하다', '현저하다', 'hyeonjeohada', 'remarkable', '显著', '현저한 변화가 있었어요.', 'There was a significant change.', '发生了显著变化。'),
  ('ko-topik-advanced-5', 'ko', 'advanced', 'TOPIK', '추이', '추이', 'chui', 'trend', '变化趋势', '인구 추이를 조사합니다.', 'I examine population trends.', '我调查人口变化趋势。'),
  ('ko-topik-advanced-6', 'ko', 'advanced', 'TOPIK', '조치', '조치', 'jochi', 'measure', '措施', '긴급한 조치가 필요합니다.', 'Urgent measures are necessary.', '需要紧急措施。'),
  ('ko-topik-advanced-7', 'ko', 'advanced', 'TOPIK', '모순', '모순', 'mosun', 'contradiction', '矛盾', '그 설명에는 모순이 있어요.', 'There is a contradiction in that explanation.', '那个说明有矛盾。'),
  ('ko-topik-advanced-8', 'ko', 'advanced', 'TOPIK', '고려', '고려', 'goryeo', 'consideration', '考虑', '안전을 고려합니다.', 'I take safety into consideration.', '我会考虑安全。'),
  ('ja-jlpt-advanced-9', 'ja', 'advanced', 'JLPT', '概念', 'がいねん', 'gainen', 'concept', '概念', 'この概念は重要です。', 'This concept is important.', '这个概念很重要。'),
  ('ja-jlpt-advanced-10', 'ja', 'advanced', 'JLPT', '妥当', 'だとう', 'dato', 'appropriate', '妥当', '妥当な判断です。', 'It is an appropriate judgment.', '这是妥当的判断。'),
  ('ja-jlpt-advanced-11', 'ja', 'advanced', 'JLPT', '規模', 'きぼ', 'kibo', 'scale', '规模', '規模が大きいです。', 'The scale is large.', '规模很大。'),
  ('ja-jlpt-advanced-12', 'ja', 'advanced', 'JLPT', '維持', 'いじ', 'iji', 'maintenance', '维持', '品質を維持します。', 'We maintain quality.', '我们维持品质。'),
  ('ja-jlpt-advanced-13', 'ja', 'advanced', 'JLPT', '前提', 'ぜんてい', 'zentei', 'premise', '前提', '前提が違います。', 'The premise is different.', '前提不同。'),
  ('ja-jlpt-advanced-14', 'ja', 'advanced', 'JLPT', '把握', 'はあく', 'haaku', 'grasp', '掌握', '状況を把握します。', 'I grasp the situation.', '我掌握情况。'),
  ('ko-topik-advanced-9', 'ko', 'advanced', 'TOPIK', '개념', '개념', 'gaenyeom', 'concept', '概念', '이 개념은 중요합니다.', 'This concept is important.', '这个概念很重要。'),
  ('ko-topik-advanced-10', 'ko', 'advanced', 'TOPIK', '타당하다', '타당하다', 'tadanghada', 'appropriate', '妥当', '타당한 판단입니다.', 'It is an appropriate judgment.', '这是妥当的判断。'),
  ('ko-topik-advanced-11', 'ko', 'advanced', 'TOPIK', '규모', '규모', 'gyumo', 'scale', '规模', '규모가 큽니다.', 'The scale is large.', '规模很大。'),
  ('ko-topik-advanced-12', 'ko', 'advanced', 'TOPIK', '유지', '유지', 'yuji', 'maintenance', '维持', '품질을 유지합니다.', 'We maintain quality.', '我们维持品质。'),
  ('ko-topik-advanced-13', 'ko', 'advanced', 'TOPIK', '전제', '전제', 'jeonje', 'premise', '前提', '전제가 다릅니다.', 'The premise is different.', '前提不同。'),
  ('ko-topik-advanced-14', 'ko', 'advanced', 'TOPIK', '파악', '파악', 'paak', 'grasp', '掌握', '상황을 파악합니다.', 'I grasp the situation.', '我掌握情况。'),
  ('ja-jlpt-advanced-15', 'ja', 'advanced', 'JLPT', '政策', 'せいさく', 'seisaku', 'policy', '政策', '新しい政策を検討します。', 'We examine a new policy.', '我们研究新政策。'),
  ('ko-topik-advanced-15', 'ko', 'advanced', 'TOPIK', '정책', '정책', 'jeongchaek', 'policy', '政策', '새로운 정책을 검토합니다.', 'We examine a new policy.', '我们研究新政策。'),
  ('ja-jlpt-advanced-16', 'ja', 'advanced', 'JLPT', '傾向', 'けいこう', 'keiko', 'tendency', '倾向', '最近の傾向を分析します。', 'We analyze recent trends.', '我们分析最近的倾向。'),
  ('ko-topik-advanced-16', 'ko', 'advanced', 'TOPIK', '경향', '경향', 'gyeonghyang', 'tendency', '倾向', '최근 경향을 분석합니다.', 'We analyze recent trends.', '我们分析最近的倾向。'),
  ('ja-jlpt-advanced-17', 'ja', 'advanced', 'JLPT', '根拠', 'こんきょ', 'konkyo', 'evidence', '证据', '根拠を示してください。', 'Please show the evidence.', '请出示证据。'),
  ('ko-topik-advanced-17', 'ko', 'advanced', 'TOPIK', '근거', '근거', 'geungeo', 'evidence', '证据', '근거를 제시해 주세요.', 'Please show the evidence.', '请出示证据。'),
  ('ja-jlpt-advanced-18', 'ja', 'advanced', 'JLPT', '観点', 'かんてん', 'kanten', 'perspective', '观点', '別の観点から考えます。', 'I think from another perspective.', '我从另一个观点思考。'),
  ('ko-topik-advanced-18', 'ko', 'advanced', 'TOPIK', '관점', '관점', 'gwanjeom', 'perspective', '观点', '다른 관점에서 생각합니다.', 'I think from another perspective.', '我从另一个观点思考。'),
  ('ja-jlpt-advanced-19', 'ja', 'advanced', 'JLPT', '解釈', 'かいしゃく', 'kaishaku', 'interpretation', '解释', '文章を解釈します。', 'I interpret the sentence.', '我解释句子。'),
  ('ko-topik-advanced-19', 'ko', 'advanced', 'TOPIK', '해석', '해석', 'haeseok', 'interpretation', '解释', '문장을 해석합니다.', 'I interpret the sentence.', '我解释句子。'),
  ('ja-jlpt-advanced-20', 'ja', 'advanced', 'JLPT', '例外', 'れいがい', 'reigai', 'exception', '例外', '例外を認めます。', 'We acknowledge the exception.', '我们承认例外。'),
  ('ko-topik-advanced-20', 'ko', 'advanced', 'TOPIK', '예외', '예외', 'yeoe', 'exception', '例外', '예외를 인정합니다.', 'We acknowledge the exception.', '我们承认例外。'),
  ('ja-jlpt-advanced-21', 'ja', 'advanced', 'JLPT', '義務', 'ぎむ', 'gimu', 'obligation', '义务', '義務を果たします。', 'I fulfill my obligation.', '我履行义务。'),
  ('ko-topik-advanced-21', 'ko', 'advanced', 'TOPIK', '의무', '의무', 'uimu', 'obligation', '义务', '의무를 다합니다.', 'I fulfill my obligation.', '我履行义务。'),
  ('ja-jlpt-advanced-22', 'ja', 'advanced', 'JLPT', '利益', 'りえき', 'rieki', 'benefit', '利益', '長期的な利益を考えます。', 'I consider long-term benefits.', '我考虑长期利益。'),
  ('ko-topik-advanced-22', 'ko', 'advanced', 'TOPIK', '이익', '이익', 'iik', 'benefit', '利益', '장기적인 이익을 생각합니다.', 'I consider long-term benefits.', '我考虑长期利益。'),
  ('ja-jlpt-advanced-23', 'ja', 'advanced', 'JLPT', '問題', 'もんだい', 'mondai', 'issue', '问题', '重要な問題に取り組みます。', 'We tackle an important issue.', '我们处理重要问题。'),
  ('ko-topik-advanced-23', 'ko', 'advanced', 'TOPIK', '문제', '문제', 'munje', 'issue', '问题', '중요한 문제를 다룹니다.', 'We tackle an important issue.', '我们处理重要问题。'),
  ('ja-jlpt-advanced-24', 'ja', 'advanced', 'JLPT', '現象', 'げんしょう', 'gensho', 'phenomenon', '现象', 'この現象を説明します。', 'I explain this phenomenon.', '我说明这个现象。'),
  ('ko-topik-advanced-24', 'ko', 'advanced', 'TOPIK', '현상', '현상', 'hyeonsang', 'phenomenon', '现象', '이 현상을 설명합니다.', 'I explain this phenomenon.', '我说明这个现象。'),
  ('ja-jlpt-advanced-25', 'ja', 'advanced', 'JLPT', '仮説', 'かせつ', 'kasetsu', 'hypothesis', '假设', '仮説を立てます。', 'I form a hypothesis.', '我提出假设。'),
  ('ko-topik-advanced-25', 'ko', 'advanced', 'TOPIK', '가설', '가설', 'gaseol', 'hypothesis', '假设', '가설을 세웁니다.', 'I form a hypothesis.', '我提出假设。'),
  ('ja-jlpt-advanced-26', 'ja', 'advanced', 'JLPT', '原則', 'げんそく', 'gensoku', 'principle', '原则', '原則を守ります。', 'I follow the principle.', '我遵守原则。'),
  ('ko-topik-advanced-26', 'ko', 'advanced', 'TOPIK', '원칙', '원칙', 'wonchik', 'principle', '原则', '원칙을 지킵니다.', 'I follow the principle.', '我遵守原则。'),
  ('ja-jlpt-advanced-27', 'ja', 'advanced', 'JLPT', '実行', 'じっこう', 'jikko', 'execution', '执行', '計画を実行します。', 'I execute the plan.', '我执行计划。'),
  ('ko-topik-advanced-27', 'ko', 'advanced', 'TOPIK', '실행', '실행', 'silhaeng', 'execution', '执行', '계획을 실행합니다.', 'I execute the plan.', '我执行计划。'),
  ('ja-jlpt-advanced-28', 'ja', 'advanced', 'JLPT', '調整', 'ちょうせい', 'chosei', 'adjustment', '调整', '予定を調整します。', 'I adjust the schedule.', '我调整日程。'),
  ('ko-topik-advanced-28', 'ko', 'advanced', 'TOPIK', '조정', '조정', 'jojeong', 'adjustment', '调整', '일정을 조정합니다.', 'I adjust the schedule.', '我调整日程。'),
  ('ja-jlpt-advanced-29', 'ja', 'advanced', 'JLPT', '対立', 'たいりつ', 'tairitsu', 'opposition', '对立', '意見が対立しています。', 'Opinions are in opposition.', '意见对立。'),
  ('ko-topik-advanced-29', 'ko', 'advanced', 'TOPIK', '대립', '대립', 'daerip', 'opposition', '对立', '의견이 대립하고 있습니다.', 'Opinions are in opposition.', '意见对立。'),
  ('ja-jlpt-advanced-30', 'ja', 'advanced', 'JLPT', '優先順位', 'ゆうせんじゅんい', 'yusen jun''i', 'priority', '优先顺序', '優先順位を決めます。', 'I decide the priority.', '我决定优先顺序。'),
  ('ko-topik-advanced-30', 'ko', 'advanced', 'TOPIK', '우선순위', '우선순위', 'useonsunwi', 'priority', '优先顺序', '우선순위를 정합니다.', 'I decide the priority.', '我决定优先顺序。'),
  ('ja-jlpt-advanced-31', 'ja', 'advanced', 'JLPT', '概要', 'がいよう', 'gaiyo', 'overview', '概要', '概要を確認します。', 'I confirm the overview.', '我确认概要。'),
  ('ko-topik-advanced-31', 'ko', 'advanced', 'TOPIK', '개요', '개요', 'gaeyo', 'overview', '概要', '개요을 확인합니다.', 'I confirm the overview.', '我确认概要。'),
  ('ja-jlpt-advanced-32', 'ja', 'advanced', 'JLPT', '分析', 'ぶんせき', 'bunseki', 'analysis', '分析', '分析を確認します。', 'I confirm the analysis.', '我确认分析。'),
  ('ko-topik-advanced-32', 'ko', 'advanced', 'TOPIK', '분석', '분석', 'bunseok', 'analysis', '分析', '분석을 확인합니다.', 'I confirm the analysis.', '我确认分析。'),
  ('ja-jlpt-advanced-33', 'ja', 'advanced', 'JLPT', '評価', 'ひょうか', 'hyoka', 'evaluation', '评价', '評価を確認します。', 'I confirm the evaluation.', '我确认评价。'),
  ('ko-topik-advanced-33', 'ko', 'advanced', 'TOPIK', '평가', '평가', 'pyeongga', 'evaluation', '评价', '평가을 확인합니다.', 'I confirm the evaluation.', '我确认评价。'),
  ('ja-jlpt-advanced-34', 'ja', 'advanced', 'JLPT', '課題', 'かだい', 'kadai', 'challenge', '课题', '課題を確認します。', 'I confirm the challenge.', '我确认课题。'),
  ('ko-topik-advanced-34', 'ko', 'advanced', 'TOPIK', '과제', '과제', 'gwaje', 'challenge', '课题', '과제을 확인합니다.', 'I confirm the challenge.', '我确认课题。'),
  ('ja-jlpt-advanced-35', 'ja', 'advanced', 'JLPT', '要因', 'よういん', 'yoin', 'factor', '因素', '要因を確認します。', 'I confirm the factor.', '我确认因素。'),
  ('ko-topik-advanced-35', 'ko', 'advanced', 'TOPIK', '요인', '요인', 'yoin', 'factor', '因素', '요인을 확인합니다.', 'I confirm the factor.', '我确认因素。'),
  ('ja-jlpt-advanced-36', 'ja', 'advanced', 'JLPT', '影響', 'えいきょう', 'eikyo', 'influence', '影响', '影響を確認します。', 'I confirm the influence.', '我确认影响。'),
  ('ko-topik-advanced-36', 'ko', 'advanced', 'TOPIK', '영향', '영향', 'yeonghyang', 'influence', '影响', '영향을 확인합니다.', 'I confirm the influence.', '我确认影响。'),
  ('ja-jlpt-advanced-37', 'ja', 'advanced', 'JLPT', '傾向', 'けいこう', 'keiko', 'tendency', '倾向', '傾向を確認します。', 'I confirm the tendency.', '我确认倾向。'),
  ('ko-topik-advanced-37', 'ko', 'advanced', 'TOPIK', '경향', '경향', 'gyeonghyang', 'tendency', '倾向', '경향을 확인합니다.', 'I confirm the tendency.', '我确认倾向。'),
  ('ja-jlpt-advanced-38', 'ja', 'advanced', 'JLPT', '改善', 'かいぜん', 'kaizen', 'improvement', '改善', '改善を確認します。', 'I confirm the improvement.', '我确认改善。'),
  ('ko-topik-advanced-38', 'ko', 'advanced', 'TOPIK', '개선', '개선', 'gaeseon', 'improvement', '改善', '개선을 확인합니다.', 'I confirm the improvement.', '我确认改善。'),
  ('ja-jlpt-advanced-39', 'ja', 'advanced', 'JLPT', '検討', 'けんとう', 'kento', 'review', '研究', '検討を確認します。', 'I confirm the review.', '我确认研究。'),
  ('ko-topik-advanced-39', 'ko', 'advanced', 'TOPIK', '검토', '검토', 'geomto', 'review', '研究', '검토을 확인합니다.', 'I confirm the review.', '我确认研究。'),
  ('ja-jlpt-advanced-40', 'ja', 'advanced', 'JLPT', '構造', 'こうぞう', 'kozo', 'structure', '结构', '構造を確認します。', 'I confirm the structure.', '我确认结构。'),
  ('ko-topik-advanced-40', 'ko', 'advanced', 'TOPIK', '구조', '구조', 'gujo', 'structure', '结构', '구조을 확인합니다.', 'I confirm the structure.', '我确认结构。'),
  ('ja-jlpt-advanced-41', 'ja', 'advanced', 'JLPT', '体系', 'たいけい', 'taikei', 'system', '体系', '体系を確認します。', 'I confirm the system.', '我确认体系。'),
  ('ko-topik-advanced-41', 'ko', 'advanced', 'TOPIK', '체계', '체계', 'chegye', 'system', '体系', '체계을 확인합니다.', 'I confirm the system.', '我确认体系。'),
  ('ja-jlpt-advanced-42', 'ja', 'advanced', 'JLPT', '事例', 'じれい', 'jirei', 'example', '事例', '事例を確認します。', 'I confirm the example.', '我确认事例。'),
  ('ko-topik-advanced-42', 'ko', 'advanced', 'TOPIK', '사례', '사례', 'sarye', 'example', '事例', '사례을 확인합니다.', 'I confirm the example.', '我确认事例。'),
  ('ja-jlpt-advanced-43', 'ja', 'advanced', 'JLPT', '仮定', 'かてい', 'katei', 'assumption', '假定', '仮定を確認します。', 'I confirm the assumption.', '我确认假定。'),
  ('ko-topik-advanced-43', 'ko', 'advanced', 'TOPIK', '가정', '가정', 'gajeong', 'assumption', '假定', '가정을 확인합니다.', 'I confirm the assumption.', '我确认假定。'),
  ('ja-jlpt-advanced-44', 'ja', 'advanced', 'JLPT', '根拠', 'こんきょ', 'konkyo', 'evidence', '根据', '根拠を確認します。', 'I confirm the evidence.', '我确认根据。'),
  ('ko-topik-advanced-44', 'ko', 'advanced', 'TOPIK', '근거', '근거', 'geungeo', 'evidence', '根据', '근거을 확인합니다.', 'I confirm the evidence.', '我确认根据。'),
  ('ja-jlpt-advanced-45', 'ja', 'advanced', 'JLPT', '目的', 'もくてき', 'mokuteki', 'purpose', '目的', '目的を確認します。', 'I confirm the purpose.', '我确认目的。'),
  ('ko-topik-advanced-45', 'ko', 'advanced', 'TOPIK', '목적', '목적', 'mokjeok', 'purpose', '目的', '목적을 확인합니다.', 'I confirm the purpose.', '我确认目的。'),
  ('ja-jlpt-advanced-46', 'ja', 'advanced', 'JLPT', '手段', 'しゅだん', 'shudan', 'method', '手段', '手段を確認します。', 'I confirm the method.', '我确认手段。'),
  ('ko-topik-advanced-46', 'ko', 'advanced', 'TOPIK', '수단', '수단', 'sudan', 'method', '手段', '수단을 확인합니다.', 'I confirm the method.', '我确认手段。'),
  ('ja-jlpt-advanced-47', 'ja', 'advanced', 'JLPT', '結果', 'けっか', 'kekka', 'result', '结果', '結果を確認します。', 'I confirm the result.', '我确认结果。'),
  ('ko-topik-advanced-47', 'ko', 'advanced', 'TOPIK', '결과', '결과', 'gyeolgwa', 'result', '结果', '결과을 확인합니다.', 'I confirm the result.', '我确认结果。'),
  ('ja-jlpt-advanced-48', 'ja', 'advanced', 'JLPT', '過程', 'かてい', 'katei', 'process', '过程', '過程を確認します。', 'I confirm the process.', '我确认过程。'),
  ('ko-topik-advanced-48', 'ko', 'advanced', 'TOPIK', '과정', '과정', 'gwajeong', 'process', '过程', '과정을 확인합니다.', 'I confirm the process.', '我确认过程。'),
  ('ja-jlpt-advanced-49', 'ja', 'advanced', 'JLPT', '理論', 'りろん', 'riron', 'theory', '理论', '理論を確認します。', 'I confirm the theory.', '我确认理论。'),
  ('ko-topik-advanced-49', 'ko', 'advanced', 'TOPIK', '이론', '이론', 'iron', 'theory', '理论', '이론을 확인합니다.', 'I confirm the theory.', '我确认理论。'),
  ('ja-jlpt-advanced-50', 'ja', 'advanced', 'JLPT', '実態', 'じったい', 'jittai', 'reality', '实态', '実態を確認します。', 'I confirm the reality.', '我确认实态。'),
  ('ko-topik-advanced-50', 'ko', 'advanced', 'TOPIK', '실태', '실태', 'siltae', 'reality', '实态', '실태을 확인합니다.', 'I confirm the reality.', '我确认实态。'),
  ('ja-jlpt-advanced-51', 'ja', 'advanced', 'JLPT', '認識', 'にんしき', 'ninshiki', 'recognition', '认识', '認識を確認します。', 'I confirm the recognition.', '我确认认识。'),
  ('ko-topik-advanced-51', 'ko', 'advanced', 'TOPIK', '인식', '인식', 'insik', 'recognition', '认识', '인식을 확인합니다.', 'I confirm the recognition.', '我确认认识。'),
  ('ja-jlpt-advanced-52', 'ja', 'advanced', 'JLPT', '判断', 'はんだん', 'handan', 'judgment', '判断', '判断を確認します。', 'I confirm the judgment.', '我确认判断。'),
  ('ko-topik-advanced-52', 'ko', 'advanced', 'TOPIK', '판단', '판단', 'pandan', 'judgment', '判断', '판단을 확인합니다.', 'I confirm the judgment.', '我确认判断。'),
  ('ja-jlpt-advanced-53', 'ja', 'advanced', 'JLPT', '選択', 'せんたく', 'sentaku', 'choice', '选择', '選択を確認します。', 'I confirm the choice.', '我确认选择。'),
  ('ko-topik-advanced-53', 'ko', 'advanced', 'TOPIK', '선택', '선택', 'seontaek', 'choice', '选择', '선택을 확인합니다.', 'I confirm the choice.', '我确认选择。'),
  ('ja-jlpt-advanced-54', 'ja', 'advanced', 'JLPT', '比較', 'ひかく', 'hikaku', 'comparison', '比较', '比較を確認します。', 'I confirm the comparison.', '我确认比较。'),
  ('ko-topik-advanced-54', 'ko', 'advanced', 'TOPIK', '비교', '비교', 'bigyo', 'comparison', '比较', '비교을 확인합니다.', 'I confirm the comparison.', '我确认比较。'),
  ('ja-jlpt-advanced-55', 'ja', 'advanced', 'JLPT', '変化', 'へんか', 'henka', 'change', '变化', '変化を確認します。', 'I confirm the change.', '我确认变化。'),
  ('ko-topik-advanced-55', 'ko', 'advanced', 'TOPIK', '변화', '변화', 'byeonhwa', 'change', '变化', '변화을 확인합니다.', 'I confirm the change.', '我确认变化。'),
  ('ja-jlpt-advanced-56', 'ja', 'advanced', 'JLPT', '拡大', 'かくだい', 'kakudai', 'expansion', '扩大', '拡大を確認します。', 'I confirm the expansion.', '我确认扩大。'),
  ('ko-topik-advanced-56', 'ko', 'advanced', 'TOPIK', '확대', '확대', 'hwakdae', 'expansion', '扩大', '확대을 확인합니다.', 'I confirm the expansion.', '我确认扩大。'),
  ('ja-jlpt-advanced-57', 'ja', 'advanced', 'JLPT', '縮小', 'しゅくしょう', 'shukusho', 'reduction', '缩小', '縮小を確認します。', 'I confirm the reduction.', '我确认缩小。'),
  ('ko-topik-advanced-57', 'ko', 'advanced', 'TOPIK', '축소', '축소', 'chukso', 'reduction', '缩小', '축소을 확인합니다.', 'I confirm the reduction.', '我确认缩小。'),
  ('ja-jlpt-advanced-58', 'ja', 'advanced', 'JLPT', '安定', 'あんてい', 'antei', 'stability', '稳定', '安定を確認します。', 'I confirm the stability.', '我确认稳定。'),
  ('ko-topik-advanced-58', 'ko', 'advanced', 'TOPIK', '안정', '안정', 'anjeong', 'stability', '稳定', '안정을 확인합니다.', 'I confirm the stability.', '我确认稳定。'),
  ('ja-jlpt-advanced-59', 'ja', 'advanced', 'JLPT', '需要', 'じゅよう', 'juyo', 'demand', '需求', '需要を確認します。', 'I confirm the demand.', '我确认需求。'),
  ('ko-topik-advanced-59', 'ko', 'advanced', 'TOPIK', '수요', '수요', 'suyo', 'demand', '需求', '수요을 확인합니다.', 'I confirm the demand.', '我确认需求。'),
  ('ja-jlpt-advanced-60', 'ja', 'advanced', 'JLPT', '供給', 'きょうきゅう', 'kyokyu', 'supply', '供给', '供給を確認します。', 'I confirm the supply.', '我确认供给。'),
  ('ko-topik-advanced-60', 'ko', 'advanced', 'TOPIK', '공급', '공급', 'gonggeup', 'supply', '供给', '공급을 확인합니다.', 'I confirm the supply.', '我确认供给。'),
  ('ja-jlpt-advanced-61', 'ja', 'advanced', 'JLPT', '資源', 'しげん', 'shigen', 'resource', '资源', '資源を確認します。', 'I confirm the resource.', '我确认资源。'),
  ('ko-topik-advanced-61', 'ko', 'advanced', 'TOPIK', '자원', '자원', 'jawon', 'resource', '资源', '자원을 확인합니다.', 'I confirm the resource.', '我确认资源。'),
  ('ja-jlpt-advanced-62', 'ja', 'advanced', 'JLPT', '環境', 'かんきょう', 'kankyo', 'environment', '环境', '環境を確認します。', 'I confirm the environment.', '我确认环境。'),
  ('ko-topik-advanced-62', 'ko', 'advanced', 'TOPIK', '환경', '환경', 'hwangyeong', 'environment', '环境', '환경을 확인합니다.', 'I confirm the environment.', '我确认环境。'),
  ('ja-jlpt-advanced-63', 'ja', 'advanced', 'JLPT', '制度', 'せいど', 'seido', 'institution', '制度', '制度を確認します。', 'I confirm the institution.', '我确认制度。'),
  ('ko-topik-advanced-63', 'ko', 'advanced', 'TOPIK', '제도', '제도', 'jedo', 'institution', '制度', '제도을 확인합니다.', 'I confirm the institution.', '我确认制度。'),
  ('ja-jlpt-advanced-64', 'ja', 'advanced', 'JLPT', '法律', 'ほうりつ', 'horitsu', 'law', '法律', '法律を確認します。', 'I confirm the law.', '我确认法律。'),
  ('ko-topik-advanced-64', 'ko', 'advanced', 'TOPIK', '법률', '법률', 'beomnyul', 'law', '法律', '법률을 확인합니다.', 'I confirm the law.', '我确认法律。'),
  ('ja-jlpt-advanced-65', 'ja', 'advanced', 'JLPT', '権利', 'けんり', 'kenri', 'right', '权利', '権利を確認します。', 'I confirm the right.', '我确认权利。'),
  ('ko-topik-advanced-65', 'ko', 'advanced', 'TOPIK', '권리', '권리', 'gwolli', 'right', '权利', '권리을 확인합니다.', 'I confirm the right.', '我确认权利。'),
  ('ja-jlpt-advanced-66', 'ja', 'advanced', 'JLPT', '責任', 'せきにん', 'sekinin', 'responsibility', '责任', '責任を確認します。', 'I confirm the responsibility.', '我确认责任。'),
  ('ko-topik-advanced-66', 'ko', 'advanced', 'TOPIK', '책임', '책임', 'chaegim', 'responsibility', '责任', '책임을 확인합니다.', 'I confirm the responsibility.', '我确认责任。'),
  ('ja-jlpt-advanced-67', 'ja', 'advanced', 'JLPT', '交流', 'こうりゅう', 'koryu', 'exchange', '交流', '交流を確認します。', 'I confirm the exchange.', '我确认交流。'),
  ('ko-topik-advanced-67', 'ko', 'advanced', 'TOPIK', '교류', '교류', 'gyoryu', 'exchange', '交流', '교류을 확인합니다.', 'I confirm the exchange.', '我确认交流。'),
  ('ja-jlpt-advanced-68', 'ja', 'advanced', 'JLPT', '協力', 'きょうりょく', 'kyoryoku', 'cooperation', '合作', '協力を確認します。', 'I confirm the cooperation.', '我确认合作。'),
  ('ko-topik-advanced-68', 'ko', 'advanced', 'TOPIK', '협력', '협력', 'hyeomnyeok', 'cooperation', '合作', '협력을 확인합니다.', 'I confirm the cooperation.', '我确认合作。'),
  ('ja-jlpt-advanced-69', 'ja', 'advanced', 'JLPT', '競争', 'きょうそう', 'kyoso', 'competition', '竞争', '競争を確認します。', 'I confirm the competition.', '我确认竞争。'),
  ('ko-topik-advanced-69', 'ko', 'advanced', 'TOPIK', '경쟁', '경쟁', 'gyeongjaeng', 'competition', '竞争', '경쟁을 확인합니다.', 'I confirm the competition.', '我确认竞争。'),
  ('ja-jlpt-advanced-70', 'ja', 'advanced', 'JLPT', '解決', 'かいけつ', 'kaiketsu', 'solution', '解决', '解決を確認します。', 'I confirm the solution.', '我确认解决。'),
  ('ko-topik-advanced-70', 'ko', 'advanced', 'TOPIK', '해결', '해결', 'haegyeol', 'solution', '解决', '해결을 확인합니다.', 'I confirm the solution.', '我确认解决。'),
  ('ja-jlpt-advanced-71', 'ja', 'advanced', 'JLPT', '提案', 'ていあん', 'teian', 'proposal', '提案', '提案を確認します。', 'I confirm the proposal.', '我确认提案。'),
  ('ko-topik-advanced-71', 'ko', 'advanced', 'TOPIK', '제안', '제안', 'jean', 'proposal', '提案', '제안을 확인합니다.', 'I confirm the proposal.', '我确认提案。'),
  ('ja-jlpt-advanced-72', 'ja', 'advanced', 'JLPT', '実現', 'じつげん', 'jitsugen', 'realization', '实现', '実現を確認します。', 'I confirm the realization.', '我确认实现。'),
  ('ko-topik-advanced-72', 'ko', 'advanced', 'TOPIK', '실현', '실현', 'silhyeon', 'realization', '实现', '실현을 확인합니다.', 'I confirm the realization.', '我确认实现。'),
  ('ja-jlpt-advanced-73', 'ja', 'advanced', 'JLPT', '適用', 'てきよう', 'tekiyo', 'application', '应用', '適用を確認します。', 'I confirm the application.', '我确认应用。'),
  ('ko-topik-advanced-73', 'ko', 'advanced', 'TOPIK', '적용', '적용', 'jeogyong', 'application', '应用', '적용을 확인합니다.', 'I confirm the application.', '我确认应用。'),
  ('ja-jlpt-advanced-74', 'ja', 'advanced', 'JLPT', '限界', 'げんかい', 'genkai', 'limit', '界限', '限界を確認します。', 'I confirm the limit.', '我确认界限。'),
  ('ko-topik-advanced-74', 'ko', 'advanced', 'TOPIK', '한계', '한계', 'hangye', 'limit', '界限', '한계을 확인합니다.', 'I confirm the limit.', '我确认界限。'),
  ('ja-jlpt-advanced-75', 'ja', 'advanced', 'JLPT', '展望', 'てんぼう', 'tenbo', 'outlook', '展望', '展望を確認します。', 'I confirm the outlook.', '我确认展望。'),
  ('ko-topik-advanced-75', 'ko', 'advanced', 'TOPIK', '전망', '전망', 'jeonmang', 'outlook', '展望', '전망을 확인합니다.', 'I confirm the outlook.', '我确认展望。')
on conflict (id) do update set
  target_language = excluded.target_language,
  level = excluded.level,
  topic = excluded.topic,
  target_text = excluded.target_text,
  reading = excluded.reading,
  romanization = excluded.romanization,
  meaning_en = excluded.meaning_en,
  meaning_zh_cn = excluded.meaning_zh_cn,
  example_text = excluded.example_text,
  example_translation_en = excluded.example_translation_en,
  example_translation_zh_cn = excluded.example_translation_zh_cn;

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
