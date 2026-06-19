-- LecturePulse: persisted flashcards per lecture

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  user_id text not null,
  front text not null,
  back text not null,
  concept text,
  status text not null default 'new' check (status in ('new', 'review', 'mastered')),
  repetitions int not null default 0,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flashcards_user_id_created_at_idx
  on public.flashcards (user_id, created_at desc);

create index if not exists flashcards_lecture_id_idx
  on public.flashcards (lecture_id);

create index if not exists flashcards_user_status_idx
  on public.flashcards (user_id, status);

alter table public.flashcards enable row level security;

create policy "flashcards_select_mvp"
  on public.flashcards for select
  using (true);

create policy "flashcards_insert_mvp"
  on public.flashcards for insert
  with check (true);

create policy "flashcards_update_mvp"
  on public.flashcards for update
  using (true)
  with check (true);

create policy "flashcards_delete_mvp"
  on public.flashcards for delete
  using (true);
