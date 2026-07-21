#!/usr/bin/env bash
# Deploy SkipCash Edge Functions to a Supabase project.
# Usage:
#   ./scripts/deploy-skipcash-functions.sh <project-ref>
# Requires: supabase CLI logged in (supabase login) or SUPABASE_ACCESS_TOKEN.

set -euo pipefail

REF="${1:-}"
if [[ -z "$REF" ]]; then
  echo "Usage: $0 <supabase-project-ref>"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for fn in skipcash-payment skipcash-verify skipcash-webhook; do
  echo "==> Deploying $fn to $REF"
  supabase functions deploy "$fn" --project-ref "$REF"
done

echo "Done. Confirm SKIPCASH_* secrets and SKIPCASH_USE_SANDBOX on the project."
