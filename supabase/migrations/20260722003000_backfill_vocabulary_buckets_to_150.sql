-- ponytail: generated phrase backfill to reach 150 terms per active bucket; replace with curated imports when course quality matters.
create or replace function public.backfill_vocabulary_bucket_to_150(
  p_prefix text,
  p_target_language text,
  p_level text,
  p_topic text,
  p_target_separator text,
  p_modifiers jsonb,
  p_heads jsonb
)
returns void
language plpgsql
as $$
declare
  current_count integer;
  modifier jsonb;
  head jsonb;
  target_text text;
  meaning_en text;
  meaning_zh_cn text;
begin
  select count(*)
  into current_count
  from public.vocabulary
  where target_language = p_target_language
    and level = p_level
    and topic = p_topic;

  for modifier in select value from jsonb_array_elements(p_modifiers) loop
    for head in select value from jsonb_array_elements(p_heads) loop
      exit when current_count >= 150;
      current_count := current_count + 1;
      target_text := modifier->>'target' || p_target_separator || head->>'target';
      meaning_en := modifier->>'en' || ' ' || head->>'en';
      meaning_zh_cn := modifier->>'zh' || head->>'zh';

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
      ) values (
        p_prefix || '-' || current_count,
        p_target_language,
        p_level,
        p_topic,
        target_text,
        target_text,
        null,
        meaning_en,
        meaning_zh_cn,
        case
          when p_target_language = 'ja' then '「' || target_text || '」を復習します。'
          else '''' || target_text || ''' 표현을 복습해요.'
        end,
        'I review "' || meaning_en || '".',
        '我复习“' || meaning_zh_cn || '”。'
      )
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
    end loop;
  end loop;
end;
$$;

