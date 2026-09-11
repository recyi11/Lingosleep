-- Migration: Deep Cleanup of mechanical phrases and expansion of Basic vocabulary
-- Purpose: Remove residual "Modifier + Noun" phrases and add 10 more high-quality basic terms per category.

-- 1. Aggressive Cleanup of Basic/Intermediate mechanical phrases
DELETE FROM public.vocabulary
WHERE (level = 'basic' OR level = 'intermediate')
  AND (
    -- Japanese Patterns: Modifier + Noun combinations from the backfill script
    (target_language = 'ja' AND target_text ~ '^(新しい|古い|近い|遠い|次の|大きい|小さい|静かな|便利な|有名な|安全な|安い|高い|早い|遅い|予約した|朝の|夜の|毎日の|簡単な|大切な|忙しい|楽しい|近くの|家の|週末の|一つの|二つの|三つの|四つの|五つの|六つの|七つの|八つの|九つの|十の|少ない|多い|半分の|全部の|最後の|温かい|冷たい|甘い|辛い|好きな|人気の|特別な)(時間|散歩|予定|部屋|服|電話|天気|名前|鍵|お茶|牛乳|パン|魚|肉|果物|スープ|弁当|デザート|駅|空港|ホテル|バス|電車|道|地図|出口|入口|タクシー|個|人|円|時|分|日|回|枚|本|冊|仕事|休み)')
    OR
    -- Korean Patterns: Modifier + space + Noun combinations
    (target_language = 'ko' AND target_text ~ '^(새|가까운|먼|다음|오래된|큰|작은|조용한|편리한|유명한|안전한|싼|이른|늦은|예약한|아침|밤|매일|간단한|중요한|바쁜|즐거운|근처|집|주말|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|적은|많은|반|모든|마지막|따뜻한|차가운|단|매운|좋아하는|인기 있는|특별한)\s(시간|산책|계획|방|옷|전화|날씨|이름|열쇠|차|우유|빵|생선|고기|과일|국|도시락|디저트|역|공항|호텔|버스|전철|길|지도|출구|입구|택시|개|명|원|시|분|일|번|장|병|권|일|휴식)')
  );

