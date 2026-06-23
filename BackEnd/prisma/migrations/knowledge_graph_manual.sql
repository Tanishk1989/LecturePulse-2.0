-- Knowledge Graph migration
-- Run against your PostgreSQL database (e.g. via Supabase SQL editor or prisma db push)

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS kg_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS concept_id UUID;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS concept_name TEXT;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS review_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS correct_attempts INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS kg_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lecture_id, name)
);

CREATE TABLE IF NOT EXISTS kg_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  from_concept_id UUID NOT NULL REFERENCES kg_concepts(id) ON DELETE CASCADE,
  to_concept_id UUID NOT NULL REFERENCES kg_concepts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concept_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  concept_id UUID NOT NULL REFERENCES kg_concepts(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL,
  question TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flashcards
  ADD CONSTRAINT flashcards_concept_id_fkey
  FOREIGN KEY (concept_id) REFERENCES kg_concepts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kg_concepts_user ON kg_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_links_user ON kg_links(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_quiz_attempts_concept ON concept_quiz_attempts(concept_id);
