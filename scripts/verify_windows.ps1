$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Push-Location "$Root\backend"
& ".\.venv\Scripts\python.exe" -m pytest -q
Pop-Location

Push-Location "$Root\frontend"
npm run build
Pop-Location

& "$Root\backend\.venv\Scripts\python.exe" "$Root\automation\stale_lead_detector.py" --days 5
Write-Host "All verification steps passed." -ForegroundColor Green
