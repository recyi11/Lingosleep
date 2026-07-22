-- ponytail: generated N3-N2-style phrase refresh for intermediate backfill rows; replace with curated imports when course quality matters.
create or replace function public.revise_vocabulary_bucket_range(
  p_prefix text,
  p_target_language text,
  p_level text,
  p_topic text,
  p_start_index integer,
  p_target_separator text,
  p_modifiers jsonb,
  p_heads jsonb
)
returns void
language plpgsql
as $$
declare
  current_index integer := p_start_index - 1;
  modifier text;
  head text;
  target_text text;
  meaning_en text;
  meaning_zh_cn text;
begin
  for modifier in select value::text from jsonb_array_elements(p_modifiers) loop
    for head in select value::text from jsonb_array_elements(p_heads) loop
      exit when current_index >= 150;
      current_index := current_index + 1;
      target_text := jsonb_extract_path_text(modifier::jsonb, 'target') || p_target_separator || jsonb_extract_path_text(head::jsonb, 'target');
      meaning_en := jsonb_extract_path_text(modifier::jsonb, 'en') || ' ' || jsonb_extract_path_text(head::jsonb, 'en');
      meaning_zh_cn := jsonb_extract_path_text(modifier::jsonb, 'zh') || jsonb_extract_path_text(head::jsonb, 'zh');

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
        p_prefix || '-' || current_index,
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

