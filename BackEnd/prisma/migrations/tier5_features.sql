-- Tier 5: RAG chunks, cross-lecture link type, lecture quiz attempts
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rag_chunks_lecture_id_idx ON rag_chunks(lecture_id);
CREATE INDEX IF NOT EXISTS rag_chunks_user_id_idx ON rag_chunks(user_id);

ALTER TABLE kg_links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'intra';

CREATE TABLE IF NOT EXISTS lecture_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
