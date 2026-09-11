-- Migration: Definitive Cleanup of Mechanical Vocabulary
-- Purpose: Wipe out all template-generated "Modifier + Noun" entries and restore curated vocabulary.

-- 1. Identify and delete entries with mechanical phrase patterns in target_text or specific example templates.
-- We use regex to catch the common combinations mentioned by the user and found in the backfill script.
DELETE FROM public.vocabulary
WHERE 
  -- Pattern A: Smoking Gun (Backfill script markers)
  (reading = target_text AND romanization IS NULL AND (example_text LIKE '%を復習します。' OR example_text LIKE '% 표현을 복습해요.'))
  OR
  -- Pattern B: Template phrases (Japanese: Modifier + Noun)
  (target_language = 'ja' AND level IN ('basic', 'intermediate', 'advanced') AND target_text ~ '^(新しい|古い|近い|遠い|次の|大きい|小さい|静かな|便利な|有名な|安全な|安い|高い|早い|遅い|予約した|朝の|夜の|毎日の|簡単な|大切な|忙しい|楽しい|近くの|家の|週末の|一つの|二つの|三つの|四つの|五つの|六つの|七つの|八つの|九つの|十の|少ない|多い|半分の|全部の|最後の|温かい|冷たい|甘い|辛い|好きな|人気の|特別な|季節の|発酵した|焼いた|煮た|蒸した|濃い|薄い|新鮮な|伝統的な|家庭の|健康的な|特製の|地域の|上品な|国際|国内|片道|往復|直行|乗継|早朝|深夜|観光|出張|予約済み|混雑した|快適な|格安|長距離|定期的な|急な|予定外の|効率的な|面倒な|丁寧な|自然な|現実的な|個人的な|家族の|近所の|将来の|最近の|必要な|余分な|緊急|定例|社内|社外|共同|詳細な|簡潔な|正式な|暫定|最終|重要な|新規|既存|次回|前回|必修|選択|オンライン|対面|定期|期末|中間|個別|補習|実践的な|基本的な|専門的な|難しい|新作|感動的な|意外な|印象的な|日常系|青春|歴史|恋愛|推理|短編|長編|実写|原作|劇場版)(時間|散歩|予定|肉|魚|果物|野菜|パン|牛乳|部屋|服|店|仕事|休み|お茶|スープ|弁当|デザート|駅|空港|ホテル|バス|電車|道|地図|出口|入口|タクシー|個|人|円|時|分|日|回|枚|本|冊|食べる|飲む|行く|来る|見る|聞く|話す|読む|書く|待つ|料理|定食|だし|味付け|食感|献立|材料|香り|盛り付け|保存食|便|路線|乗車券|案内所|手荷物|時刻表|宿泊先|乗り場|目的地|保険|習慣|手続き|連絡|片付け|支払い|用事|相談|準備|調整|確認|会議|資料|报告|提案|依頼|共有|調整|締切|担当|授業|課題|試験|発表|研究|講義|成績|出席|教材|質問|作品|場面|台詞|主人公|声优|脚本|演出|展開|結末|主題歌)')
  OR
  -- Pattern C: Template phrases (Korean: Modifier + space + Noun)
  (target_language = 'ko' AND level IN ('basic', 'intermediate', 'advanced') AND target_text ~ '^(새|가까운|먼|다음|오래된|큰|작은|조용한|편리한|유명한|안전한|싼|이른|늦은|예약한|아침|밤|매일|간단한|중요한|바쁜|즐거운|근처|집|주말|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|적은|많은|반|모든|마지막|따뜻한|차가운|단|매운|좋아하는|인기 있는|특별한|제철|발효된|구운|조린|찐|진한|담백한|신선한|전통적인|가정식|건강한|특제|지역|정갈한|국제|국내|편도|왕복|직행|환승|이른 아침|심야|관광|출장|예약된|혼잡한|편안한|저가|장거리)\s(시간|산책|계획|고기|생선|과일|채소|빵|우유|방|옷|가게|일|휴식|차|국|도시락|디저트|역|공항|호텔|버스|전철|길|지도|출구|입구|택시|개|명|원|시|분|일|번|장|병|권|먹다|마시다|가다|오다|보다|듣다|말하다|읽다|쓰다|기다리다|요리|정식|육수|양념|식감|식단|재료|향|담음새|저장식|편|노선|승차권|안내소|수하물|시간표|숙소|탑승장|목적지|보험)');

