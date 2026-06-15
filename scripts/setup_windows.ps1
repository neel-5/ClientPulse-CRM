$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Setting up ClientPulse CRM..." -ForegroundColor Cyan

Push-Location "$Root\backend"
py -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
Pop-Location

Push-Location "$Root\frontend"
npm install
Pop-Location

if (-not (Test-Path "$Root\.env")) {
    Copy-Item "$Root\.env.example" "$Root\.env"
}

Write-Host "Setup complete. Run scripts\start_windows.ps1" -ForegroundColor Green
