#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Install Supabase CLI: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "Deploying edge functions..."
supabase functions deploy groq-chat
supabase functions deploy transcribe-audio
supabase functions deploy extract-pdf-text
supabase functions deploy youtube-transcribe
supabase functions deploy process-lecture

echo "Done. Ensure GROQ_API_KEY is set:"
echo "  supabase secrets set GROQ_API_KEY=your-key"
