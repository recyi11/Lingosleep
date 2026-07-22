update public.vocabulary as vocabulary
set meaning_zh_cn = data.meaning_zh_cn,
    updated_at = now()
from (values
  ('ja-food-basic-1', '饭'),
  ('ko-food-basic-1', '米饭'),
  ('ja-verbs-basic-6', '听'),
  ('ja-verbs-basic-11', '回来'),
  ('ko-verbs-basic-11', '回来'),
  ('ja-school-intermediate-1', '作业'),
  ('ko-school-intermediate-1', '作业'),
  ('ja-anime-intermediate-3', '发展'),
  ('ko-drama-intermediate-3', '发展'),
  ('ja-food-intermediate-1', '点餐'),
  ('ko-food-intermediate-1', '点餐'),
  ('ja-school-intermediate-5', '发表'),
  ('ko-school-intermediate-5', '发表'),
  ('ja-life-intermediate-2', '约定'),
  ('ko-life-intermediate-2', '约定'),
  ('ja-school-intermediate-6', '讲课'),
  ('ko-school-intermediate-6', '讲课'),
  ('ja-jlpt-advanced-1', '抱歉'),
  ('ja-jlpt-advanced-2', '模糊'),
  ('ko-topik-advanced-2', '模糊'),
  ('ja-jlpt-advanced-3', '催促'),
  ('ko-topik-advanced-3', '敦促')
) as data(id, meaning_zh_cn)
where vocabulary.id = data.id;