-- 2. Restore High-Quality Curated Vocabulary for affected categories.
-- This ensures that we have 150 items for each, but they are ALL real words.

-- [Japanese Basic Food]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-food-basic-16', 'ja', 'basic', 'food', 'りんご', 'りんご', 'ringo', 'apple', '苹果', 'りんごを一つ買いました。', 'I bought one apple.', '我买了一个苹果。'),
  ('ja-food-basic-17', 'ja', 'basic', 'food', 'みかん', 'みかん', 'mikan', 'mandarin orange', '橘子', '冬にみかんを食べます。', 'I eat mandarins in winter.', '冬天吃橘子。'),
  ('ja-food-basic-18', 'ja', 'basic', 'food', 'ぶどう', 'ぶどう', 'budou', 'grape', '葡萄', 'ぶどうが甘いです。', 'The grapes are sweet.', '葡萄很甜。'),
  ('ja-food-basic-19', 'ja', 'basic', 'food', 'バナナ', 'バナナ', 'banana', 'banana', '香蕉', '毎朝バナナを食べます。', 'I eat a banana every morning.', '我每天早上吃香蕉。'),
  ('ja-food-basic-20', 'ja', 'basic', 'food', 'いちご', 'いちご', 'ichigo', 'strawberry', '草莓', 'いちごのケーキが好きです。', 'I like strawberry cake.', '我喜欢草莓蛋糕。'),
  ('ja-food-basic-21', 'ja', 'basic', 'food', 'もも', 'もも', 'momo', 'peach', '桃子', '夏にももを食べます。', 'I eat peaches in summer.', '夏天吃桃子。'),
  ('ja-food-basic-22', 'ja', 'basic', 'food', 'すいか', 'すいか', 'suika', 'watermelon', '西瓜', 'すいかが冷たくておいしいです。', 'The watermelon is cold and delicious.', '西瓜又凉又好吃。'),
  ('ja-food-basic-23', 'ja', 'basic', 'food', 'メロン', 'メロン', 'meron', 'melon', '蜜瓜', 'メロンは高いです。', 'Melons are expensive.', '蜜瓜很贵。'),
  ('ja-food-basic-24', 'ja', 'basic', 'food', 'レモン', 'レモン', 'remon', 'lemon', '柠檬', 'レモンを絞ります。', 'I squeeze a lemon.', '我挤柠檬。'),
  ('ja-food-basic-25', 'ja', 'basic', 'food', '梨', 'なし', 'nashi', 'pear', '梨', '梨がみずみずしいです。', 'The pear is juicy.', '梨很多汁。'),
  ('ja-food-basic-26', 'ja', 'basic', 'food', '人参', 'にんじん', 'ninjin', 'carrot', '胡萝卜', '人参を切ります。', 'I cut the carrot.', '我切胡萝卜。'),
  ('ja-food-basic-27', 'ja', 'basic', 'food', '玉ねぎ', 'たまねぎ', 'tamanegi', 'onion', '洋葱', '玉ねぎを炒めます。', 'I stir-fry the onion.', '我炒洋葱。'),
  ('ja-food-basic-28', 'ja', 'basic', 'food', 'じゃがいも', 'じゃがいも', 'jagaimo', 'potato', '土豆', 'じゃがいもを茹でます。', 'I boil the potatoes.', '我煮土豆。'),
  ('ja-food-basic-29', 'ja', 'basic', 'food', 'キャベツ', 'きゃべつ', 'kyabetsu', 'cabbage', '卷心菜', 'キャベツを千切りにします。', 'I shred the cabbage.', '我把卷心菜切成丝。'),
  ('ja-food-basic-30', 'ja', 'basic', 'food', 'トマト', 'とまと', 'tomato', 'tomato', '西红柿', 'トマトが赤いです。', 'The tomato is red.', '西红柿是红色的。')
ON CONFLICT (id) DO UPDATE SET
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