-- 2. Add 10 more High-Quality Basic entries per category (IDs 26-35 or filling gaps)
-- [ja-food-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-food-basic-26', 'ja', 'basic', 'food', 'おにぎり', 'おにぎり', 'onigiri', 'rice ball', '饭团', 'おにぎりを作りました。', 'I made rice balls.', '我做了饭团。'),
  ('ja-food-basic-27', 'ja', 'basic', 'food', '味噌汁', 'みそしる', 'misoshiru', 'miso soup', '味噌汤', '味噌汁を飲みます。', 'I drink miso soup.', '我喝味噌汤。'),
  ('ja-food-basic-28', 'ja', 'basic', 'food', 'ラーメン', 'らーめん', 'raamen', 'ramen', '拉面', 'ラーメンを食べたいです。', 'I want to eat ramen.', '我想吃拉面。'),
  ('ja-food-basic-29', 'ja', 'basic', 'food', 'カレー', 'かれー', 'karee', 'curry', '咖喱', 'カレーが辛いです。', 'The curry is spicy.', '咖喱很辣。'),
  ('ja-food-basic-30', 'ja', 'basic', 'food', '寿司', 'すし', 'sushi', 'sushi', '寿司', '寿司は美味しいです。', 'Sushi is delicious.', '寿司很好吃。'),
  ('ja-food-basic-31', 'ja', 'basic', 'food', '醤油', 'しょうゆ', 'shouyu', 'soy sauce', '酱油', '醤油をかけます。', 'I pour soy sauce.', '淋上酱油。'),
  ('ja-food-basic-32', 'ja', 'basic', 'food', '砂糖', 'さとう', 'satou', 'sugar', '糖', '砂糖を入れます。', 'I add sugar.', '放糖。'),
  ('ja-food-basic-33', 'ja', 'basic', 'food', '塩', 'しお', 'shio', 'salt', '盐', '塩が足りません。', 'It needs more salt.', '盐不够。'),
  ('ja-food-basic-34', 'ja', 'basic', 'food', '油', 'あぶら', 'abura', 'oil', '油', '油で揚げます。', 'I fry it in oil.', '用油炸。'),
  ('ja-food-basic-35', 'ja', 'basic', 'food', '胡椒', 'こしょう', 'koshou', 'pepper', '胡椒', '胡椒を振ります。', 'I sprinkle pepper.', '撒上胡椒。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ko-food-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-food-basic-26', 'ko', 'basic', 'food', '김밥', '김밥', 'gimbap', 'Kimbap', '紫菜包饭', '김밥을 만들어요.', 'I make kimbap.', '做紫菜包饭。'),
  ('ko-food-basic-27', 'ko', 'basic', 'food', '비빔밥', '비빔밥', 'bibimbap', 'Bibimbap', '石锅拌饭', '비빔밥이 맛있어요.', 'Bibimbap is delicious.', '石锅拌饭很好吃。'),
  ('ko-food-basic-28', 'ko', 'basic', 'food', '불고기', '불고기', 'bulgogi', 'Bulgogi', '烤肉', '불고기를 먹어요.', 'I eat bulgogi.', '吃烤肉。'),
  ('ko-food-basic-29', 'ko', 'basic', 'food', '김치', '김치', 'gimchi', 'Kimchi', '泡菜', '김치가 매워요.', 'Kimchi is spicy.', '泡菜很辣。'),
  ('ko-food-basic-30', 'ko', 'basic', 'food', '된장찌개', '된장찌개', 'doenjang-jjigae', 'Soybean stew', '大酱汤', '된장찌개를 끓여요.', 'I cook soybean stew.', '煮大酱汤。'),
  ('ko-food-basic-31', 'ko', 'basic', 'food', '간장', '간장', 'ganjang', 'soy sauce', '酱油', '간장을 넣어요.', 'I add soy sauce.', '放酱油。'),
  ('ko-food-basic-32', 'ko', 'basic', 'food', '설탕', '설탕', 'seoltang', 'sugar', '糖', '설탕이 달아요.', 'Sugar is sweet.', '糖很甜。'),
  ('ko-food-basic-33', 'ko', 'basic', 'food', '소금', '소금', 'sogeum', 'salt', '盐', '소금을 뿌려요.', 'I sprinkle salt.', '撒盐。'),
  ('ko-food-basic-34', 'ko', 'basic', 'food', '식용유', '식용유', 'sigyong-yu', 'cooking oil', '食用油', '식용유를 써요.', 'I use cooking oil.', '用食用油。'),
  ('ko-food-basic-35', 'ko', 'basic', 'food', '고추장', '고추장', 'gochujang', 'chili paste', '辣椒酱', '고추장이 매워요.', 'Chili paste is spicy.', '辣椒酱很辣。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ja-travel-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-travel-basic-26', 'ja', 'basic', 'travel', '飛行機', 'ひこうき', 'hikouki', 'airplane', '飞机', '飛行機に乗ります。', 'I board the airplane.', '乘飞机。'),
  ('ja-travel-basic-27', 'ja', 'basic', 'travel', '船', 'ふね', 'fune', 'ship, boat', '船', '船で海を渡ります。', 'I cross the sea by boat.', '坐船过海。'),
  ('ja-travel-basic-28', 'ja', 'basic', 'travel', '自転車', 'じてんしゃ', 'jitensha', 'bicycle', '自行车', '自転車で行きます。', 'I go by bicycle.', '骑自行车去。'),
  ('ja-travel-basic-29', 'ja', 'basic', 'travel', '地図アプリ', 'ちずあぷり', 'chizu-apuri', 'map app', '地图软件', '地図アプリを使います。', 'I use a map app.', '用地图软件。'),
  ('ja-travel-basic-30', 'ja', 'basic', 'travel', '観光地', 'かんこうち', 'kankouchi', 'tourist spot', '景点', '観光地へ行きます。', 'I go to a tourist spot.', '去景点。'),
  ('ja-travel-basic-31', 'ja', 'basic', 'travel', 'お土産', 'おみやげ', 'omiyage', 'souvenir', '特产，纪念品', 'お土産を買いました。', 'I bought souvenirs.', '买了特产。'),
  ('ja-travel-basic-32', 'ja', 'basic', 'travel', 'パスポート', 'ぱすぽーと', 'pasupooto', 'passport', '护照', 'パスポートを見せます。', 'I show my passport.', '出示护照。'),
  ('ja-travel-basic-33', 'ja', 'basic', 'travel', '切符売り場', 'きっぷうりば', 'kippu-uriba', 'ticket office', '售票处', '切符売り場はどこですか。', 'Where is the ticket office?', '售票处在哪里？'),
  ('ja-travel-basic-34', 'ja', 'basic', 'travel', '忘れ物', 'わすれもの', 'wasuremono', 'lost item', '失物', '忘れ物をしました。', 'I lost something.', '我丢了东西。'),
  ('ja-travel-basic-35', 'ja', 'basic', 'travel', '予約確認', 'よやくかくにん', 'yoyaku-kakunin', 'booking confirmation', '确认预约', '予約確認をします。', 'I check my booking.', '确认预约。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ko-travel-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-travel-basic-26', 'ko', 'basic', 'travel', '비행기', '비행기', 'bihaenggi', 'airplane', '飞机', '비행기를 타요.', 'I board the airplane.', '坐飞机。'),
  ('ko-travel-basic-27', 'ko', 'basic', 'travel', '배', '배', 'bae', 'ship, boat', '船', '배를 타고 가요.', 'I go by boat.', '坐船去。'),
  ('ko-travel-basic-28', 'ko', 'basic', 'travel', '자전거', '자전거', 'jajeon-geo', 'bicycle', '自行车', '자전거를 타요.', 'I ride a bicycle.', '骑自行车。'),
  ('ko-travel-basic-29', 'ko', 'basic', 'travel', '지도 앱', '지도 앱', 'jido aep', 'map app', '地图软件', '지도 앱을 봐요.', 'I look at the map app.', '看地图软件。'),
  ('ko-travel-basic-30', 'ko', 'basic', 'travel', '관광지', '관광지', 'gwangwangji', 'tourist spot', '景点', '관광지에 가요.', 'I go to a tourist spot.', '去景点。'),
  ('ko-travel-basic-31', 'ko', 'basic', 'travel', '기념품', '기념품', 'ginyeompum', 'souvenir', '纪念品', '기념품을 샀어요.', 'I bought souvenirs.', '买了纪念品。'),
  ('ko-travel-basic-32', 'ko', 'basic', 'travel', '여권', '여권', 'yeogwon', 'passport', '护照', '여권을 보여 주세요.', 'Please show your passport.', '请出示护照。'),
  ('ko-travel-basic-33', 'ko', 'basic', 'travel', '매표소', '매표소', 'maepyoso', 'ticket office', '售票处', '매표소가 어디예요?', 'Where is the ticket office?', '售票处在哪里？'),
  ('ko-travel-basic-34', 'ko', 'basic', 'travel', '분실물', '분실물', 'bunsilmul', 'lost item', '丢失物品', '분실물을 찾아요.', 'I am looking for a lost item.', '寻找丢失物品。'),
  ('ko-travel-basic-35', 'ko', 'basic', 'travel', '예약 확인', '예약 확인', 'yeyak hwagin', 'booking confirmation', '确认预约', '예약을 확인해요.', 'I check the booking.', '确认预约。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ja-life-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-life-basic-26', 'ja', 'basic', 'daily life', '冷蔵庫', 'れいぞうこ', 'reizouko', 'refrigerator', '冰箱', '冷蔵庫を開けます。', 'I open the fridge.', '打开冰箱。'),
  ('ja-life-basic-27', 'ja', 'basic', 'daily life', '洗濯機', 'せんたくき', 'sentakuki', 'washing machine', '洗衣机', '洗濯機を使います。', 'I use the washing machine.', '用洗衣机。'),
  ('ja-life-basic-28', 'ja', 'basic', 'daily life', '電子レンジ', 'でんしれんじ', 'denshirenji', 'microwave', '微波炉', 'レンジで温めます。', 'I warm it in the microwave.', '用微波炉加热。'),
  ('ja-life-basic-29', 'ja', 'basic', 'daily life', '掃除機', 'そうじき', 'soujiki', 'vacuum cleaner', '吸尘器', '掃除機をかけます。', 'I vacuum the floor.', '用吸尘器打扫。'),
  ('ja-life-basic-30', 'ja', 'basic', 'daily life', 'ゴミ箱', 'ごみばこ', 'gomibako', 'trash can', '垃圾桶', 'ゴミ箱に捨てます。', 'I throw it in the trash can.', '丢进垃圾桶。'),
  ('ja-life-basic-31', 'ja', 'basic', 'daily life', '石鹸', 'せっけん', 'sekken', 'soap', '肥皂', '石鹸で洗います。', 'I wash with soap.', '用肥皂洗。'),
  ('ja-life-basic-32', 'ja', 'basic', 'daily life', 'タオル', 'たおる', 'taoru', 'towel', '毛巾', 'タオルで拭きます。', 'I wipe with a towel.', '用毛巾擦。'),
  ('ja-life-basic-33', 'ja', 'basic', 'daily life', '歯ブラシ', 'はぶらし', 'haburashi', 'toothbrush', '牙刷', '歯ブラシを替えます。', 'I change my toothbrush.', '换牙刷。'),
  ('ja-life-basic-34', 'ja', 'basic', 'daily life', '薬', 'くすり', 'kusuri', 'medicine', '药', '薬を飲みます。', 'I take medicine.', '吃药。'),
  ('ja-life-basic-35', 'ja', 'basic', 'daily life', '新聞', 'しんぶん', 'shinbun', 'newspaper', '报纸', '新聞を読みます。', 'I read the newspaper.', '读报纸。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ko-life-basic]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-life-basic-26', 'ko', 'basic', 'daily life', '냉장고', '냉장고', 'naengjanggo', 'refrigerator', '冰箱', '냉장고를 열어요.', 'I open the fridge.', '打开冰箱。'),
  ('ko-life-basic-27', 'ko', 'basic', 'daily life', '세탁기', '세탁기', 'setakgi', 'washing machine', '洗衣机', '세탁기를 돌려요.', 'I run the washing machine.', '用洗衣机。'),
  ('ko-life-basic-28', 'ko', 'basic', 'daily life', '전자레인지', '전자레인지', 'jeonjareinji', 'microwave', '微波炉', '레인지에 데워요.', 'I warm it in the microwave.', '用微波炉加热。'),
  ('ko-life-basic-29', 'ko', 'basic', 'daily life', '청소기', '청소기', 'cheongsogi', 'vacuum cleaner', '吸尘器', '청소기를 돌려요.', 'I vacuum the floor.', '用吸尘器打扫。'),
  ('ko-life-basic-30', 'ko', 'basic', 'daily life', '쓰레기통', '쓰레기통', 'sseuregitong', 'trash can', '垃圾桶', '쓰레기통에 버려요.', 'I throw it in the trash can.', '丢进垃圾桶。'),
  ('ko-life-basic-31', 'ko', 'basic', 'daily life', '비누', '비누', 'binu', 'soap', '肥皂', '비누로 씻어요.', 'I wash with soap.', '用肥皂洗。'),
  ('ko-life-basic-32', 'ko', 'basic', 'daily life', '수건', '수건', 'sugeon', 'towel', '毛巾', '수건으로 닦아요.', 'I wipe with a towel.', '用毛巾擦。'),
  ('ko-life-basic-33', 'ko', 'basic', 'daily life', '칫솔', '칫솔', 'chis-sol', 'toothbrush', '牙刷', '칫솔을 바꿔요.', 'I change my toothbrush.', '换牙刷。'),
  ('ko-life-basic-34', 'ko', 'basic', 'daily life', '약', '약', 'yak', 'medicine', '药', '약을 먹어요.', 'I take medicine.', '吃药。'),
  ('ko-life-basic-35', 'ko', 'basic', 'daily life', '신문', '신문', 'sinmun', 'newspaper', '报纸', '신문을 읽어요.', 'I read the newspaper.', '读报纸。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ja-verbs-basic] 16-35
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-verbs-basic-16', 'ja', 'basic', 'common verbs', '走る', 'はしる', 'hashiru', 'to run', '跑', '毎朝走ります。', 'I run every morning.', '我每天早上跑步。'),
  ('ja-verbs-basic-17', 'ja', 'basic', 'common verbs', '泳ぐ', 'およぐ', 'oyogu', 'to swim', '游泳', '海で泳ぎます。', 'I swim in the sea.', '在海里游泳。'),
  ('ja-verbs-basic-18', 'ja', 'basic', 'common verbs', '飛ぶ', 'とぶ', 'tobu', 'to fly', '飞', '鳥が飛びます。', 'A bird flies.', '鸟在飞。'),
  ('ja-verbs-basic-19', 'ja', 'basic', 'common verbs', '登る', 'のぼる', 'noboru', 'to climb', '爬', '山に登ります。', 'I climb the mountain.', '爬山。'),
  ('ja-verbs-basic-20', 'ja', 'basic', 'common verbs', '降りる', 'おりる', 'oriru', 'to get off', '下车', 'バスを降ります。', 'I get off the bus.', '下车。'),
  ('ja-verbs-basic-21', 'ja', 'basic', 'common verbs', '教える', 'おしえる', 'oshieru', 'to teach', '教', '日本語を教えます。', 'I teach Japanese.', '教日语。'),
  ('ja-verbs-basic-22', 'ja', 'basic', 'common verbs', '覚える', 'おぼえる', 'oboeru', 'to memorize', '记住', '単語を覚えます。', 'I memorize words.', '记单词。'),
  ('ja-verbs-basic-23', 'ja', 'basic', 'common verbs', '忘れる', 'わすれる', 'wasureru', 'to forget', '忘记', '名前を忘れました。', 'I forgot the name.', '忘了名字。'),
  ('ja-verbs-basic-24', 'ja', 'basic', 'common verbs', '歌う', 'うたう', 'utau', 'to sing', '唱歌', '歌を歌います。', 'I sing a song.', '唱歌。'),
  ('ja-verbs-basic-25', 'ja', 'basic', 'common verbs', '踊る', 'おどる', 'odoru', 'to dance', '跳舞', 'ダンスを踊ります。', 'I dance.', '跳舞。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;

-- [ko-verbs-basic] 16-35
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-verbs-basic-16', 'ko', 'basic', 'common verbs', '달리다', '달리다', 'dallida', 'to run', '跑', '공원에서 달려요.', 'I run in the park.', '在公园跑。'),
  ('ko-verbs-basic-17', 'ko', 'basic', 'common verbs', '수영하다', '수영하다', 'suyeonghada', 'to swim', '游泳', '바다에서 수영해요.', 'I swim in the sea.', '在海里游泳。'),
  ('ko-verbs-basic-18', 'ko', 'basic', 'common verbs', '날다', '날다', 'nalda', 'to fly', '飞', '새가 날아요.', 'A bird flies.', '鸟在飞。'),
  ('ko-verbs-basic-19', 'ko', 'basic', 'common verbs', '오르다', '오르다', 'oreuda', 'to climb', '爬', '산에 올라요.', 'I climb the mountain.', '爬山。'),
  ('ko-verbs-basic-20', 'ko', 'basic', 'common verbs', '내리다', '내리다', 'naerida', 'to get off', '下车', '버스에서 내려요.', 'I get off the bus.', '下车。'),
  ('ko-verbs-basic-21', 'ko', 'basic', 'common verbs', '가르치다', '가르치다', 'gareuchida', 'to teach', '教', '한국어를 가르쳐요.', 'I teach Korean.', '教韩语。'),
  ('ko-verbs-basic-22', 'ko', 'basic', 'common verbs', '외우다', '외우다', 'oeuda', 'to memorize', '记住', '단어를 외워요.', 'I memorize words.', '记单词。'),
  ('ko-verbs-basic-23', 'ko', 'basic', 'common verbs', '잊어버리다', '잊어버리다', 'ijeobeorida', 'to forget', '忘记', '이름을 잊어버렸어요.', 'I forgot the name.', '忘了名字。'),
  ('ko-verbs-basic-24', 'ko', 'basic', 'common verbs', '노래하다', '노래하다', 'noraehada', 'to sing', '唱歌', '노래를 해요.', 'I sing a song.', '唱歌。'),
  ('ko-verbs-basic-25', 'ko', 'basic', 'common verbs', '춤추다', '춤추다', 'chumchuda', 'to dance', '跳舞', '춤을 춰요.', 'I dance.', '跳舞。')
ON CONFLICT (id) DO UPDATE SET
  target_text = excluded.target_text, reading = excluded.reading, meaning_en = excluded.meaning_en, meaning_zh_cn = excluded.meaning_zh_cn;
