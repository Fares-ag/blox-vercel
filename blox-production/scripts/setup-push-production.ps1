# Blox Android push — one-time production setup (run from blox-production/)
# Prerequisites: Firebase project, Supabase CLI logged in (Fares-ag account)

$ErrorActionPreference = "Stop"
$ProjectRef = "zqwsxewuppexvjyakuqf"
$FlutterApp = Join-Path $PSScriptRoot "..\..\..\blox-app"
$GoogleServices = Join-Path $FlutterApp "android\app\google-services.json"

Write-Host "=== Blox push setup ===" -ForegroundColor Cyan
Write-Host "Flutter app: $FlutterApp"
Write-Host ""

if (-not (Test-Path $GoogleServices)) {
  Write-Host "MISSING: android/app/google-services.json" -ForegroundColor Yellow
  Write-Host @"

1. Firebase Console → Add Android app
   Package: com.blox.blox_customer
2. Download google-services.json → save to:
   $GoogleServices
3. Project Settings → Service accounts → Generate new private key (JSON)

"@ -ForegroundColor Gray
} else {
  Write-Host "OK: google-services.json present" -ForegroundColor Green
}

Write-Host @"

Supabase (from blox-production):

  npx supabase db push                    # applies push URL GUC migration
  npx supabase secrets set FIREBASE_PROJECT_ID=<your-firebase-project-id>
  npx supabase secrets set FIREBASE_SERVICE_ACCOUNT='$(Get-Content path\to\sa.json -Raw | ConvertFrom-Json | ConvertTo-Json -Compress)'
  npx supabase functions deploy push-notify

SQL Editor (scripts/setup-push-production.sql):
  ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';

Smoke: install APK, login customer@blox.test, accept notifications, check device_tokens table.

"@ -ForegroundColor Gray
