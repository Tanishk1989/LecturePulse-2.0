$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Install Supabase CLI: https://supabase.com/docs/guides/cli"
}

Write-Host "Deploying edge functions..."
supabase functions deploy groq-chat
supabase functions deploy transcribe-audio
supabase functions deploy extract-pdf-text
supabase functions deploy youtube-transcribe
supabase functions deploy process-lecture

Write-Host "Done. Ensure GROQ_API_KEY is set:"
Write-Host "  supabase secrets set GROQ_API_KEY=your-key"
