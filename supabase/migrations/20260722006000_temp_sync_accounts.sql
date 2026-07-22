create table if not exists public.temp_accounts (
  account_key text primary key check (account_key ~ '^[0-9a-f]{64}$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days',
  check (pg_column_size(payload) < 1048576)
);

alter table public.temp_accounts enable row level security;

create or replace function public.create_temp_account(account_key_input text, payload_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if account_key_input !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid sync code' using errcode = '22023';
  end if;

  insert into public.temp_accounts (account_key, payload)
  values (account_key_input, coalesce(payload_input, '{}'::jsonb));

  return jsonb_build_object('updated_at', now());
end;
$$;

create or replace function public.get_temp_account(account_key_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_payload jsonb;
begin
  select payload into stored_payload
  from public.temp_accounts
  where account_key = account_key_input
    and expires_at > now();

  if stored_payload is null then
    raise exception 'Sync account not found' using errcode = 'P0002';
  end if;

  return stored_payload;
end;
$$;

create or replace function public.save_temp_account(account_key_input text, payload_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.temp_accounts
  set
    payload = coalesce(payload_input, '{}'::jsonb),
    updated_at = now(),
    expires_at = now() + interval '180 days'
  where account_key = account_key_input
    and expires_at > now();

  if not found then
    raise exception 'Sync account not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('updated_at', now());
end;
$$;

grant execute on function public.create_temp_account(text, jsonb) to anon, authenticated;
grant execute on function public.get_temp_account(text) to anon, authenticated;
grant execute on function public.save_temp_account(text, jsonb) to anon, authenticated;
