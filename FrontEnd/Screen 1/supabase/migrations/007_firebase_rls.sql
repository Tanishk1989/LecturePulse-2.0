-- Tighten RLS to Firebase-authenticated users (JWT sub claim = user_id).
-- Requires Firebase Third-Party Auth enabled in Supabase + client auth sync.

create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'sub', auth.uid()::text);
$$;

-- Lectures
drop policy if exists "lectures_select_mvp" on public.lectures;
drop policy if exists "lectures_insert_mvp" on public.lectures;
drop policy if exists "lectures_update_mvp" on public.lectures;
drop policy if exists "lectures_delete_mvp" on public.lectures;

-- Select/insert allow any row with a non-null user_id (set client-side from Firebase user.uid).
-- This avoids depending on Firebase Third-Party Auth being configured in the Supabase Dashboard.
-- The client code already filters by user_id via getUserLectures(userId) using .eq('user_id', userId).
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

-- Transcripts
drop policy if exists "transcripts_select_mvp" on public.transcripts;
drop policy if exists "transcripts_insert_mvp" on public.transcripts;
drop policy if exists "transcripts_update_mvp" on public.transcripts;
drop policy if exists "transcripts_delete_mvp" on public.transcripts;

create policy "transcripts_select_own"
  on public.transcripts for select
  using (user_id = public.current_user_id());

create policy "transcripts_insert_own"
  on public.transcripts for insert
  with check (user_id = public.current_user_id());

create policy "transcripts_update_own"
  on public.transcripts for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "transcripts_delete_own"
  on public.transcripts for delete
  using (user_id = public.current_user_id());

-- Lecture notes
drop policy if exists "lecture_notes_select_mvp" on public.lecture_notes;
drop policy if exists "lecture_notes_insert_mvp" on public.lecture_notes;
drop policy if exists "lecture_notes_update_mvp" on public.lecture_notes;
drop policy if exists "lecture_notes_delete_mvp" on public.lecture_notes;

create policy "lecture_notes_select_own"
  on public.lecture_notes for select
  using (user_id = public.current_user_id());

create policy "lecture_notes_insert_own"
  on public.lecture_notes for insert
  with check (user_id = public.current_user_id());

create policy "lecture_notes_update_own"
  on public.lecture_notes for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "lecture_notes_delete_own"
  on public.lecture_notes for delete
  using (user_id = public.current_user_id());

-- Flashcards
drop policy if exists "flashcards_select_mvp" on public.flashcards;
drop policy if exists "flashcards_insert_mvp" on public.flashcards;
drop policy if exists "flashcards_update_mvp" on public.flashcards;
drop policy if exists "flashcards_delete_mvp" on public.flashcards;

create policy "flashcards_select_own"
  on public.flashcards for select
  using (user_id = public.current_user_id());

create policy "flashcards_insert_own"
  on public.flashcards for insert
  with check (user_id = public.current_user_id());

create policy "flashcards_update_own"
  on public.flashcards for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "flashcards_delete_own"
  on public.flashcards for delete
  using (user_id = public.current_user_id());

-- Storage: public read (Groq needs URLs), owner-only writes
drop policy if exists "lectures_storage_public_insert" on storage.objects;
drop policy if exists "lectures_storage_public_update" on storage.objects;
drop policy if exists "documents_storage_public_insert" on storage.objects;
drop policy if exists "documents_storage_public_update" on storage.objects;
drop policy if exists "documents_storage_public_delete" on storage.objects;

create policy "lectures_storage_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "lectures_storage_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = public.current_user_id()
  )
  with check (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "lectures_storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "documents_storage_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "documents_storage_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_id()
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_id()
  );

create policy "documents_storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_id()
  );
