alter table public.vocabulary
  drop constraint if exists vocabulary_target_language_check,
  add constraint vocabulary_target_language_check check (target_language in ('ja', 'ko', 'en'));

alter table public.sessions
  drop constraint if exists sessions_target_language_check,
  add constraint sessions_target_language_check check (target_language in ('ja', 'ko', 'en'));

alter table public.user_preferences
  drop constraint if exists user_preferences_target_language_check,
  add constraint user_preferences_target_language_check check (target_language in ('ja', 'ko', 'en'));