select public.backfill_vocabulary_bucket_to_150('ja-food-basic', 'ja', 'basic', 'food', '', '[
  {"target":"新しい","en":"new","zh":"新的"},{"target":"温かい","en":"warm","zh":"温热的"},{"target":"冷たい","en":"cold","zh":"冰的"},{"target":"甘い","en":"sweet","zh":"甜的"},{"target":"辛い","en":"spicy","zh":"辣的"},
  {"target":"小さい","en":"small","zh":"小份"},{"target":"大きい","en":"large","zh":"大份"},{"target":"朝の","en":"morning","zh":"早晨的"},{"target":"夜の","en":"night","zh":"晚上的"},{"target":"好きな","en":"favorite","zh":"喜欢的"},
  {"target":"安い","en":"cheap","zh":"便宜的"},{"target":"高い","en":"expensive","zh":"贵的"},{"target":"人気の","en":"popular","zh":"受欢迎的"},{"target":"簡単な","en":"simple","zh":"简单的"},{"target":"特別な","en":"special","zh":"特别的"}
]'::jsonb, '[
  {"target":"お茶","en":"tea","zh":"茶"},{"target":"牛乳","en":"milk","zh":"牛奶"},{"target":"パン","en":"bread","zh":"面包"},{"target":"魚","en":"fish","zh":"鱼"},{"target":"肉","en":"meat","zh":"肉"},
  {"target":"野菜","en":"vegetables","zh":"蔬菜"},{"target":"果物","en":"fruit","zh":"水果"},{"target":"スープ","en":"soup","zh":"汤"},{"target":"弁当","en":"boxed lunch","zh":"便当"},{"target":"デザート","en":"dessert","zh":"甜点"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-food-basic', 'ko', 'basic', 'food', ' ', '[
  {"target":"새","en":"new","zh":"新的"},{"target":"따뜻한","en":"warm","zh":"温热的"},{"target":"차가운","en":"cold","zh":"冰的"},{"target":"단","en":"sweet","zh":"甜的"},{"target":"매운","en":"spicy","zh":"辣的"},
  {"target":"작은","en":"small","zh":"小份"},{"target":"큰","en":"large","zh":"大份"},{"target":"아침","en":"morning","zh":"早晨的"},{"target":"밤","en":"night","zh":"晚上的"},{"target":"좋아하는","en":"favorite","zh":"喜欢的"},
  {"target":"싼","en":"cheap","zh":"便宜的"},{"target":"비싼","en":"expensive","zh":"贵的"},{"target":"인기 있는","en":"popular","zh":"受欢迎的"},{"target":"간단한","en":"simple","zh":"简单的"},{"target":"특별한","en":"special","zh":"特别的"}
]'::jsonb, '[
  {"target":"차","en":"tea","zh":"茶"},{"target":"우유","en":"milk","zh":"牛奶"},{"target":"빵","en":"bread","zh":"面包"},{"target":"생선","en":"fish","zh":"鱼"},{"target":"고기","en":"meat","zh":"肉"},
  {"target":"채소","en":"vegetables","zh":"蔬菜"},{"target":"과일","en":"fruit","zh":"水果"},{"target":"국","en":"soup","zh":"汤"},{"target":"도시락","en":"boxed lunch","zh":"便当"},{"target":"디저트","en":"dessert","zh":"甜点"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-travel-basic', 'ja', 'basic', 'travel', '', '[
  {"target":"新しい","en":"new","zh":"新的"},{"target":"近い","en":"nearby","zh":"附近的"},{"target":"遠い","en":"far","zh":"远的"},{"target":"次の","en":"next","zh":"下一个"},{"target":"古い","en":"old","zh":"旧的"},
  {"target":"大きい","en":"large","zh":"大的"},{"target":"小さい","en":"small","zh":"小的"},{"target":"静かな","en":"quiet","zh":"安静的"},{"target":"便利な","en":"convenient","zh":"方便的"},{"target":"有名な","en":"famous","zh":"有名的"},
  {"target":"安全な","en":"safe","zh":"安全的"},{"target":"安い","en":"cheap","zh":"便宜的"},{"target":"早い","en":"early","zh":"早的"},{"target":"遅い","en":"late","zh":"晚的"},{"target":"予約した","en":"reserved","zh":"预订的"}
]'::jsonb, '[
  {"target":"駅","en":"station","zh":"车站"},{"target":"空港","en":"airport","zh":"机场"},{"target":"ホテル","en":"hotel","zh":"酒店"},{"target":"バス","en":"bus","zh":"公交车"},{"target":"電車","en":"train","zh":"电车"},
  {"target":"道","en":"road","zh":"道路"},{"target":"地図","en":"map","zh":"地图"},{"target":"出口","en":"exit","zh":"出口"},{"target":"入口","en":"entrance","zh":"入口"},{"target":"タクシー","en":"taxi","zh":"出租车"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-travel-basic', 'ko', 'basic', 'travel', ' ', '[
  {"target":"새","en":"new","zh":"新的"},{"target":"가까운","en":"nearby","zh":"附近的"},{"target":"먼","en":"far","zh":"远的"},{"target":"다음","en":"next","zh":"下一个"},{"target":"오래된","en":"old","zh":"旧的"},
  {"target":"큰","en":"large","zh":"大的"},{"target":"작은","en":"small","zh":"小的"},{"target":"조용한","en":"quiet","zh":"安静的"},{"target":"편리한","en":"convenient","zh":"方便的"},{"target":"유명한","en":"famous","zh":"有名的"},
  {"target":"안전한","en":"safe","zh":"安全的"},{"target":"싼","en":"cheap","zh":"便宜的"},{"target":"이른","en":"early","zh":"早的"},{"target":"늦은","en":"late","zh":"晚的"},{"target":"예약한","en":"reserved","zh":"预订的"}
]'::jsonb, '[
  {"target":"역","en":"station","zh":"车站"},{"target":"공항","en":"airport","zh":"机场"},{"target":"호텔","en":"hotel","zh":"酒店"},{"target":"버스","en":"bus","zh":"公交车"},{"target":"전철","en":"train","zh":"电车"},
  {"target":"길","en":"road","zh":"道路"},{"target":"지도","en":"map","zh":"地图"},{"target":"출구","en":"exit","zh":"出口"},{"target":"입구","en":"entrance","zh":"入口"},{"target":"택시","en":"taxi","zh":"出租车"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-life-basic', 'ja', 'basic', 'daily life', '', '[
  {"target":"朝の","en":"morning","zh":"早晨的"},{"target":"夜の","en":"night","zh":"晚上的"},{"target":"毎日の","en":"daily","zh":"每天的"},{"target":"簡単な","en":"simple","zh":"简单的"},{"target":"大切な","en":"important","zh":"重要的"},
  {"target":"静かな","en":"quiet","zh":"安静的"},{"target":"忙しい","en":"busy","zh":"忙碌的"},{"target":"楽しい","en":"pleasant","zh":"愉快的"},{"target":"新しい","en":"new","zh":"新的"},{"target":"古い","en":"old","zh":"旧的"},
  {"target":"小さい","en":"small","zh":"小的"},{"target":"大きい","en":"large","zh":"大的"},{"target":"近くの","en":"nearby","zh":"附近的"},{"target":"家の","en":"home","zh":"家里的"},{"target":"週末の","en":"weekend","zh":"周末的"}
]'::jsonb, '[
  {"target":"部屋","en":"room","zh":"房间"},{"target":"服","en":"clothes","zh":"衣服"},{"target":"電話","en":"phone","zh":"电话"},{"target":"予定","en":"plan","zh":"计划"},{"target":"時間","en":"time","zh":"时间"},
  {"target":"家","en":"home","zh":"家"},{"target":"店","en":"shop","zh":"商店"},{"target":"仕事","en":"task","zh":"事情"},{"target":"休み","en":"rest","zh":"休息"},{"target":"散歩","en":"walk","zh":"散步"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-life-basic', 'ko', 'basic', 'daily life', ' ', '[
  {"target":"아침","en":"morning","zh":"早晨的"},{"target":"밤","en":"night","zh":"晚上的"},{"target":"매일","en":"daily","zh":"每天的"},{"target":"간단한","en":"simple","zh":"简单的"},{"target":"중요한","en":"important","zh":"重要的"},
  {"target":"조용한","en":"quiet","zh":"安静的"},{"target":"바쁜","en":"busy","zh":"忙碌的"},{"target":"즐거운","en":"pleasant","zh":"愉快的"},{"target":"새","en":"new","zh":"新的"},{"target":"오래된","en":"old","zh":"旧的"},
  {"target":"작은","en":"small","zh":"小的"},{"target":"큰","en":"large","zh":"大的"},{"target":"근처","en":"nearby","zh":"附近的"},{"target":"집","en":"home","zh":"家里的"},{"target":"주말","en":"weekend","zh":"周末的"}
]'::jsonb, '[
  {"target":"방","en":"room","zh":"房间"},{"target":"옷","en":"clothes","zh":"衣服"},{"target":"전화","en":"phone","zh":"电话"},{"target":"계획","en":"plan","zh":"计划"},{"target":"시간","en":"time","zh":"时间"},
  {"target":"집","en":"home","zh":"家"},{"target":"가게","en":"shop","zh":"商店"},{"target":"일","en":"task","zh":"事情"},{"target":"휴식","en":"rest","zh":"休息"},{"target":"산책","en":"walk","zh":"散步"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-numbers-basic', 'ja', 'basic', 'numbers', '', '[
  {"target":"一つの","en":"one","zh":"一个"},{"target":"二つの","en":"two","zh":"两个"},{"target":"三つの","en":"three","zh":"三个"},{"target":"四つの","en":"four","zh":"四个"},{"target":"五つの","en":"five","zh":"五个"},
  {"target":"六つの","en":"six","zh":"六个"},{"target":"七つの","en":"seven","zh":"七个"},{"target":"八つの","en":"eight","zh":"八个"},{"target":"九つの","en":"nine","zh":"九个"},{"target":"十の","en":"ten","zh":"十个"},
  {"target":"少ない","en":"few","zh":"少量"},{"target":"多い","en":"many","zh":"很多"},{"target":"半分の","en":"half","zh":"一半的"},{"target":"全部の","en":"all","zh":"全部的"},{"target":"最後の","en":"last","zh":"最后的"}
]'::jsonb, '[
  {"target":"個","en":"items","zh":"个物品"},{"target":"人","en":"people","zh":"个人"},{"target":"円","en":"yen","zh":"日元"},{"target":"時","en":"o'clock","zh":"点钟"},{"target":"分","en":"minutes","zh":"分钟"},
  {"target":"日","en":"days","zh":"天"},{"target":"回","en":"times","zh":"次"},{"target":"枚","en":"flat objects","zh":"张"},{"target":"本","en":"long objects","zh":"根"},{"target":"冊","en":"books","zh":"本书"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-numbers-basic', 'ko', 'basic', 'numbers', ' ', '[
  {"target":"한","en":"one","zh":"一个"},{"target":"두","en":"two","zh":"两个"},{"target":"세","en":"three","zh":"三个"},{"target":"네","en":"four","zh":"四个"},{"target":"다섯","en":"five","zh":"五个"},
  {"target":"여섯","en":"six","zh":"六个"},{"target":"일곱","en":"seven","zh":"七个"},{"target":"여덟","en":"eight","zh":"八个"},{"target":"아홉","en":"nine","zh":"九个"},{"target":"열","en":"ten","zh":"十个"},
  {"target":"적은","en":"few","zh":"少量"},{"target":"많은","en":"many","zh":"很多"},{"target":"반","en":"half","zh":"一半的"},{"target":"모든","en":"all","zh":"全部的"},{"target":"마지막","en":"last","zh":"最后的"}
]'::jsonb, '[
  {"target":"개","en":"items","zh":"个物品"},{"target":"명","en":"people","zh":"个人"},{"target":"원","en":"won","zh":"韩元"},{"target":"시","en":"o'clock","zh":"点钟"},{"target":"분","en":"minutes","zh":"分钟"},
  {"target":"일","en":"days","zh":"天"},{"target":"번","en":"times","zh":"次"},{"target":"장","en":"flat objects","zh":"张"},{"target":"병","en":"bottles","zh":"瓶"},{"target":"권","en":"books","zh":"本书"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-verbs-basic', 'ja', 'basic', 'common verbs', '', '[
  {"target":"よく","en":"often","zh":"经常"},{"target":"すぐ","en":"soon","zh":"马上"},{"target":"ゆっくり","en":"slowly","zh":"慢慢"},{"target":"一緒に","en":"together","zh":"一起"},{"target":"静かに","en":"quietly","zh":"安静地"},
  {"target":"毎日","en":"daily","zh":"每天"},{"target":"あとで","en":"later","zh":"之后"},{"target":"先に","en":"first","zh":"先"},{"target":"もう一度","en":"again","zh":"再次"},{"target":"少し","en":"a little","zh":"稍微"},
  {"target":"ちゃんと","en":"properly","zh":"好好地"},{"target":"早く","en":"quickly","zh":"快速地"},{"target":"楽しく","en":"pleasantly","zh":"愉快地"},{"target":"家で","en":"at home","zh":"在家"},{"target":"外で","en":"outside","zh":"在外面"}
]'::jsonb, '[
  {"target":"食べる","en":"eat","zh":"吃"},{"target":"飲む","en":"drink","zh":"喝"},{"target":"行く","en":"go","zh":"去"},{"target":"来る","en":"come","zh":"来"},{"target":"見る","en":"see","zh":"看"},
  {"target":"聞く","en":"listen","zh":"听"},{"target":"話す","en":"speak","zh":"说"},{"target":"読む","en":"read","zh":"读"},{"target":"書く","en":"write","zh":"写"},{"target":"待つ","en":"wait","zh":"等"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-verbs-basic', 'ko', 'basic', 'common verbs', ' ', '[
  {"target":"자주","en":"often","zh":"经常"},{"target":"곧","en":"soon","zh":"马上"},{"target":"천천히","en":"slowly","zh":"慢慢"},{"target":"같이","en":"together","zh":"一起"},{"target":"조용히","en":"quietly","zh":"安静地"},
  {"target":"매일","en":"daily","zh":"每天"},{"target":"나중에","en":"later","zh":"之后"},{"target":"먼저","en":"first","zh":"先"},{"target":"다시","en":"again","zh":"再次"},{"target":"조금","en":"a little","zh":"稍微"},
  {"target":"제대로","en":"properly","zh":"好好地"},{"target":"빨리","en":"quickly","zh":"快速地"},{"target":"즐겁게","en":"pleasantly","zh":"愉快地"},{"target":"집에서","en":"at home","zh":"在家"},{"target":"밖에서","en":"outside","zh":"在外面"}
]'::jsonb, '[
  {"target":"먹다","en":"eat","zh":"吃"},{"target":"마시다","en":"drink","zh":"喝"},{"target":"가다","en":"go","zh":"去"},{"target":"오다","en":"come","zh":"来"},{"target":"보다","en":"see","zh":"看"},
  {"target":"듣다","en":"listen","zh":"听"},{"target":"말하다","en":"speak","zh":"说"},{"target":"읽다","en":"read","zh":"读"},{"target":"쓰다","en":"write","zh":"写"},{"target":"기다리다","en":"wait","zh":"等"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-food-intermediate', 'ja', 'intermediate', 'food', '', '[
  {"target":"季節の","en":"seasonal","zh":"时令的"},{"target":"発酵した","en":"fermented","zh":"发酵的"},{"target":"焼いた","en":"grilled","zh":"烤的"},{"target":"煮た","en":"simmered","zh":"炖的"},{"target":"蒸した","en":"steamed","zh":"蒸的"},
  {"target":"濃い","en":"rich","zh":"浓郁的"},{"target":"薄い","en":"light","zh":"清淡的"},{"target":"新鮮な","en":"fresh","zh":"新鲜的"},{"target":"伝統的な","en":"traditional","zh":"传统的"},{"target":"家庭の","en":"homestyle","zh":"家常的"},
  {"target":"健康的な","en":"healthy","zh":"健康的"},{"target":"人気の","en":"popular","zh":"受欢迎的"},{"target":"特製の","en":"special","zh":"特制的"},{"target":"地域の","en":"regional","zh":"地方的"},{"target":"上品な","en":"refined","zh":"精致的"}
]'::jsonb, '[
  {"target":"料理","en":"dish","zh":"料理"},{"target":"定食","en":"set meal","zh":"套餐"},{"target":"だし","en":"broth","zh":"高汤"},{"target":"味付け","en":"seasoning","zh":"调味"},{"target":"食感","en":"texture","zh":"口感"},
  {"target":"献立","en":"menu plan","zh":"菜单"},{"target":"材料","en":"ingredients","zh":"材料"},{"target":"香り","en":"aroma","zh":"香气"},{"target":"盛り付け","en":"plating","zh":"摆盘"},{"target":"保存食","en":"preserved food","zh":"保存食品"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-food-intermediate', 'ko', 'intermediate', 'food', ' ', '[
  {"target":"제철","en":"seasonal","zh":"时令的"},{"target":"발효된","en":"fermented","zh":"发酵的"},{"target":"구운","en":"grilled","zh":"烤的"},{"target":"조린","en":"simmered","zh":"炖的"},{"target":"찐","en":"steamed","zh":"蒸的"},
  {"target":"진한","en":"rich","zh":"浓郁的"},{"target":"담백한","en":"light","zh":"清淡的"},{"target":"신선한","en":"fresh","zh":"新鲜的"},{"target":"전통적인","en":"traditional","zh":"传统的"},{"target":"가정식","en":"homestyle","zh":"家常的"},
  {"target":"건강한","en":"healthy","zh":"健康的"},{"target":"인기 있는","en":"popular","zh":"受欢迎的"},{"target":"특제","en":"special","zh":"特制的"},{"target":"지역","en":"regional","zh":"地方的"},{"target":"정갈한","en":"refined","zh":"精致的"}
]'::jsonb, '[
  {"target":"요리","en":"dish","zh":"料理"},{"target":"정식","en":"set meal","zh":"套餐"},{"target":"육수","en":"broth","zh":"高汤"},{"target":"양념","en":"seasoning","zh":"调味"},{"target":"식감","en":"texture","zh":"口感"},
  {"target":"식단","en":"menu plan","zh":"菜单"},{"target":"재료","en":"ingredients","zh":"材料"},{"target":"향","en":"aroma","zh":"香气"},{"target":"담음새","en":"plating","zh":"摆盘"},{"target":"저장식","en":"preserved food","zh":"保存食品"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-travel-intermediate', 'ja', 'intermediate', 'travel', '', '[
  {"target":"国際","en":"international","zh":"国际"},{"target":"国内","en":"domestic","zh":"国内"},{"target":"片道","en":"one-way","zh":"单程"},{"target":"往復","en":"round-trip","zh":"往返"},{"target":"直行","en":"direct","zh":"直达"},
  {"target":"乗継","en":"connecting","zh":"转乘"},{"target":"早朝","en":"early morning","zh":"清晨"},{"target":"深夜","en":"late night","zh":"深夜"},{"target":"観光","en":"sightseeing","zh":"观光"},{"target":"出張","en":"business trip","zh":"出差"},
  {"target":"予約済み","en":"reserved","zh":"已预订"},{"target":"混雑した","en":"crowded","zh":"拥挤的"},{"target":"快適な","en":"comfortable","zh":"舒适的"},{"target":"格安","en":"budget","zh":"廉价"},{"target":"長距離","en":"long-distance","zh":"长途"}
]'::jsonb, '[
  {"target":"便","en":"service","zh":"班次"},{"target":"路線","en":"route","zh":"路线"},{"target":"乗車券","en":"boarding ticket","zh":"乘车券"},{"target":"案内所","en":"information desk","zh":"问讯处"},{"target":"手荷物","en":"baggage","zh":"行李"},
  {"target":"時刻表","en":"timetable","zh":"时刻表"},{"target":"宿泊先","en":"accommodation","zh":"住宿地"},{"target":"乗り場","en":"boarding area","zh":"乘车处"},{"target":"目的地","en":"destination","zh":"目的地"},{"target":"保険","en":"insurance","zh":"保险"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-travel-intermediate', 'ko', 'intermediate', 'travel', ' ', '[
  {"target":"국제","en":"international","zh":"国际"},{"target":"국내","en":"domestic","zh":"国内"},{"target":"편도","en":"one-way","zh":"单程"},{"target":"왕복","en":"round-trip","zh":"往返"},{"target":"직행","en":"direct","zh":"直达"},
  {"target":"환승","en":"connecting","zh":"转乘"},{"target":"이른 아침","en":"early morning","zh":"清晨"},{"target":"심야","en":"late night","zh":"深夜"},{"target":"관광","en":"sightseeing","zh":"观光"},{"target":"출장","en":"business trip","zh":"出差"},
  {"target":"예약된","en":"reserved","zh":"已预订"},{"target":"혼잡한","en":"crowded","zh":"拥挤的"},{"target":"편안한","en":"comfortable","zh":"舒适的"},{"target":"저가","en":"budget","zh":"廉价"},{"target":"장거리","en":"long-distance","zh":"长途"}
]'::jsonb, '[
  {"target":"편","en":"service","zh":"班次"},{"target":"노선","en":"route","zh":"路线"},{"target":"승차권","en":"boarding ticket","zh":"乘车券"},{"target":"안내소","en":"information desk","zh":"问讯处"},{"target":"수하물","en":"baggage","zh":"行李"},
  {"target":"시간표","en":"timetable","zh":"时刻表"},{"target":"숙소","en":"accommodation","zh":"住宿地"},{"target":"탑승장","en":"boarding area","zh":"乘车处"},{"target":"목적지","en":"destination","zh":"目的地"},{"target":"보험","en":"insurance","zh":"保险"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-life-intermediate', 'ja', 'intermediate', 'daily life', '', '[
  {"target":"定期的な","en":"regular","zh":"定期的"},{"target":"急な","en":"sudden","zh":"突然的"},{"target":"予定外の","en":"unexpected","zh":"计划外的"},{"target":"効率的な","en":"efficient","zh":"高效的"},{"target":"面倒な","en":"troublesome","zh":"麻烦的"},
  {"target":"丁寧な","en":"careful","zh":"仔细的"},{"target":"自然な","en":"natural","zh":"自然的"},{"target":"現実的な","en":"realistic","zh":"现实的"},{"target":"個人的な","en":"personal","zh":"个人的"},{"target":"家族の","en":"family","zh":"家庭的"},
  {"target":"近所の","en":"neighborhood","zh":"附近的"},{"target":"将来の","en":"future","zh":"未来的"},{"target":"最近の","en":"recent","zh":"最近的"},{"target":"必要な","en":"necessary","zh":"必要的"},{"target":"余分な","en":"extra","zh":"额外的"}
]'::jsonb, '[
  {"target":"習慣","en":"habit","zh":"习惯"},{"target":"手続き","en":"procedure","zh":"手续"},{"target":"連絡","en":"contact","zh":"联系"},{"target":"片付け","en":"tidying","zh":"整理"},{"target":"支払い","en":"payment","zh":"支付"},
  {"target":"用事","en":"errand","zh":"事情"},{"target":"相談","en":"consultation","zh":"商量"},{"target":"準備","en":"preparation","zh":"准备"},{"target":"調整","en":"adjustment","zh":"调整"},{"target":"確認","en":"confirmation","zh":"确认"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-life-intermediate', 'ko', 'intermediate', 'daily life', ' ', '[
  {"target":"정기적인","en":"regular","zh":"定期的"},{"target":"갑작스러운","en":"sudden","zh":"突然的"},{"target":"예상 밖의","en":"unexpected","zh":"计划外的"},{"target":"효율적인","en":"efficient","zh":"高效的"},{"target":"번거로운","en":"troublesome","zh":"麻烦的"},
  {"target":"꼼꼼한","en":"careful","zh":"仔细的"},{"target":"자연스러운","en":"natural","zh":"自然的"},{"target":"현실적인","en":"realistic","zh":"现实的"},{"target":"개인적인","en":"personal","zh":"个人的"},{"target":"가족","en":"family","zh":"家庭的"},
  {"target":"동네","en":"neighborhood","zh":"附近的"},{"target":"미래","en":"future","zh":"未来的"},{"target":"최근","en":"recent","zh":"最近的"},{"target":"필요한","en":"necessary","zh":"必要的"},{"target":"추가","en":"extra","zh":"额外的"}
]'::jsonb, '[
  {"target":"습관","en":"habit","zh":"习惯"},{"target":"절차","en":"procedure","zh":"手续"},{"target":"연락","en":"contact","zh":"联系"},{"target":"정리","en":"tidying","zh":"整理"},{"target":"결제","en":"payment","zh":"支付"},
  {"target":"용무","en":"errand","zh":"事情"},{"target":"상담","en":"consultation","zh":"商量"},{"target":"준비","en":"preparation","zh":"准备"},{"target":"조정","en":"adjustment","zh":"调整"},{"target":"확인","en":"confirmation","zh":"确认"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-work-intermediate', 'ja', 'intermediate', 'work', '', '[
  {"target":"緊急","en":"urgent","zh":"紧急"},{"target":"定例","en":"regular","zh":"例行"},{"target":"社内","en":"internal","zh":"公司内部"},{"target":"社外","en":"external","zh":"公司外部"},{"target":"共同","en":"joint","zh":"共同"},
  {"target":"詳細な","en":"detailed","zh":"详细的"},{"target":"簡潔な","en":"concise","zh":"简洁的"},{"target":"正式な","en":"formal","zh":"正式的"},{"target":"暫定","en":"temporary","zh":"临时"},{"target":"最終","en":"final","zh":"最终"},
  {"target":"重要な","en":"important","zh":"重要的"},{"target":"新規","en":"new","zh":"新的"},{"target":"既存","en":"existing","zh":"既有的"},{"target":"次回","en":"next","zh":"下次"},{"target":"前回","en":"previous","zh":"上次"}
]'::jsonb, '[
  {"target":"会議","en":"meeting","zh":"会议"},{"target":"資料","en":"documents","zh":"资料"},{"target":"報告","en":"report","zh":"报告"},{"target":"提案","en":"proposal","zh":"提案"},{"target":"依頼","en":"request","zh":"请求"},
  {"target":"確認","en":"confirmation","zh":"确认"},{"target":"共有","en":"sharing","zh":"共享"},{"target":"調整","en":"coordination","zh":"协调"},{"target":"締切","en":"deadline","zh":"截止日期"},{"target":"担当","en":"person in charge","zh":"负责人"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-work-intermediate', 'ko', 'intermediate', 'work', ' ', '[
  {"target":"긴급","en":"urgent","zh":"紧急"},{"target":"정례","en":"regular","zh":"例行"},{"target":"사내","en":"internal","zh":"公司内部"},{"target":"사외","en":"external","zh":"公司外部"},{"target":"공동","en":"joint","zh":"共同"},
  {"target":"상세한","en":"detailed","zh":"详细的"},{"target":"간결한","en":"concise","zh":"简洁的"},{"target":"공식적인","en":"formal","zh":"正式的"},{"target":"임시","en":"temporary","zh":"临时"},{"target":"최종","en":"final","zh":"最终"},
  {"target":"중요한","en":"important","zh":"重要的"},{"target":"신규","en":"new","zh":"新的"},{"target":"기존","en":"existing","zh":"既有的"},{"target":"다음","en":"next","zh":"下次"},{"target":"지난","en":"previous","zh":"上次"}
]'::jsonb, '[
  {"target":"회의","en":"meeting","zh":"会议"},{"target":"자료","en":"documents","zh":"资料"},{"target":"보고","en":"report","zh":"报告"},{"target":"제안","en":"proposal","zh":"提案"},{"target":"요청","en":"request","zh":"请求"},
  {"target":"확인","en":"confirmation","zh":"确认"},{"target":"공유","en":"sharing","zh":"共享"},{"target":"조정","en":"coordination","zh":"协调"},{"target":"마감","en":"deadline","zh":"截止日期"},{"target":"담당자","en":"person in charge","zh":"负责人"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-school-intermediate', 'ja', 'intermediate', 'school', '', '[
  {"target":"必修","en":"required","zh":"必修"},{"target":"選択","en":"elective","zh":"选修"},{"target":"オンライン","en":"online","zh":"线上"},{"target":"対面","en":"in-person","zh":"面对面"},{"target":"定期","en":"regular","zh":"定期"},
  {"target":"期末","en":"final","zh":"期末"},{"target":"中間","en":"midterm","zh":"期中"},{"target":"共同","en":"group","zh":"共同"},{"target":"個別","en":"individual","zh":"个人"},{"target":"補習","en":"remedial","zh":"补习"},
  {"target":"実践的な","en":"practical","zh":"实践的"},{"target":"基本的な","en":"basic","zh":"基础的"},{"target":"専門的な","en":"specialized","zh":"专业的"},{"target":"新しい","en":"new","zh":"新的"},{"target":"難しい","en":"difficult","zh":"困难的"}
]'::jsonb, '[
  {"target":"授業","en":"class","zh":"课程"},{"target":"課題","en":"assignment","zh":"作业"},{"target":"試験","en":"exam","zh":"考试"},{"target":"発表","en":"presentation","zh":"发表"},{"target":"研究","en":"research","zh":"研究"},
  {"target":"講義","en":"lecture","zh":"讲课"},{"target":"成績","en":"grade","zh":"成绩"},{"target":"出席","en":"attendance","zh":"出勤"},{"target":"教材","en":"materials","zh":"教材"},{"target":"質問","en":"question","zh":"问题"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-school-intermediate', 'ko', 'intermediate', 'school', ' ', '[
  {"target":"필수","en":"required","zh":"必修"},{"target":"선택","en":"elective","zh":"选修"},{"target":"온라인","en":"online","zh":"线上"},{"target":"대면","en":"in-person","zh":"面对面"},{"target":"정기","en":"regular","zh":"定期"},
  {"target":"기말","en":"final","zh":"期末"},{"target":"중간","en":"midterm","zh":"期中"},{"target":"공동","en":"group","zh":"共同"},{"target":"개별","en":"individual","zh":"个人"},{"target":"보충","en":"remedial","zh":"补习"},
  {"target":"실용적인","en":"practical","zh":"实践的"},{"target":"기본적인","en":"basic","zh":"基础的"},{"target":"전문적인","en":"specialized","zh":"专业的"},{"target":"새로운","en":"new","zh":"新的"},{"target":"어려운","en":"difficult","zh":"困难的"}
]'::jsonb, '[
  {"target":"수업","en":"class","zh":"课程"},{"target":"과제","en":"assignment","zh":"作业"},{"target":"시험","en":"exam","zh":"考试"},{"target":"발표","en":"presentation","zh":"发表"},{"target":"연구","en":"research","zh":"研究"},
  {"target":"강의","en":"lecture","zh":"讲课"},{"target":"성적","en":"grade","zh":"成绩"},{"target":"출석","en":"attendance","zh":"出勤"},{"target":"교재","en":"materials","zh":"教材"},{"target":"질문","en":"question","zh":"问题"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-anime-intermediate', 'ja', 'intermediate', 'anime/drama', '', '[
  {"target":"新作","en":"new","zh":"新作"},{"target":"人気","en":"popular","zh":"受欢迎的"},{"target":"感動的な","en":"moving","zh":"感人的"},{"target":"意外な","en":"unexpected","zh":"意外的"},{"target":"印象的な","en":"impressive","zh":"印象深刻的"},
  {"target":"日常系","en":"slice-of-life","zh":"日常系"},{"target":"青春","en":"youth","zh":"青春"},{"target":"歴史","en":"historical","zh":"历史"},{"target":"恋愛","en":"romance","zh":"恋爱"},{"target":"推理","en":"mystery","zh":"推理"},
  {"target":"短編","en":"short","zh":"短篇"},{"target":"長編","en":"long","zh":"长篇"},{"target":"実写","en":"live-action","zh":"真人"},{"target":"原作","en":"original work","zh":"原作"},{"target":"劇場版","en":"movie version","zh":"剧场版"}
]'::jsonb, '[
  {"target":"作品","en":"work","zh":"作品"},{"target":"場面","en":"scene","zh":"场景"},{"target":"台詞","en":"line","zh":"台词"},{"target":"主人公","en":"protagonist","zh":"主人公"},{"target":"声優","en":"voice actor","zh":"声优"},
  {"target":"脚本","en":"script","zh":"剧本"},{"target":"演出","en":"direction","zh":"演出"},{"target":"展開","en":"development","zh":"发展"},{"target":"結末","en":"ending","zh":"结局"},{"target":"主題歌","en":"theme song","zh":"主题曲"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-drama-intermediate', 'ko', 'intermediate', 'anime/drama', ' ', '[
  {"target":"신작","en":"new","zh":"新作"},{"target":"인기","en":"popular","zh":"受欢迎的"},{"target":"감동적인","en":"moving","zh":"感人的"},{"target":"뜻밖의","en":"unexpected","zh":"意外的"},{"target":"인상적인","en":"impressive","zh":"印象深刻的"},
  {"target":"일상","en":"slice-of-life","zh":"日常系"},{"target":"청춘","en":"youth","zh":"青春"},{"target":"역사","en":"historical","zh":"历史"},{"target":"로맨스","en":"romance","zh":"恋爱"},{"target":"추리","en":"mystery","zh":"推理"},
  {"target":"단편","en":"short","zh":"短篇"},{"target":"장편","en":"long","zh":"长篇"},{"target":"실사","en":"live-action","zh":"真人"},{"target":"원작","en":"original work","zh":"原作"},{"target":"극장판","en":"movie version","zh":"剧场版"}
]'::jsonb, '[
  {"target":"작품","en":"work","zh":"作品"},{"target":"장면","en":"scene","zh":"场景"},{"target":"대사","en":"line","zh":"台词"},{"target":"주인공","en":"protagonist","zh":"主人公"},{"target":"성우","en":"voice actor","zh":"声优"},
  {"target":"대본","en":"script","zh":"剧本"},{"target":"연출","en":"direction","zh":"演出"},{"target":"전개","en":"development","zh":"发展"},{"target":"결말","en":"ending","zh":"结局"},{"target":"주제가","en":"theme song","zh":"主题曲"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ja-jlpt-advanced', 'ja', 'advanced', 'JLPT', '', '[
  {"target":"社会的","en":"social","zh":"社会的"},{"target":"経済的","en":"economic","zh":"经济的"},{"target":"政治的","en":"political","zh":"政治的"},{"target":"文化的","en":"cultural","zh":"文化的"},{"target":"心理的","en":"psychological","zh":"心理的"},
  {"target":"技術的","en":"technical","zh":"技术的"},{"target":"長期的","en":"long-term","zh":"长期的"},{"target":"短期的","en":"short-term","zh":"短期的"},{"target":"相対的","en":"relative","zh":"相对的"},{"target":"客観的","en":"objective","zh":"客观的"},
  {"target":"主観的","en":"subjective","zh":"主观的"},{"target":"具体的","en":"concrete","zh":"具体的"},{"target":"抽象的","en":"abstract","zh":"抽象的"},{"target":"根本的","en":"fundamental","zh":"根本的"},{"target":"例外的","en":"exceptional","zh":"例外的"}
]'::jsonb, '[
  {"target":"要因","en":"factor","zh":"因素"},{"target":"影響","en":"influence","zh":"影响"},{"target":"課題","en":"challenge","zh":"课题"},{"target":"傾向","en":"tendency","zh":"倾向"},{"target":"構造","en":"structure","zh":"结构"},
  {"target":"意義","en":"significance","zh":"意义"},{"target":"矛盾","en":"contradiction","zh":"矛盾"},{"target":"前提","en":"premise","zh":"前提"},{"target":"仮説","en":"hypothesis","zh":"假说"},{"target":"概念","en":"concept","zh":"概念"}
]'::jsonb);

select public.backfill_vocabulary_bucket_to_150('ko-topik-advanced', 'ko', 'advanced', 'TOPIK', ' ', '[
  {"target":"사회적","en":"social","zh":"社会的"},{"target":"경제적","en":"economic","zh":"经济的"},{"target":"정치적","en":"political","zh":"政治的"},{"target":"문화적","en":"cultural","zh":"文化的"},{"target":"심리적","en":"psychological","zh":"心理的"},
  {"target":"기술적","en":"technical","zh":"技术的"},{"target":"장기적","en":"long-term","zh":"长期的"},{"target":"단기적","en":"short-term","zh":"短期的"},{"target":"상대적","en":"relative","zh":"相对的"},{"target":"객관적","en":"objective","zh":"客观的"},
  {"target":"주관적","en":"subjective","zh":"主观的"},{"target":"구체적","en":"concrete","zh":"具体的"},{"target":"추상적","en":"abstract","zh":"抽象的"},{"target":"근본적","en":"fundamental","zh":"根本的"},{"target":"예외적","en":"exceptional","zh":"例外的"}
]'::jsonb, '[
  {"target":"요인","en":"factor","zh":"因素"},{"target":"영향","en":"influence","zh":"影响"},{"target":"과제","en":"challenge","zh":"课题"},{"target":"경향","en":"tendency","zh":"倾向"},{"target":"구조","en":"structure","zh":"结构"},
  {"target":"의의","en":"significance","zh":"意义"},{"target":"모순","en":"contradiction","zh":"矛盾"},{"target":"전제","en":"premise","zh":"前提"},{"target":"가설","en":"hypothesis","zh":"假说"},{"target":"개념","en":"concept","zh":"概念"}
]'::jsonb);

drop function public.backfill_vocabulary_bucket_to_150(text, text, text, text, text, jsonb, jsonb);
