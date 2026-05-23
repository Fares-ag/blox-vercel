#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Applies Blox SQL from this repo to a Supabase Postgres database (typically a brand-new project).

.DESCRIPTION
  Uses psql with ON_ERROR_STOP. Corrects migration order bugs in filenames (152 before 150)
  and includes bootstrap steps for TEXT application ids on an empty DB.

.PARAMETER DatabaseUrl
  Postgres connection string from Supabase: Dashboard -> Project Settings -> Database
  -> "Connection string" -> URI (use Session mode or Transaction pooler per Supabase docs).
  Alternatively set env DATABASE_URL.

.EXAMPLE
  $env:DATABASE_URL = "postgresql://postgres.[ref]:[YOUR-PASSWORD]@..."
  .\scripts\ApplySupabaseSchema.ps1

.NOTES
  - Run against an empty/new project after creating it (no legacy data).
  - Vercel can stay as-is; point your app to the new project via VITE_SUPABASE_* (already set locally).
#>
param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  Write-Error "Pass -DatabaseUrl or set environment variable DATABASE_URL (Supabase Postgres URI)."
}

$psqlExe = $null
$cmd = Get-Command psql -ErrorAction SilentlyContinue
if ($cmd) {
  $psqlExe = $cmd.Source
}
if (-not $psqlExe) {
  # Typical EDB PostgreSQL installer path (often not added to PATH)
  $found = @()
  $pgRoot = Join-Path $env:ProgramFiles "PostgreSQL"
  if (Test-Path -LiteralPath $pgRoot) {
    $found += @(Get-ChildItem -Path $pgRoot -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue)
  }
  $pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
  if ($pf86) {
    $pg86 = Join-Path $pf86 "PostgreSQL"
    if (Test-Path -LiteralPath $pg86) {
      $found += @(Get-ChildItem -Path $pg86 -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue)
    }
  }
  $candidates = $found | Where-Object { $_.DirectoryName -match '\\bin$' } | Sort-Object FullName -Descending
  if ($candidates) {
    $psqlExe = $candidates[0].FullName
  }
}
if (-not $psqlExe) {
  Write-Error @"
psql not found. Do one of the following:
  1) Install PostgreSQL for Windows (includes psql): https://www.postgresql.org/download/windows/
     After install, reopen PowerShell or add ...\PostgreSQL\16\bin to your PATH.
  2) Or run the SQL files manually in Supabase SQL Editor (see docs/APPLY_SCHEMA_NEW_PROJECT.md).
"@
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$files = @(
  "supabase-schema.sql",
  "supabase\bootstrap\00_auth_helpers.sql",
  "supabase\bootstrap\01_empty_db_text_application_ids.sql",
  "ADD_PAYMENT_INTENTS_AND_IMPROVEMENTS.sql",
  "supabase-add-user-credits-table.sql",
  "supabase\bootstrap\02_credit_history.sql",
  # 202502152 defines current_user_can_pay_* required by 202502150 (filename order is wrong)
  "supabase\migrations\20250215200000_disable_company_payments.sql",
  "supabase\migrations\20250215000000_customer_pay_with_credits_and_payment_improvements.sql",
  "supabase\bootstrap\03_fix_customer_pay_installment_text_application_id.sql",
  "supabase\migrations\20250215100000_credit_topup_claim_idempotency.sql",
  "supabase\migrations\20250406120000_current_user_email_auth_users_fallback.sql",
  "supabase\migrations\20250407120000_current_user_email_full_fallback.sql",
  "supabase\migrations\20250407130000_fix_application_id_duplicate_pkey.sql",
  "supabase\migrations\20250408120000_applications_id_sequence_and_signup_rpc.sql"
)

foreach ($rel in $files) {
  $path = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Error "Missing file: $path"
  }
  Write-Host "`n=== Applying: $rel ===" -ForegroundColor Cyan
  & $psqlExe $DatabaseUrl -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) {
    Write-Error "psql failed on $rel (exit $LASTEXITCODE)"
  }
}

Write-Host "`nDone. Optional next steps: deploy Edge Functions, run supabase-secure-rls-policies.sql for production RLS, add Auth redirect URLs." -ForegroundColor Green
