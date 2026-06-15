$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", "Set-Location '$Root\backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", "Set-Location '$Root\frontend'; npm run dev -- --host 127.0.0.1"

Write-Host "ClientPulse started:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8000"
Write-Host "API docs: http://localhost:8000/docs"
