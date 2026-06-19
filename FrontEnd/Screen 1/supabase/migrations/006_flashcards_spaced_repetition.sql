-- LecturePulse: spaced repetition fields for flashcards

alter table public.flashcards
  add column if not exists ease_factor double precision not null default 2.5,
  add column if not exists interval_days int not null default 0;

create index if not exists flashcards_user_next_review_idx
  on public.flashcards (user_id, next_review_at);
