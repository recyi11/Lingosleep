create or replace function public.lingosleep_expand_meaning_en(value text)
returns text
language sql
immutable
as $$
  select case
    when value ~ '[,;/]' then value
    when lower(value) = 'station' then value || ', stop'
    when lower(value) = 'sleep' then value || ', rest'
    when lower(value) = 'seven' then value || ', 7'
    when lower(value) = 'see' then value || ', look'
    when lower(value) = 'water' then value || ', drinking water'
    when lower(value) = 'ticket' then value || ', pass'
    when lower(value) = 'wake' then value || ', wake up'
    when lower(value) = 'hundred' then value || ', 100'
    when lower(value) = 'go' then value || ', leave'
    when lower(value) = 'tea' then value || ', tea drink'
    when lower(value) = 'friend' then value || ', companion'
    when lower(value) = 'hospital' then value || ', clinic'
    when lower(value) = 'buy' then value || ', purchase'
    when lower(value) = 'bread' then value || ', loaf'
    when lower(value) = 'milk' then value || ', dairy milk'
    when lower(value) = 'vegetables' then value || ', veggies'
    when lower(value) = 'airport' then value || ', air terminal'
    when lower(value) = 'road' then value || ', street'
    when lower(value) = 'map' then value || ', route map'
    when lower(value) = 'home' then value || ', house'
    when lower(value) = 'phone' then value || ', telephone'
    when lower(value) = 'weather' then value || ', climate'
    when lower(value) = 'thousand' then value || ', 1,000'
    when lower(value) = 'half' then value || ', one half'
    when lower(value) = 'wait' then value || ', stay'
    when lower(value) = 'speak' then value || ', talk'
    when lower(value) = 'listen' then value || ', hear'
    when lower(value) = 'spicy' then value || ', hot'
    when lower(value) = 'remarkable' then value || ', significant'
    when lower(value) = 'significant' then value || ', important'
    when lower(value) = 'schedule' then value || ', timetable'
    when lower(value) = 'method' then value || ', approach'
    when lower(value) = 'theory' then value || ', framework'
    when lower(value) = 'reality' then value || ', actual state'
    when lower(value) = 'recognition' then value || ', awareness'
    when lower(value) = 'judgment' then value || ', decision'
    when lower(value) = 'choice' then value || ', selection'
    when lower(value) = 'expansion' then value || ', growth'
    when lower(value) = 'reduction' then value || ', decrease'
    when lower(value) = 'stability' then value || ', steadiness'
    when lower(value) = 'demand' then value || ', need'
    when lower(value) = 'supply' then value || ', provision'
    when lower(value) = 'resource' then value || ', asset'
    when lower(value) = 'environment' then value || ', surroundings'
    when lower(value) = 'institution' then value || ', system'
    when lower(value) = 'law' then value || ', regulation'
    when lower(value) = 'exchange' then value || ', interchange'
    when lower(value) = 'cooperation' then value || ', collaboration'
    when lower(value) = 'competition' then value || ', rivalry'
    when lower(value) = 'realization' then value || ', achievement'
    when lower(value) = 'application' then value || ', use'
    when lower(value) = 'limit' then value || ', boundary'
    when lower(value) = 'outlook' then value || ', prospect'
    when lower(value) like 'new %' then value || ', fresh ' || substring(value from 5)
    when lower(value) like 'small %' then value || ', little ' || substring(value from 7)
    when lower(value) like 'large %' then value || ', big ' || substring(value from 7)
    when lower(value) like 'simple %' then value || ', easy ' || substring(value from 8)
    when lower(value) like 'favorite %' then value || ', preferred ' || substring(value from 10)
    else value || ', related ' || value
  end
$$;

create or replace function public.lingosleep_expand_meaning_zh_cn(value text)
returns text
language sql
immutable
as $$
  select case
    when value ~ '[，,、；;]' then value
    when value = '车站' then value || '，站点'
    when value = '睡觉' then value || '，睡眠'
    when value = '七' then value || '，数字七'
    when value = '看' then value || '，看见'
    when value = '水' then value || '，饮用水'
    when value = '票' then value || '，车票'
    when value = '起床' then value || '，醒来'
    when value = '百' then value || '，一百'
    when value = '去' then value || '，前往'
    when value = '茶' then value || '，茶水'
    when value = '朋友' then value || '，好友'
    when value = '医院' then value || '，诊所'
    when value = '买' then value || '，购买'
    when value = '面包' then value || '，面包食品'
    when value = '牛奶' then value || '，奶'
    when value = '蔬菜' then value || '，青菜'
    when value = '机场' then value || '，航空站'
    when value = '路' then value || '，道路'
    when value = '地图' then value || '，路线图'
    when value = '家' then value || '，住所'
    when value = '电话' then value || '，手机'
    when value = '天气' then value || '，气候'
    when value = '千' then value || '，一千'
    when value = '一半' then value || '，半数'
    when value = '等' then value || '，等待'
    when value = '说话' then value || '，讲话'
    when value = '听' then value || '，听见'
    when value = '辣的' then value || '，辛辣的'
    when value = '显著' then value || '，明显'
    when value = '显著的' then value || '，明显的'
    when value = '日程' then value || '，安排'
    when value = '手段' then value || '，方法'
    when value = '理论' then value || '，学说'
    when value = '实态' then value || '，实际情况'
    when value = '认识' then value || '，认知'
    when value = '判断' then value || '，判定'
    when value = '扩大' then value || '，扩展'
    when value = '缩小' then value || '，减少'
    when value = '稳定' then value || '，平稳'
    when value = '需求' then value || '，需要'
    when value = '供给' then value || '，供应'
    when value = '资源' then value || '，资产'
    when value = '环境' then value || '，周围环境'
    when value = '制度' then value || '，体制'
    when value = '法律' then value || '，法规'
    when value = '权利' then value || '，权益'
    when value = '交流' then value || '，沟通'
    when value = '合作' then value || '，协作'
    when value = '竞争' then value || '，竞赛'
    when value = '实现' then value || '，达成'
    when value = '应用' then value || '，使用'
    when value = '界限' then value || '，边界'
    when value = '展望' then value || '，前景'
    when value like '新的%' then value || '，新' || substring(value from 3)
    when value like '小份%' then value || '，小的' || substring(value from 3)
    when value like '大份%' then value || '，大的' || substring(value from 3)
    when value like '简单的%' then value || '，容易的' || substring(value from 4)
    else value || '，相关' || value
  end
$$;

update public.vocabulary
set
  meaning_en = public.lingosleep_expand_meaning_en(meaning_en),
  meaning_zh_cn = public.lingosleep_expand_meaning_zh_cn(coalesce(meaning_zh_cn, meaning_en));

drop function public.lingosleep_expand_meaning_en(text);
drop function public.lingosleep_expand_meaning_zh_cn(text);