select public.revise_vocabulary_bucket_range('ja-food-intermediate', 'ja', 'intermediate', 'food', 17, '', '[
  {"target":"発酵","en":"fermented","zh":"发酵"},{"target":"無添加","en":"additive-free","zh":"无添加"},{"target":"栄養豊富な","en":"nutrient-rich","zh":"营养丰富的"},{"target":"低温調理の","en":"low-temperature cooked","zh":"低温烹调的"},{"target":"季節限定の","en":"seasonal limited","zh":"季节限定的"},
  {"target":"地域特有の","en":"region-specific","zh":"地区特有的"},{"target":"保存用の","en":"preservation","zh":"保存用的"},{"target":"加工済みの","en":"processed","zh":"加工过的"},{"target":"伝統的な","en":"traditional","zh":"传统的"},{"target":"高級","en":"premium","zh":"高级"},
  {"target":"業務用の","en":"commercial-use","zh":"商用的"},{"target":"減塩","en":"reduced-salt","zh":"减盐"},{"target":"濃厚な","en":"rich","zh":"浓厚的"},{"target":"香ばしい","en":"aromatic","zh":"香浓的"},{"target":"持続可能な","en":"sustainable","zh":"可持续的"}
]'::jsonb, '[
  {"target":"食材","en":"ingredients","zh":"食材"},{"target":"調味料","en":"seasoning","zh":"调味料"},{"target":"献立","en":"menu plan","zh":"菜单规划"},{"target":"加工食品","en":"processed food","zh":"加工食品"},{"target":"保存方法","en":"preservation method","zh":"保存方法"},
  {"target":"栄養管理","en":"nutrition management","zh":"营养管理"},{"target":"食文化","en":"food culture","zh":"饮食文化"},{"target":"調理法","en":"cooking method","zh":"烹调方法"},{"target":"食感","en":"texture","zh":"口感"},{"target":"風味","en":"flavor","zh":"风味"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ko-food-intermediate', 'ko', 'intermediate', 'food', 17, ' ', '[
  {"target":"발효","en":"fermented","zh":"发酵"},{"target":"무첨가","en":"additive-free","zh":"无添加"},{"target":"영양이 풍부한","en":"nutrient-rich","zh":"营养丰富的"},{"target":"저온 조리","en":"low-temperature cooked","zh":"低温烹调的"},{"target":"제철 한정","en":"seasonal limited","zh":"季节限定的"},
  {"target":"지역 특유의","en":"region-specific","zh":"地区特有的"},{"target":"보존용","en":"preservation","zh":"保存用的"},{"target":"가공된","en":"processed","zh":"加工过的"},{"target":"전통적인","en":"traditional","zh":"传统的"},{"target":"고급","en":"premium","zh":"高级"},
  {"target":"업소용","en":"commercial-use","zh":"商用的"},{"target":"저염","en":"reduced-salt","zh":"减盐"},{"target":"진한","en":"rich","zh":"浓厚的"},{"target":"고소한","en":"aromatic","zh":"香浓的"},{"target":"지속 가능한","en":"sustainable","zh":"可持续的"}
]'::jsonb, '[
  {"target":"식재료","en":"ingredients","zh":"食材"},{"target":"조미료","en":"seasoning","zh":"调味料"},{"target":"식단","en":"menu plan","zh":"菜单规划"},{"target":"가공식품","en":"processed food","zh":"加工食品"},{"target":"보존 방법","en":"preservation method","zh":"保存方法"},
  {"target":"영양 관리","en":"nutrition management","zh":"营养管理"},{"target":"음식 문화","en":"food culture","zh":"饮食文化"},{"target":"조리법","en":"cooking method","zh":"烹调方法"},{"target":"식감","en":"texture","zh":"口感"},{"target":"풍미","en":"flavor","zh":"风味"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ja-travel-intermediate', 'ja', 'intermediate', 'travel', 17, '', '[
  {"target":"国際","en":"international","zh":"国际"},{"target":"国内","en":"domestic","zh":"国内"},{"target":"片道","en":"one-way","zh":"单程"},{"target":"往復","en":"round-trip","zh":"往返"},{"target":"直行","en":"direct","zh":"直达"},
  {"target":"乗継","en":"connecting","zh":"转乘"},{"target":"深夜","en":"late-night","zh":"深夜"},{"target":"早朝","en":"early-morning","zh":"清晨"},{"target":"長距離","en":"long-distance","zh":"长途"},{"target":"格安","en":"budget","zh":"廉价"},
  {"target":"予約済み","en":"reserved","zh":"已预订"},{"target":"臨時","en":"temporary","zh":"临时"},{"target":"現地","en":"local","zh":"当地"},{"target":"団体","en":"group","zh":"团体"},{"target":"個人","en":"individual","zh":"个人"}
]'::jsonb, '[
  {"target":"便","en":"service","zh":"班次"},{"target":"路線","en":"route","zh":"路线"},{"target":"手続き","en":"procedure","zh":"手续"},{"target":"乗車券","en":"boarding ticket","zh":"乘车券"},{"target":"宿泊先","en":"accommodation","zh":"住宿地"},
  {"target":"案内所","en":"information desk","zh":"问讯处"},{"target":"時刻表","en":"timetable","zh":"时刻表"},{"target":"交通機関","en":"transportation system","zh":"交通机构"},{"target":"滞在許可","en":"stay permit","zh":"停留许可"},{"target":"旅行保険","en":"travel insurance","zh":"旅行保险"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ko-travel-intermediate', 'ko', 'intermediate', 'travel', 17, ' ', '[
  {"target":"국제","en":"international","zh":"国际"},{"target":"국내","en":"domestic","zh":"国内"},{"target":"편도","en":"one-way","zh":"单程"},{"target":"왕복","en":"round-trip","zh":"往返"},{"target":"직행","en":"direct","zh":"直达"},
  {"target":"환승","en":"connecting","zh":"转乘"},{"target":"심야","en":"late-night","zh":"深夜"},{"target":"이른 아침","en":"early-morning","zh":"清晨"},{"target":"장거리","en":"long-distance","zh":"长途"},{"target":"저가","en":"budget","zh":"廉价"},
  {"target":"예약된","en":"reserved","zh":"已预订"},{"target":"임시","en":"temporary","zh":"临时"},{"target":"현지","en":"local","zh":"当地"},{"target":"단체","en":"group","zh":"团体"},{"target":"개인","en":"individual","zh":"个人"}
]'::jsonb, '[
  {"target":"편","en":"service","zh":"班次"},{"target":"노선","en":"route","zh":"路线"},{"target":"절차","en":"procedure","zh":"手续"},{"target":"승차권","en":"boarding ticket","zh":"乘车券"},{"target":"숙박지","en":"accommodation","zh":"住宿地"},
  {"target":"안내소","en":"information desk","zh":"问讯处"},{"target":"시간표","en":"timetable","zh":"时刻表"},{"target":"교통 기관","en":"transportation system","zh":"交通机构"},{"target":"체류 허가","en":"stay permit","zh":"停留许可"},{"target":"여행 보험","en":"travel insurance","zh":"旅行保险"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ja-life-intermediate', 'ja', 'intermediate', 'daily life', 17, '', '[
  {"target":"定期的な","en":"regular","zh":"定期的"},{"target":"予定外の","en":"unexpected","zh":"计划外的"},{"target":"必要な","en":"necessary","zh":"必要的"},{"target":"公式な","en":"official","zh":"正式的"},{"target":"個人的な","en":"personal","zh":"个人的"},
  {"target":"家庭内の","en":"household","zh":"家庭内的"},{"target":"近隣の","en":"neighborhood","zh":"附近的"},{"target":"将来的な","en":"future","zh":"未来的"},{"target":"現実的な","en":"realistic","zh":"现实的"},{"target":"効率的な","en":"efficient","zh":"高效的"},
  {"target":"優先的な","en":"priority","zh":"优先的"},{"target":"暫定的な","en":"provisional","zh":"暂定的"},{"target":"継続的な","en":"continuous","zh":"持续的"},{"target":"具体的な","en":"specific","zh":"具体的"},{"target":"複雑な","en":"complex","zh":"复杂的"}
]'::jsonb, '[
  {"target":"契約","en":"contract","zh":"合同"},{"target":"手続き","en":"procedure","zh":"手续"},{"target":"申請","en":"application","zh":"申请"},{"target":"更新","en":"renewal","zh":"更新"},{"target":"支払い","en":"payment","zh":"支付"},
  {"target":"管理","en":"management","zh":"管理"},{"target":"調整","en":"adjustment","zh":"调整"},{"target":"相談","en":"consultation","zh":"商量"},{"target":"確認","en":"confirmation","zh":"确认"},{"target":"変更","en":"change","zh":"变更"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ko-life-intermediate', 'ko', 'intermediate', 'daily life', 17, ' ', '[
  {"target":"정기적인","en":"regular","zh":"定期的"},{"target":"예상 밖의","en":"unexpected","zh":"计划外的"},{"target":"필요한","en":"necessary","zh":"必要的"},{"target":"공식적인","en":"official","zh":"正式的"},{"target":"개인적인","en":"personal","zh":"个人的"},
  {"target":"가정 내","en":"household","zh":"家庭内的"},{"target":"인근","en":"neighborhood","zh":"附近的"},{"target":"미래의","en":"future","zh":"未来的"},{"target":"현실적인","en":"realistic","zh":"现实的"},{"target":"효율적인","en":"efficient","zh":"高效的"},
  {"target":"우선적인","en":"priority","zh":"优先的"},{"target":"잠정적인","en":"provisional","zh":"暂定的"},{"target":"지속적인","en":"continuous","zh":"持续的"},{"target":"구체적인","en":"specific","zh":"具体的"},{"target":"복잡한","en":"complex","zh":"复杂的"}
]'::jsonb, '[
  {"target":"계약","en":"contract","zh":"合同"},{"target":"절차","en":"procedure","zh":"手续"},{"target":"신청","en":"application","zh":"申请"},{"target":"갱신","en":"renewal","zh":"更新"},{"target":"결제","en":"payment","zh":"支付"},
  {"target":"관리","en":"management","zh":"管理"},{"target":"조정","en":"adjustment","zh":"调整"},{"target":"상담","en":"consultation","zh":"商量"},{"target":"확인","en":"confirmation","zh":"确认"},{"target":"변경","en":"change","zh":"变更"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ja-work-intermediate', 'ja', 'intermediate', 'work', 22, '', '[
  {"target":"社内","en":"internal","zh":"公司内部"},{"target":"社外","en":"external","zh":"公司外部"},{"target":"定例","en":"regular","zh":"例行"},{"target":"緊急","en":"urgent","zh":"紧急"},{"target":"暫定","en":"provisional","zh":"暂定"},
  {"target":"最終","en":"final","zh":"最终"},{"target":"共同","en":"joint","zh":"共同"},{"target":"詳細な","en":"detailed","zh":"详细的"},{"target":"正式な","en":"formal","zh":"正式的"},{"target":"追加","en":"additional","zh":"追加"},
  {"target":"修正","en":"revised","zh":"修正"},{"target":"優先","en":"priority","zh":"优先"},{"target":"予算","en":"budget","zh":"预算"},{"target":"契約上の","en":"contractual","zh":"合同上的"},{"target":"部門間","en":"interdepartmental","zh":"部门间"}
]'::jsonb, '[
  {"target":"業務","en":"operations","zh":"业务"},{"target":"進捗","en":"progress","zh":"进展"},{"target":"企画","en":"planning","zh":"企划"},{"target":"契約","en":"contract","zh":"合同"},{"target":"見積","en":"estimate","zh":"报价"},
  {"target":"承認","en":"approval","zh":"批准"},{"target":"共有","en":"sharing","zh":"共享"},{"target":"調整","en":"coordination","zh":"协调"},{"target":"報告","en":"report","zh":"报告"},{"target":"仕様","en":"specification","zh":"规格"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ko-work-intermediate', 'ko', 'intermediate', 'work', 22, ' ', '[
  {"target":"사내","en":"internal","zh":"公司内部"},{"target":"사외","en":"external","zh":"公司外部"},{"target":"정례","en":"regular","zh":"例行"},{"target":"긴급","en":"urgent","zh":"紧急"},{"target":"잠정","en":"provisional","zh":"暂定"},
  {"target":"최종","en":"final","zh":"最终"},{"target":"공동","en":"joint","zh":"共同"},{"target":"상세한","en":"detailed","zh":"详细的"},{"target":"공식적인","en":"formal","zh":"正式的"},{"target":"추가","en":"additional","zh":"追加"},
  {"target":"수정","en":"revised","zh":"修正"},{"target":"우선","en":"priority","zh":"优先"},{"target":"예산","en":"budget","zh":"预算"},{"target":"계약상","en":"contractual","zh":"合同上的"},{"target":"부서 간","en":"interdepartmental","zh":"部门间"}
]'::jsonb, '[
  {"target":"업무","en":"operations","zh":"业务"},{"target":"진행","en":"progress","zh":"进展"},{"target":"기획","en":"planning","zh":"企划"},{"target":"계약","en":"contract","zh":"合同"},{"target":"견적","en":"estimate","zh":"报价"},
  {"target":"승인","en":"approval","zh":"批准"},{"target":"공유","en":"sharing","zh":"共享"},{"target":"조정","en":"coordination","zh":"协调"},{"target":"보고","en":"report","zh":"报告"},{"target":"사양","en":"specification","zh":"规格"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ja-school-intermediate', 'ja', 'intermediate', 'school', 22, '', '[
  {"target":"必修","en":"required","zh":"必修"},{"target":"選択","en":"elective","zh":"选修"},{"target":"専門","en":"specialized","zh":"专业"},{"target":"応用","en":"applied","zh":"应用"},{"target":"実践","en":"practical","zh":"实践"},
  {"target":"共同","en":"joint","zh":"共同"},{"target":"個別","en":"individual","zh":"个人"},{"target":"期末","en":"final-term","zh":"期末"},{"target":"中間","en":"midterm","zh":"期中"},{"target":"口頭","en":"oral","zh":"口头"},
  {"target":"書面","en":"written","zh":"书面"},{"target":"定量的な","en":"quantitative","zh":"定量的"},{"target":"定性的な","en":"qualitative","zh":"定性的"},{"target":"体系的な","en":"systematic","zh":"系统的"},{"target":"補足","en":"supplementary","zh":"补充"}
]'::jsonb, '[
  {"target":"履修","en":"course registration","zh":"选课"},{"target":"単位","en":"credit","zh":"学分"},{"target":"講義","en":"lecture","zh":"讲课"},{"target":"研究","en":"research","zh":"研究"},{"target":"調査","en":"investigation","zh":"调查"},
  {"target":"論文","en":"paper","zh":"论文"},{"target":"発表","en":"presentation","zh":"发表"},{"target":"考察","en":"analysis","zh":"考察"},{"target":"評価","en":"evaluation","zh":"评价"},{"target":"指導","en":"guidance","zh":"指导"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ko-school-intermediate', 'ko', 'intermediate', 'school', 22, ' ', '[
  {"target":"필수","en":"required","zh":"必修"},{"target":"선택","en":"elective","zh":"选修"},{"target":"전문","en":"specialized","zh":"专业"},{"target":"응용","en":"applied","zh":"应用"},{"target":"실습","en":"practical","zh":"实践"},
  {"target":"공동","en":"joint","zh":"共同"},{"target":"개별","en":"individual","zh":"个人"},{"target":"기말","en":"final-term","zh":"期末"},{"target":"중간","en":"midterm","zh":"期中"},{"target":"구두","en":"oral","zh":"口头"},
  {"target":"서면","en":"written","zh":"书面"},{"target":"정량적","en":"quantitative","zh":"定量的"},{"target":"정성적","en":"qualitative","zh":"定性的"},{"target":"체계적인","en":"systematic","zh":"系统的"},{"target":"보충","en":"supplementary","zh":"补充"}
]'::jsonb, '[
  {"target":"수강","en":"course taking","zh":"选课"},{"target":"학점","en":"credit","zh":"学分"},{"target":"강의","en":"lecture","zh":"讲课"},{"target":"연구","en":"research","zh":"研究"},{"target":"조사","en":"investigation","zh":"调查"},
  {"target":"논문","en":"paper","zh":"论文"},{"target":"발표","en":"presentation","zh":"发表"},{"target":"고찰","en":"analysis","zh":"考察"},{"target":"평가","en":"evaluation","zh":"评价"},{"target":"지도","en":"guidance","zh":"指导"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ja-anime-intermediate', 'ja', 'intermediate', 'anime/drama', 17, '', '[
  {"target":"伏線","en":"foreshadowing","zh":"伏笔"},{"target":"群像","en":"ensemble","zh":"群像"},{"target":"叙述","en":"narrative","zh":"叙述"},{"target":"心理","en":"psychological","zh":"心理"},{"target":"象徴","en":"symbolic","zh":"象征"},
  {"target":"時系列","en":"chronological","zh":"时间线"},{"target":"視点","en":"viewpoint","zh":"视角"},{"target":"演出的","en":"directional","zh":"演出上的"},{"target":"原作","en":"source-material","zh":"原作"},{"target":"脚本上の","en":"script-level","zh":"剧本上的"},
  {"target":"物語上の","en":"story-level","zh":"故事上的"},{"target":"作品内の","en":"in-work","zh":"作品内的"},{"target":"終盤","en":"final-act","zh":"后段"},{"target":"序盤","en":"opening-act","zh":"开端"},{"target":"中盤","en":"middle-act","zh":"中段"}
]'::jsonb, '[
  {"target":"展開","en":"development","zh":"发展"},{"target":"描写","en":"depiction","zh":"描写"},{"target":"演出","en":"direction","zh":"演出"},{"target":"構成","en":"structure","zh":"结构"},{"target":"解釈","en":"interpretation","zh":"解读"},
  {"target":"対比","en":"contrast","zh":"对比"},{"target":"余韻","en":"aftertaste","zh":"余韵"},{"target":"伏線回収","en":"payoff","zh":"伏笔回收"},{"target":"人物像","en":"characterization","zh":"人物形象"},{"target":"主題","en":"theme","zh":"主题"}
]'::jsonb);

select public.revise_vocabulary_bucket_range('ko-drama-intermediate', 'ko', 'intermediate', 'anime/drama', 17, ' ', '[
  {"target":"복선","en":"foreshadowing","zh":"伏笔"},{"target":"군상","en":"ensemble","zh":"群像"},{"target":"서술","en":"narrative","zh":"叙述"},{"target":"심리","en":"psychological","zh":"心理"},{"target":"상징","en":"symbolic","zh":"象征"},
  {"target":"시간순","en":"chronological","zh":"时间线"},{"target":"시점","en":"viewpoint","zh":"视角"},{"target":"연출상","en":"directional","zh":"演出上的"},{"target":"원작","en":"source-material","zh":"原作"},{"target":"각본상","en":"script-level","zh":"剧本上的"},
  {"target":"서사상","en":"story-level","zh":"故事上的"},{"target":"작품 내","en":"in-work","zh":"作品内的"},{"target":"후반","en":"final-act","zh":"后段"},{"target":"초반","en":"opening-act","zh":"开端"},{"target":"중반","en":"middle-act","zh":"中段"}
]'::jsonb, '[
  {"target":"전개","en":"development","zh":"发展"},{"target":"묘사","en":"depiction","zh":"描写"},{"target":"연출","en":"direction","zh":"演出"},{"target":"구성","en":"structure","zh":"结构"},{"target":"해석","en":"interpretation","zh":"解读"},
  {"target":"대비","en":"contrast","zh":"对比"},{"target":"여운","en":"aftertaste","zh":"余韵"},{"target":"복선 회수","en":"payoff","zh":"伏笔回收"},{"target":"인물상","en":"characterization","zh":"人物形象"},{"target":"주제","en":"theme","zh":"主题"}
]'::jsonb);

drop function public.revise_vocabulary_bucket_range(text, text, text, text, integer, text, jsonb, jsonb);
