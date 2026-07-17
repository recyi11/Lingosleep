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
  ('ja-food-basic-1', 'ja', 'basic', 'food', 'ご飯', 'ごはん', 'gohan', 'meal; cooked rice', '吃饭', '吃飯', '朝ご飯を食べます。', 'I eat breakfast.', '我吃早饭。', '我吃早飯。'),
  ('ja-travel-basic-1', 'ja', 'basic', 'travel', '駅', 'えき', 'eki', 'station', '车站', '車站', '駅はどこですか。', 'Where is the station?', '车站在哪里？', '車站在哪裡？'),
  ('ja-life-basic-1', 'ja', 'basic', 'daily life', '寝る', 'ねる', 'neru', 'to sleep', '睡觉', '睡覺', '十一時に寝ます。', 'I go to sleep at eleven.', '我十一点睡觉。', '我十一點睡覺。'),
  ('ja-numbers-basic-1', 'ja', 'basic', 'numbers', '七', 'なな / しち', 'nana / shichi', 'seven', '七', '七', '七つください。', 'Seven, please.', '请给我七个。', '請給我七個。'),
  ('ja-verbs-basic-1', 'ja', 'basic', 'common verbs', '見る', 'みる', 'miru', 'to see; to watch', '看', '看', '映画を見ます。', 'I watch a movie.', '我看电影。', '我看電影。'),
  ('ja-work-intermediate-1', 'ja', 'intermediate', 'work', '会議', 'かいぎ', 'kaigi', 'meeting; conference', '会议', '會議', '午後に会議があります。', 'There is a meeting in the afternoon.', '下午有会议。', '下午有會議。'),
  ('ja-school-intermediate-1', 'ja', 'intermediate', 'school', '課題', 'かだい', 'kadai', 'assignment; task', '课题；作业', '課題；作業', '課題を提出しました。', 'I submitted the assignment.', '我提交了作业。', '我提交了作業。'),
  ('ja-anime-intermediate-1', 'ja', 'intermediate', 'anime/drama', '主人公', 'しゅじんこう', 'shujinko', 'main character', '主角', '主角', '主人公は勇敢です。', 'The main character is brave.', '主角很勇敢。', '主角很勇敢。'),
  ('ja-jlpt-advanced-1', 'ja', 'advanced', 'JLPT', '恐縮', 'きょうしゅく', 'kyoshuku', 'feeling obliged; humbled', '惶恐；不好意思', '惶恐；不好意思', 'お手数をおかけして恐縮です。', 'I am sorry to trouble you.', '给您添麻烦，我很不好意思。', '給您添麻煩，我很不好意思。'),
  ('ja-food-basic-2', 'ja', 'basic', 'food', '水', 'みず', 'mizu', 'water', '水', '水', '水をください。', 'Water, please.', '请给我水。', '請給我水。'),
  ('ja-travel-basic-2', 'ja', 'basic', 'travel', '切符', 'きっぷ', 'kippu', 'ticket', '票', '票', '切符を買います。', 'I buy a ticket.', '我买票。', '我買票。'),
  ('ja-life-basic-2', 'ja', 'basic', 'daily life', '起きる', 'おきる', 'okiru', 'to wake up; to get up', '起床', '起床', '六時に起きます。', 'I get up at six.', '我六点起床。', '我六點起床。'),
  ('ja-numbers-basic-2', 'ja', 'basic', 'numbers', '百', 'ひゃく', 'hyaku', 'hundred', '百', '百', '百円です。', 'It is one hundred yen.', '是一百日元。', '是一百日圓。'),
  ('ja-verbs-basic-2', 'ja', 'basic', 'common verbs', '行く', 'いく', 'iku', 'to go', '去', '去', '学校へ行きます。', 'I go to school.', '我去学校。', '我去學校。'),
  ('ja-work-intermediate-2', 'ja', 'intermediate', 'work', '締め切り', 'しめきり', 'shimekiri', 'deadline', '截止日期', '截止日期', '締め切りは金曜日です。', 'The deadline is Friday.', '截止日期是星期五。', '截止日期是星期五。'),
  ('ja-school-intermediate-2', 'ja', 'intermediate', 'school', '復習', 'ふくしゅう', 'fukushu', 'review; revision', '复习', '複習', '寝る前に復習します。', 'I review before sleeping.', '我睡前复习。', '我睡前複習。'),
  ('ja-anime-intermediate-2', 'ja', 'intermediate', 'anime/drama', '場面', 'ばめん', 'bamen', 'scene; situation', '场面', '場面', 'この場面が好きです。', 'I like this scene.', '我喜欢这个场面。', '我喜歡這個場面。'),
  ('ja-jlpt-advanced-2', 'ja', 'advanced', 'JLPT', '曖昧', 'あいまい', 'aimai', 'vague; ambiguous', '暧昧；模糊', '曖昧；模糊', '説明が曖昧でした。', 'The explanation was vague.', '说明很模糊。', '說明很模糊。'),
  ('ja-jlpt-advanced-3', 'ja', 'advanced', 'JLPT', '促す', 'うながす', 'unagasu', 'to urge; to prompt', '促使；催促', '促使；催促', '先生は学生に発言を促しました。', 'The teacher encouraged the students to speak.', '老师鼓励学生发言。', '老師鼓勵學生發言。'),
  ('ko-food-basic-1', 'ko', 'basic', 'food', '밥', '밥', 'bap', 'rice; meal', '吃饭', '吃飯', '밥을 먹어요.', 'I eat a meal.', '我吃饭。', '我吃飯。'),
  ('ko-travel-basic-1', 'ko', 'basic', 'travel', '역', '역', 'yeok', 'station', '车站', '車站', '역이 어디예요?', 'Where is the station?', '车站在哪里？', '車站在哪裡？'),
  ('ko-life-basic-1', 'ko', 'basic', 'daily life', '자다', '자다', 'jada', 'to sleep', '睡觉', '睡覺', '열한 시에 자요.', 'I sleep at eleven.', '我十一点睡觉。', '我十一點睡覺。'),
  ('ko-numbers-basic-1', 'ko', 'basic', 'numbers', '일곱', '일곱', 'ilgop', 'seven', '七', '七', '일곱 개 주세요.', 'Seven, please.', '请给我七个。', '請給我七個。'),
  ('ko-verbs-basic-1', 'ko', 'basic', 'common verbs', '보다', '보다', 'boda', 'to see; to watch', '看', '看', '드라마를 봐요.', 'I watch a drama.', '我看电视剧。', '我看電視劇。'),
  ('ko-work-intermediate-1', 'ko', 'intermediate', 'work', '회의', '회의', 'hoeui', 'meeting', '会议', '會議', '오후에 회의가 있어요.', 'There is a meeting in the afternoon.', '下午有会议。', '下午有會議。'),
  ('ko-school-intermediate-1', 'ko', 'intermediate', 'school', '과제', '과제', 'gwaje', 'assignment', '作业；课题', '作業；課題', '과제를 냈어요.', 'I turned in the assignment.', '我交了作业。', '我交了作業。'),
  ('ko-drama-intermediate-1', 'ko', 'intermediate', 'anime/drama', '주인공', '주인공', 'juingong', 'main character', '主角', '主角', '주인공이 용감해요.', 'The main character is brave.', '主角很勇敢。', '主角很勇敢。'),
  ('ko-topik-advanced-1', 'ko', 'advanced', 'TOPIK', '유지하다', '유지하다', 'yujihada', 'to maintain', '维持', '維持', '건강한 습관을 유지해야 합니다.', 'You should maintain healthy habits.', '应该维持健康的习惯。', '應該維持健康的習慣。'),
  ('ko-food-basic-2', 'ko', 'basic', 'food', '물', '물', 'mul', 'water', '水', '水', '물 주세요.', 'Water, please.', '请给我水。', '請給我水。'),
  ('ko-travel-basic-2', 'ko', 'basic', 'travel', '표', '표', 'pyo', 'ticket', '票', '票', '표를 사요.', 'I buy a ticket.', '我买票。', '我買票。'),
  ('ko-life-basic-2', 'ko', 'basic', 'daily life', '일어나다', '일어나다', 'ireonada', 'to wake up; to get up', '起床', '起床', '여섯 시에 일어나요.', 'I get up at six.', '我六点起床。', '我六點起床。'),
  ('ko-numbers-basic-2', 'ko', 'basic', 'numbers', '백', '백', 'baek', 'hundred', '百', '百', '백 원이에요.', 'It is one hundred won.', '是一百韩元。', '是一百韓元。'),
  ('ko-verbs-basic-2', 'ko', 'basic', 'common verbs', '가다', '가다', 'gada', 'to go', '去', '去', '학교에 가요.', 'I go to school.', '我去学校。', '我去學校。'),
  ('ko-work-intermediate-2', 'ko', 'intermediate', 'work', '마감', '마감', 'magam', 'deadline; closing', '截止', '截止', '마감은 금요일이에요.', 'The deadline is Friday.', '截止日期是星期五。', '截止日期是星期五。'),
  ('ko-school-intermediate-2', 'ko', 'intermediate', 'school', '복습', '복습', 'bokseup', 'review; revision', '复习', '複習', '자기 전에 복습해요.', 'I review before sleeping.', '我睡前复习。', '我睡前複習。'),
  ('ko-drama-intermediate-2', 'ko', 'intermediate', 'anime/drama', '장면', '장면', 'jangmyeon', 'scene', '场面', '場面', '이 장면이 좋아요.', 'I like this scene.', '我喜欢这个场面。', '我喜歡這個場面。'),
  ('ko-topik-advanced-2', 'ko', 'advanced', 'TOPIK', '모호하다', '모호하다', 'mohohada', 'to be vague; ambiguous', '模糊；暧昧', '模糊；曖昧', '설명이 모호했어요.', 'The explanation was vague.', '说明很模糊。', '說明很模糊。'),
  ('ko-topik-advanced-3', 'ko', 'advanced', 'TOPIK', '촉구하다', '촉구하다', 'chokguhada', 'to urge; to call for', '敦促；促请', '敦促；促請', '전문가들은 대책을 촉구했습니다.', 'Experts called for countermeasures.', '专家们敦促采取对策。', '專家們敦促採取對策。'),
  ('ja-food-basic-3', 'ja', 'basic', 'food', 'お茶', 'おちゃ', 'ocha', 'tea', '茶', '茶', '温かいお茶を飲みます。', 'I drink warm tea.', '我喝热茶。', '我喝熱茶。'),
  ('ja-life-basic-3', 'ja', 'basic', 'daily life', '友達', 'ともだち', 'tomodachi', 'friend', '朋友', '朋友', '友達に会います。', 'I meet a friend.', '我见朋友。', '我見朋友。'),
  ('ja-travel-basic-3', 'ja', 'basic', 'travel', '病院', 'びょういん', 'byoin', 'hospital', '医院', '醫院', '病院は近いです。', 'The hospital is nearby.', '医院很近。', '醫院很近。'),
  ('ja-verbs-basic-3', 'ja', 'basic', 'common verbs', '買う', 'かう', 'kau', 'to buy', '买', '買', 'パンを買います。', 'I buy bread.', '我买面包。', '我買麵包。'),
  ('ja-work-intermediate-3', 'ja', 'intermediate', 'work', '連絡', 'れんらく', 'renraku', 'contact; communication', '联系', '聯絡', '後で連絡します。', 'I will contact you later.', '我稍后联系你。', '我稍後聯絡你。'),
  ('ja-school-intermediate-3', 'ja', 'intermediate', 'school', '試験', 'しけん', 'shiken', 'exam', '考试', '考試', '明日は試験です。', 'Tomorrow is the exam.', '明天是考试。', '明天是考試。'),
  ('ja-anime-intermediate-3', 'ja', 'intermediate', 'anime/drama', '展開', 'てんかい', 'tenkai', 'development; turn of events', '展开；剧情发展', '展開；劇情發展', '次の展開が気になります。', 'I wonder what happens next.', '我很好奇接下来的发展。', '我很好奇接下來的發展。'),
  ('ja-travel-intermediate-1', 'ja', 'intermediate', 'travel', '予約', 'よやく', 'yoyaku', 'reservation; booking', '预约', '預約', 'ホテルを予約しました。', 'I booked a hotel.', '我预约了酒店。', '我預約了飯店。'),
  ('ja-jlpt-advanced-4', 'ja', 'advanced', 'JLPT', '著しい', 'いちじるしい', 'ichijirushii', 'remarkable; significant', '显著的', '顯著的', '著しい変化がありました。', 'There was a significant change.', '发生了显著变化。', '發生了顯著變化。'),
  ('ja-jlpt-advanced-5', 'ja', 'advanced', 'JLPT', '推移', 'すいい', 'suii', 'transition; trend', '变化趋势', '變化趨勢', '人口の推移を調べます。', 'I examine population trends.', '我调查人口变化趋势。', '我調查人口變化趨勢。'),
  ('ja-jlpt-advanced-6', 'ja', 'advanced', 'JLPT', '措置', 'そち', 'sochi', 'measure; step', '措施', '措施', '早急な措置が必要です。', 'Urgent measures are necessary.', '需要紧急措施。', '需要緊急措施。'),
  ('ja-jlpt-advanced-7', 'ja', 'advanced', 'JLPT', '矛盾', 'むじゅん', 'mujun', 'contradiction', '矛盾', '矛盾', 'その説明には矛盾があります。', 'There is a contradiction in that explanation.', '那个说明有矛盾。', '那個說明有矛盾。'),
  ('ja-jlpt-advanced-8', 'ja', 'advanced', 'JLPT', '考慮', 'こうりょ', 'koryo', 'consideration', '考虑', '考慮', '安全を考慮します。', 'I take safety into consideration.', '我会考虑安全。', '我會考慮安全。'),
  ('ko-food-basic-3', 'ko', 'basic', 'food', '차', '차', 'cha', 'tea', '茶', '茶', '따뜻한 차를 마셔요.', 'I drink warm tea.', '我喝热茶。', '我喝熱茶。'),
  ('ko-life-basic-3', 'ko', 'basic', 'daily life', '친구', '친구', 'chingu', 'friend', '朋友', '朋友', '친구를 만나요.', 'I meet a friend.', '我见朋友。', '我見朋友。'),
  ('ko-travel-basic-3', 'ko', 'basic', 'travel', '병원', '병원', 'byeongwon', 'hospital', '医院', '醫院', '병원이 가까워요.', 'The hospital is nearby.', '医院很近。', '醫院很近。'),
  ('ko-verbs-basic-3', 'ko', 'basic', 'common verbs', '사다', '사다', 'sada', 'to buy', '买', '買', '빵을 사요.', 'I buy bread.', '我买面包。', '我買麵包。'),
  ('ko-work-intermediate-3', 'ko', 'intermediate', 'work', '연락', '연락', 'yeollak', 'contact; communication', '联系', '聯絡', '나중에 연락할게요.', 'I will contact you later.', '我稍后联系你。', '我稍後聯絡你。'),
  ('ko-school-intermediate-3', 'ko', 'intermediate', 'school', '시험', '시험', 'siheom', 'exam', '考试', '考試', '내일은 시험이에요.', 'Tomorrow is the exam.', '明天是考试。', '明天是考試。'),
  ('ko-drama-intermediate-3', 'ko', 'intermediate', 'anime/drama', '전개', '전개', 'jeongae', 'development; turn of events', '展开；剧情发展', '展開；劇情發展', '다음 전개가 궁금해요.', 'I wonder what happens next.', '我很好奇接下来的发展。', '我很好奇接下來的發展。'),
  ('ko-travel-intermediate-1', 'ko', 'intermediate', 'travel', '예약', '예약', 'yeyak', 'reservation; booking', '预约', '預約', '호텔을 예약했어요.', 'I booked a hotel.', '我预约了酒店。', '我預約了飯店。'),
  ('ko-topik-advanced-4', 'ko', 'advanced', 'TOPIK', '현저하다', '현저하다', 'hyeonjeohada', 'to be remarkable; significant', '显著', '顯著', '현저한 변화가 있었어요.', 'There was a significant change.', '发生了显著变化。', '發生了顯著變化。'),
  ('ko-topik-advanced-5', 'ko', 'advanced', 'TOPIK', '추이', '추이', 'chui', 'trend; transition', '变化趋势', '變化趨勢', '인구 추이를 조사합니다.', 'I examine population trends.', '我调查人口变化趋势。', '我調查人口變化趨勢。'),
  ('ko-topik-advanced-6', 'ko', 'advanced', 'TOPIK', '조치', '조치', 'jochi', 'measure; step', '措施', '措施', '긴급한 조치가 필요합니다.', 'Urgent measures are necessary.', '需要紧急措施。', '需要緊急措施。'),
  ('ko-topik-advanced-7', 'ko', 'advanced', 'TOPIK', '모순', '모순', 'mosun', 'contradiction', '矛盾', '矛盾', '그 설명에는 모순이 있어요.', 'There is a contradiction in that explanation.', '那个说明有矛盾。', '那個說明有矛盾。'),
  ('ko-topik-advanced-8', 'ko', 'advanced', 'TOPIK', '고려', '고려', 'goryeo', 'consideration', '考虑', '考慮', '안전을 고려합니다.', 'I take safety into consideration.', '我会考虑安全。', '我會考慮安全。')
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
