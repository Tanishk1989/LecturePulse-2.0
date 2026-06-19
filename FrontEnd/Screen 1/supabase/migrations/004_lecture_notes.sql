-- LecturePulse: AI-generated smart notes per lecture

create table if not exists public.lecture_notes (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  user_id text not null,
  summary text not null default '',
  key_concepts jsonb not null default '[]'::jsonb,
  important_points jsonb not null default '[]'::jsonb,
  definitions jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  exam_tips jsonb not null default '{"mostImportant":[],"commonMistakes":[],"topicsToRevise":[]}'::jsonb,
  status text not null default 'idle' check (status in ('idle', 'generating', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lecture_notes_lecture_id_idx
  on public.lecture_notes (lecture_id);

create index if not exists lecture_notes_user_id_created_at_idx
  on public.lecture_notes (user_id, created_at desc);

alter table public.lecture_notes enable row level security;

create policy "lecture_notes_select_mvp"
  on public.lecture_notes for select
  using (true);

create policy "lecture_notes_insert_mvp"
  on public.lecture_notes for insert
  with check (true);

create policy "lecture_notes_update_mvp"
  on public.lecture_notes for update
  using (true)
  with check (true);

create policy "lecture_notes_delete_mvp"
  on public.lecture_notes for delete
  using (true);
