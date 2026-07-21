# Deploy SkipCash Edge Functions to a Supabase project.
# Usage:
#   .\scripts\deploy-skipcash-functions.ps1 -ProjectRef <ref>
# Requires: supabase CLI authenticated.

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$functions = @("skipcash-payment", "skipcash-verify", "skipcash-webhook")
foreach ($fn in $functions) {
  Write-Host "==> Deploying $fn to $ProjectRef"
  supabase functions deploy $fn --project-ref $ProjectRef
}

Write-Host "Done. Confirm SKIPCASH_* secrets and SKIPCASH_USE_SANDBOX on the project."