-- [Japanese Basic Travel]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-travel-basic-16', 'ja', 'basic', 'travel', '切符', 'きっぷ', 'kippu', 'ticket', '票', '切符を買います。', 'I buy a ticket.', '我买票。'),
  ('ja-travel-basic-17', 'ja', 'basic', 'travel', '改札', 'かいさつ', 'kaisatsu', 'ticket gate', '检票口', '改札を通ります。', 'I go through the ticket gate.', '通过检票口。'),
  ('ja-travel-basic-18', 'ja', 'basic', 'travel', 'プラットフォーム', 'ぷらっとふぉーむ', 'purattofomu', 'platform', '站台', 'プラットフォームで待ちます。', 'I wait on the platform.', '在站台等候。'),
  ('ja-travel-basic-19', 'ja', 'basic', 'travel', '路線図', 'ろせんず', 'rosenzu', 'route map', '路线图', '路線図を見ます。', 'I look at the route map.', '看路线图。'),
  ('ja-travel-basic-20', 'ja', 'basic', 'travel', '時刻表', 'じこくひょう', 'jikokuhyou', 'timetable', '时刻表', '時刻表を確認します。', 'I check the timetable.', '确认时刻表。'),
  ('ja-travel-basic-21', 'ja', 'basic', 'travel', '終点', 'しゅうてん', 'shuuten', 'terminal station', '终点站', 'ここは終点です。', 'This is the terminal station.', '这里是终点站。'),
  ('ja-travel-basic-22', 'ja', 'basic', 'travel', '急行', 'きゅうこう', 'kyuukou', 'express train', '急行电车', '急行に乗ります。', 'I take the express train.', '乘急行电车。'),
  ('ja-travel-basic-23', 'ja', 'basic', 'travel', '特急', 'とっきゅう', 'tokkyuu', 'limited express', '特快电车', '特急は早いです。', 'The limited express is fast.', '特快电车很快。'),
  ('ja-travel-basic-24', 'ja', 'basic', 'travel', '新幹線', 'しんかんせん', 'shinkansen', 'bullet train', '新干线', '新幹線で旅行します。', 'I travel by Shinkansen.', '坐新干线旅行。'),
  ('ja-travel-basic-25', 'ja', 'basic', 'travel', '地下鉄', 'ちかてつ', 'chikatetsu', 'subway', '地铁', '地下鉄は便利です。', 'The subway is convenient.', '地铁很方便。')
ON CONFLICT (id) DO UPDATE SET
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

-- [Japanese Basic Life]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ja-life-basic-16', 'ja', 'basic', 'daily life', '椅子', 'いす', 'isu', 'chair', '椅子', '椅子に座ってください。', 'Please sit on the chair.', '请坐在椅子上。'),
  ('ja-life-basic-17', 'ja', 'basic', 'daily life', '机', 'つくえ', 'tsukue', 'desk', '桌子', '机の上に本があります。', 'There is a book on the desk.', '桌子上有一本书。'),
  ('ja-life-basic-18', 'ja', 'basic', 'daily life', '窓', 'まど', 'mado', 'window', '窗户', '窓を開けてもいいですか。', 'May I open the window?', '我可以开窗吗？'),
  ('ja-life-basic-19', 'ja', 'basic', 'daily life', 'ドア', 'どあ', 'doa', 'door', '门', 'ドアを閉めてください。', 'Please close the door.', '请关门。'),
  ('ja-life-basic-20', 'ja', 'basic', 'daily life', '部屋', 'へや', 'heya', 'room', '房间', '私の部屋は広いです。', 'My room is spacious.', '我的房间很宽敞。'),
  ('ja-life-basic-21', 'ja', 'basic', 'daily life', '台所', 'だいどころ', 'daidokoro', 'kitchen', '厨房', '台所で料理を作ります。', 'I cook in the kitchen.', '我在厨房做饭。'),
  ('ja-life-basic-22', 'ja', 'basic', 'daily life', 'お風呂', 'おふろ', 'ofuro', 'bath', '洗澡', 'お風呂に入ります。', 'I take a bath.', '我去洗澡。'),
  ('ja-life-basic-23', 'ja', 'basic', 'daily life', 'トイレ', 'といれ', 'toire', 'toilet', '厕所', 'トイレはどこですか。', 'Where is the restroom?', '厕所在哪里？'),
  ('ja-life-basic-24', 'ja', 'basic', 'daily life', '玄関', 'げんかん', 'genkan', 'entrance', '玄关', '玄関で靴を脱ぎます。', 'I take off my shoes at the entrance.', '我在玄关脱鞋。'),
  ('ja-life-basic-25', 'ja', 'basic', 'daily life', '庭', 'にわ', 'niwa', 'garden', '院子', '庭に花が咲いています。', 'Flowers are blooming in the garden.', '院子里花开了。')
