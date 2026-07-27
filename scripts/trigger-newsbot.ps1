# Manual / external cron trigger for FM Heart newsbot
#
# Endpoint: POST https://fmheart-tau.vercel.app/api/cron/newsbot
# Header:   Authorization: Bearer <CRON_SECRET from .env.local or GitHub secret CRON_SECRET>
#
# cron-job.org (free): create job every 10 minutes, method POST, same URL, add header
#   Authorization = Bearer YOUR_SECRET (paste from .env.local CRON_SECRET, not committed)
#
# Windows Task Scheduler: Action = powershell.exe -NoProfile -ExecutionPolicy Bypass -File "<repo>\scripts\trigger-newsbot.ps1"
#
# GitHub Actions (preferred, always on): after gh has workflow scope, push .github/workflows/newsbot.yml
# Trigger FM Heart news ingest (same as GitHub Actions / external cron).
# Reads CRON_SECRET from repo-root .env.local (not committed).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local not found at $envFile"
}
$secret = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*CRON_SECRET\s*=\s*(.+)\s*$') {
    $secret = $matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $secret) {
  Write-Error "CRON_SECRET not set in .env.local"
}
$uri = "https://fmheart-tau.vercel.app/api/cron/newsbot"
$response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{ Authorization = "Bearer $secret" } -UseBasicParsing
Write-Host "HTTP $($response.StatusCode)"
Write-Host $response.Content
if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
  exit 1
}

