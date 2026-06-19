-- LecturePulse: transcripts table for Whisper transcription results

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  user_id text not null,
  full_text text not null default '',
  language text,
  duration_seconds numeric,
  segments jsonb not null default '[]'::jsonb,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transcripts_lecture_id_idx
  on public.transcripts (lecture_id);

create index if not exists transcripts_user_id_created_at_idx
  on public.transcripts (user_id, created_at desc);

alter table public.transcripts enable row level security;

create policy "transcripts_select_mvp"
  on public.transcripts for select
  using (true);

create policy "transcripts_insert_mvp"
  on public.transcripts for insert
  with check (true);

create policy "transcripts_update_mvp"
  on public.transcripts for update
  using (true)
  with check (true);

create policy "transcripts_delete_mvp"
  on public.transcripts for delete
  using (true);
