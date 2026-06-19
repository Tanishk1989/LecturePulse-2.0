-- LecturePulse MVP: lectures table + storage bucket
-- Run in Supabase SQL Editor or via Supabase CLI

create extension if not exists "pgcrypto";

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  file_type text not null check (file_type in ('audio', 'video', 'pdf')),
  file_url text not null,
  duration integer,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'failed')),
  favorite boolean not null default false,
  source text not null default 'upload' check (source in ('record', 'upload', 'youtube', 'pdf')),
  created_at timestamptz not null default now()
);

create index if not exists lectures_user_id_created_at_idx
  on public.lectures (user_id, created_at desc);

alter table public.lectures enable row level security;

-- MVP: open policies (tighten with Firebase JWT integration later)
create policy "lectures_select_mvp"
  on public.lectures for select
  using (true);

create policy "lectures_insert_mvp"
  on public.lectures for insert
  with check (true);

create policy "lectures_update_mvp"
  on public.lectures for update
  using (true)
  with check (true);

create policy "lectures_delete_mvp"
  on public.lectures for delete
  using (true);

insert into storage.buckets (id, name, public)
values
  ('lectures', 'lectures', true),
  ('documents', 'documents', true)
on conflict (id) do update set public = true;

create policy "lectures_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'lectures');

create policy "lectures_storage_public_insert"
  on storage.objects for insert
  with check (bucket_id = 'lectures');

create policy "lectures_storage_public_update"
  on storage.objects for update
  using (bucket_id = 'lectures')
  with check (bucket_id = 'lectures');

create policy "documents_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy "documents_storage_public_insert"
  on storage.objects for insert
  with check (bucket_id = 'documents');

create policy "documents_storage_public_update"
  on storage.objects for update
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

create policy "documents_storage_public_delete"
  on storage.objects for delete
  using (bucket_id = 'documents');