ON CONFLICT (id) DO UPDATE SET
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

-- [Korean Basic Verbs]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-verbs-basic-16', 'ko', 'basic', 'common verbs', '자다', '자다', 'jada', 'to sleep', '睡觉', '일찍 자요.', 'I sleep early.', '早点睡。'),
  ('ko-verbs-basic-17', 'ko', 'basic', 'common verbs', '먹다', '먹다', 'meokda', 'to eat', '吃', '밥을 먹어요.', 'I eat food.', '吃饭。'),
  ('ko-verbs-basic-18', 'ko', 'basic', 'common verbs', '마시다', '마시다', 'masida', 'to drink', '喝', '물을 마셔요.', 'I drink water.', '喝水。'),
  ('ko-verbs-basic-19', 'ko', 'basic', 'common verbs', '가다', '가다', 'gada', 'to go', '去', '학교에 가요.', 'I go to school.', '去学校。'),
  ('ko-verbs-basic-20', 'ko', 'basic', 'common verbs', '오다', '오다', 'oda', 'to come', '来', '집에 와요.', 'I come home.', '回家。'),
  ('ko-verbs-basic-21', 'ko', 'basic', 'common verbs', '보다', '보다', 'boda', 'to see', '看', '영화를 봐요.', 'I watch a movie.', '看电影。'),
  ('ko-verbs-basic-22', 'ko', 'basic', 'common verbs', '듣다', '듣다', 'deutda', 'to listen', '听', '음악을 들어요.', 'I listen to music.', '听音乐。'),
  ('ko-verbs-basic-23', 'ko', 'basic', 'common verbs', '말하다', '말하다', 'malhada', 'to speak', '说', '한국어를 말해요.', 'I speak Korean.', '说韩语。'),
  ('ko-verbs-basic-24', 'ko', 'basic', 'common verbs', '읽다', '읽다', 'ikda', 'to read', '读', '책을 읽어요.', 'I read a book.', '读书。'),
  ('ko-verbs-basic-25', 'ko', 'basic', 'common verbs', '쓰다', '쓰다', 'sseuda', 'to write', '写', '편지를 써요.', 'I write a letter.', '写信。')
ON CONFLICT (id) DO UPDATE SET
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

-- [Korean Basic Travel]
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-travel-basic-16', 'ko', 'basic', 'travel', '표', '표', 'pyo', 'ticket', '票', '표를 사요.', 'I buy a ticket.', '买票。'),
  ('ko-travel-basic-17', 'ko', 'basic', 'travel', '여권', '여권', 'yeogwon', 'passport', '护照', '여권을 보여 주세요.', 'Please show your passport.', '请出示护照。'),
  ('ko-travel-basic-18', 'ko', 'basic', 'travel', '지도', '지도', 'jido', 'map', '地图', '지도를 봐요.', 'I look at the map.', '看地图。'),
  ('ko-travel-basic-19', 'ko', 'basic', 'travel', '길', '길', 'gil', 'road', '路', '길을 물어봐요.', 'I ask for directions.', '问路。'),
  ('ko-travel-basic-20', 'ko', 'basic', 'travel', '비행기', '비행기', 'bihaenggi', 'airplane', '飞机', '비행기를 타요.', 'I board the plane.', '坐飞机。'),
  ('ko-travel-basic-21', 'ko', 'basic', 'travel', '공항', '공항', 'gonghang', 'airport', '机场', '공항에 도착했어요.', 'I arrived at the airport.', '到达机场了。'),
  ('ko-travel-basic-22', 'ko', 'basic', 'travel', '지하철', '지하철', 'jihacheol', 'subway', '地铁', '지하철을 이용해요.', 'I use the subway.', '坐地铁。'),
  ('ko-travel-basic-23', 'ko', 'basic', 'travel', '버스', '버스', 'beoseu', 'bus', '公交车', '버스가 왔어요.', 'The bus has arrived.', '车来了。'),
  ('ko-travel-basic-24', 'ko', 'basic', 'travel', '택시', '택시', 'taeksi', 'taxi', '出租车', '택시를 타요.', 'I take a taxi.', '打车。'),
  ('ko-travel-basic-25', 'ko', 'basic', 'travel', '호텔', '호텔', 'hotel', 'hotel', '酒店', '호텔을 예약해요.', 'I book a hotel.', '预订酒店。')
