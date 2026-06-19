-- Rate limiting for Supabase Edge Functions (service role only).

create table if not exists public.edge_rate_limits (
  user_id text not null,
  function_name text not null,
  window_start timestamptz not null,
  request_count int not null default 1,
  primary key (user_id, function_name, window_start)
);

create index if not exists edge_rate_limits_window_idx
  on public.edge_rate_limits (window_start);

alter table public.edge_rate_limits enable row level security;

-- No user policies: only service_role (edge functions) may access this table.

create or replace function public.check_edge_rate_limit(
  p_user_id text,
  p_function_name text,
  p_max_count int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := date_trunc('hour', now());
  v_count int;
begin
  select request_count
  into v_count
  from public.edge_rate_limits
  where user_id = p_user_id
    and function_name = p_function_name
    and window_start = v_window_start;

  if v_count is not null and v_count >= p_max_count then
    return false;
  end if;

  insert into public.edge_rate_limits (user_id, function_name, window_start, request_count)
  values (p_user_id, p_function_name, v_window_start, 1)
  on conflict (user_id, function_name, window_start)
  do update set request_count = edge_rate_limits.request_count + 1;

  return true;
end;
$$;

revoke all on function public.check_edge_rate_limit(text, text, int) from public;
grant execute on function public.check_edge_rate_limit(text, text, int) to service_role;
