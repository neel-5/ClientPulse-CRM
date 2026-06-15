# API Examples

Base URL: `http://localhost:8000`

## Login

```powershell
$session = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8000/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"param5saxena@gmail.com","password":"Demo@123"}'
$headers = @{ Authorization = "Bearer $($session.access_token)" }
```

## Create and move a lead

```powershell
$lead = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/leads" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"name":"Priya Nair","business_name":"Nair Wellness Studio","phone":"+919876500321","source":"WhatsApp","value":42000}'

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/leads/$($lead.id)/move" `
  -Headers $headers -ContentType "application/json" -Body '{"stage":"Interested"}'
```

## Receive a mock WhatsApp message

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/whatsapp/mock-message" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"phone":"+919876500321","name":"Priya Nair","message":"Can I see a clinic follow-up demo?"}'
```

## Generate an AI reply

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/ai/reply" `
  -Headers $headers -ContentType "application/json" `
  -Body "{`"lead_id`":$($lead.id),`"context`":`"clinic follow-up demo`"}"
```

## Sync to Sheets or CSV

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/sheets/sync" `
  -Headers $headers -ContentType "application/json" -Body '{}'
```

Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.
