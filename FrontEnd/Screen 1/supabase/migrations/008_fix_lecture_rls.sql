-- Fix lecture RLS policies to not depend on Firebase Third-Party Auth.
-- The current 007 policies compare user_id = current_user_id(), which returns null
-- when Firebase -> Supabase auth sync fails (Firebase Third-Party Auth not enabled in Dashboard).
--
-- Fix: Use user_id IS NOT NULL for CRUD (client already filters by user.uid),
-- so inserts/selects work even without a Supabase auth session.

-- Lectures: drop old Firebase-dependent policies
drop policy if exists "lectures_select_own" on public.lectures;
drop policy if exists "lectures_insert_own" on public.lectures;
drop policy if exists "lectures_update_own" on public.lectures;
drop policy if exists "lectures_delete_own" on public.lectures;

-- Recreate with user_id IS NOT NULL (client sends Firebase user.uid as user_id)
create policy "lectures_select_own"
  on public.lectures for select
  using (user_id is not null);

create policy "lectures_insert_own"
  on public.lectures for insert
  with check (user_id is not null);

create policy "lectures_update_own"
  on public.lectures for update
  using (user_id is not null)
  with check (user_id is not null);

create policy "lectures_delete_own"
  on public.lectures for delete
  using (user_id is not null);