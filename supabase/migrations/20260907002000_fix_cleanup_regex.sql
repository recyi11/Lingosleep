-- Migration: Fix Cleanup Regex and Expand Vocabulary
-- Purpose: Correct the mixed-language regex in the previous cleanup script and ensure thorough removal of mechanical phrases.

-- 1. Corrected Cleanup for Japanese Mechanical Phrases
DELETE FROM public.vocabulary
WHERE target_language = 'ja'
  AND level IN ('basic', 'intermediate', 'advanced')
  AND target_text ~ '^(新しい|古い|近い|遠い|次の|大きい|小さい|静かな|便利な|有名な|安全な|安い|高い|早い|遅い|予約した|朝の|夜の|毎日の|簡単な|大切な|忙しい|楽しい|近くの|家の|週末の|一つの|二つの|三つの|四つの|五つの|六つの|七つの|八つの|九つの|十の|少ない|多い|半分の|全部の|最後の|温かい|冷たい|甘い|辛い|好きな|嫌いな|苦手な|欲しい|必要な|人気の|特別な)(時間|散歩|予定|部屋|服|電話|天気|名前|鍵|お茶|牛乳|パン|鱼|魚|肉|野菜|果物|スープ|弁当|デザート|駅|空港|ホテル|バス|電車|道|地図|出口|入口|タクシー|個|人|円|時|分|日|回|枚|本|冊|仕事|休み)';

-- 2. Corrected Cleanup for Korean Mechanical Phrases
DELETE FROM public.vocabulary
WHERE target_language = 'ko'
  AND level IN ('basic', 'intermediate', 'advanced')
  AND target_text ~ '^(새|가까운|먼|다음|오래된|큰|작은|조용한|편리한|유명한|안전한|싼|비싼|이른|늦은|예약한|아침|밤|매일|간단한|중요한|바쁜|즐거운|근처|집|주말|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|적은|많은|반|모든|마지막|따뜻한|차가운|단|매운|좋아하는|인기 있는|특별한)\s(시간|산책|계획|방|옷|전화|날씨|이름|열쇠|차|우유|빵|생선|고기|채소|과일|국|도시락|디저트|역|공항|호텔|버스|전철|길|지도|출구|입구|택시|개|명|원|시|분|일|번|장|병|권|일|휴식)';

-- 3. Additional Cleanup: Catch entries with the generic "I review ..." example translation
DELETE FROM public.vocabulary
WHERE example_translation_en LIKE 'I review "%".'
   OR example_text LIKE '%を復習します。'
   OR example_text LIKE '% 표현을 복습해요.';

-- 4. Re-verify and ensure High-Quality Basic entries
-- We already have IDs 1-25 in the TS file, let's make sure they are correct in the DB too.
-- [ja-food-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-food-basic-1', 'ja', 'basic', 'food', 'ご飯', 'ごはん', 'gohan', 'rice, meal', '饭', '朝ご飯を食べます。', 'I eat breakfast.', '我吃早饭。'),
  ('ja-food-basic-2', 'ja', 'basic', 'food', '水', 'みず', 'mizu', 'water', '水', '水をください。', 'Water, please.', '请给我水。'),
  ('ja-food-basic-3', 'ja', 'basic', 'food', 'お茶', 'おちゃ', 'ocha', 'tea', '茶', '温かいお茶を飲みます。', 'I drink warm tea.', '我喝热茶。'),
  ('ja-food-basic-4', 'ja', 'basic', 'food', 'パン', 'ぱん', 'pan', 'bread', '面包', 'パンを食べます。', 'I eat bread.', '我吃面包。'),
  ('ja-food-basic-5', 'ja', 'basic', 'food', '牛乳', 'ぎゅうにゅう', 'gyunyu', 'milk', '牛奶', '牛乳を飲みます。', 'I drink milk.', '我喝牛奶。'),
  ('ja-food-basic-6', 'ja', 'basic', 'food', '野菜', 'やさい', 'yasai', 'vegetables', '蔬菜', '野菜が好きです。', 'I like vegetables.', '我喜欢蔬菜。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn, example_text = excluded.example_text;

-- (Continuing with more basic expansion to ensure 150 items per category are reached WITH NORMAL WORDS)
-- For now, let's just make sure the obvious ones are fixed.
