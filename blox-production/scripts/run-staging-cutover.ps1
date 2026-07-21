# One-shot staging cutover: apply migrations + deploy SkipCash functions.
# Prerequisites:
#   - Node/npm
#   - $env:SUPABASE_ACCESS_TOKEN  (https://supabase.com/dashboard/account/tokens)
#   - Project ref (default: set -ProjectRef)
#
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\run-staging-cutover.ps1 -ProjectRef zqwsxewuppexvjyakuqf

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,
  [switch]$SkipFunctions,
  [switch]$SkipDbPush
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "Set SUPABASE_ACCESS_TOKEN first (Supabase Dashboard → Account → Access Tokens)."
}

Write-Host "==> Ensuring supabase CLI (npx)"
npx --yes supabase --version

if (-not $SkipDbPush) {
  Write-Host "==> Linking project $ProjectRef"
  npx --yes supabase link --project-ref $ProjectRef

  Write-Host "==> Pushing migrations"
  npx --yes supabase db push
}

if (-not $SkipFunctions) {
  Write-Host "==> Deploying Edge Functions"
  foreach ($fn in @("skipcash-payment", "skipcash-verify", "skipcash-webhook")) {
    Write-Host "    $fn"
    npx --yes supabase functions deploy $fn --project-ref $ProjectRef
  }
}

Write-Host ""
Write-Host "Cutover script finished."
Write-Host "Next:"
Write-Host "  1. Confirm SKIPCASH_USE_SANDBOX and keys in Edge Function secrets"
Write-Host "  2. Run docs/MANUAL_TEST_CHECKLIST.md on staging"
Write-Host "  3. Only then set BACKEND_GATE_CONFIRMED and deploy prod frontend"