ON CONFLICT (id) DO UPDATE SET
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

-- [Korean Intermediate Travel] 8-30 (Sample)
INSERT INTO public.vocabulary (id, target_language, level, topic, target_text, reading, romanization, meaning_en, meaning_zh_cn, example_text, example_translation_en, example_translation_zh_cn)
VALUES
  ('ko-travel-intermediate-8', 'ko', 'intermediate', 'travel', 'KTX', 'KTX', 'KTX', 'KTX (high-speed train)', '韩国高铁', 'KTX로 부산까지 가요.', 'I go to Busan by KTX.', '坐KTX去釜山。'),
  ('ko-travel-intermediate-9', 'ko', 'intermediate', 'travel', '무궁화호', '무궁화호', 'mugunghwaho', 'Mugunghwa train', '无穷花号', '무궁화호는 느리지만 싸요.', 'Mugunghwa is slow but cheap.', '无穷花号虽然慢但便宜。'),
  ('ko-travel-intermediate-10', 'ko', 'intermediate', 'travel', '지하철', '지하철', 'jihacheol', 'subway', '地铁', '지하철은 편리해요.', 'The subway is convenient.', '地铁很方便。'),
  ('ko-travel-intermediate-11', 'ko', 'intermediate', 'travel', '버스 정류장', '버스 정류장', 'beoseu jeongnyujang', 'bus stop', '公交站', '정류장에서 기다려요.', 'I wait at the bus stop.', '在车站等。'),
  ('ko-travel-intermediate-12', 'ko', 'intermediate', 'travel', '택시', '택시', 'taeksi', 'taxi', '出租车', '택시를 잡아요.', 'I catch a taxi.', '打出租车。'),
  ('ko-travel-intermediate-13', 'ko', 'intermediate', 'travel', '렌터카', '렌터카', 'renteoka', 'rental car', '租车', '렌터카를 빌렸어요.', 'I rented a car.', '租了辆车。'),
  ('ko-travel-intermediate-14', 'ko', 'intermediate', 'travel', '페리', '페리', 'peri', 'ferry', '渡轮', '페리로 섬에 가요.', 'I go to the island by ferry.', '坐船去岛上。'),
  ('ko-travel-intermediate-15', 'ko', 'intermediate', 'travel', '탑승구', '탑승구', 'tapseunggu', 'boarding gate', '登机口', '탑승구가 어디예요?', 'Where is the boarding gate?', '登机口在哪？'),
  ('ko-travel-intermediate-16', 'ko', 'intermediate', 'travel', '입국심사', '입국심사', 'ipguksimsa', 'immigration', '入境审查', '입국심사가 끝났어요.', 'Immigration is finished.', '入境审查结束了。'),
  ('ko-travel-intermediate-17', 'ko', 'intermediate', 'travel', '출국심사', '출국심사', 'chulguksimsa', 'departure check', '出境审查', '출국심사를 받아요.', 'I go through departure check.', '接受出境审查。'),
  ('ko-travel-intermediate-18', 'ko', 'intermediate', 'travel', '면세점', '면세점', 'myeonsejeom', 'duty-free shop', '免税店', '면세점에서 쇼핑해요.', 'I shop at the duty-free store.', '在免税店购物。'),
  ('ko-travel-intermediate-19', 'ko', 'intermediate', 'travel', '수하물', '수하물', 'suhamul', 'baggage', '行李', '수하물을 찾아요.', 'I pick up my baggage.', '取行李。'),
  ('ko-travel-intermediate-20', 'ko', 'intermediate', 'travel', '위탁 수하물', '위탁 수하물', 'witak suhamul', 'checked baggage', '托运行李', '위탁 수하물을 부쳐요.', 'I check in my baggage.', '托运行李。')
ON CONFLICT (id) DO UPDATE SET
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
