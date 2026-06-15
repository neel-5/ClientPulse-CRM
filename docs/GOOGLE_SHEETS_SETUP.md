# Google Sheets Setup

## CSV-first demo

Run:

```powershell
backend\.venv\Scripts\python.exe automation\sync_to_sheets.py
```

Without credentials, ClientPulse writes a timestamped lead export to `exports/`. Import the
four files in `sheets_template/` into sheets named `Leads`, `Followups`, `Dashboard`, and
`Validation Lists`.

## Live Google Sheets API

1. Create a Google Cloud project.
2. Enable **Google Sheets API**.
3. Create a service account and download its JSON key outside the repository.
4. Share the target spreadsheet with the service account email as Editor.
5. Copy `.env.example` to `.env`.
6. Set:

```env
GOOGLE_SHEETS_MODE=google
GOOGLE_SERVICE_ACCOUNT_FILE=C:\secure\clientpulse-service-account.json
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
```

7. Create a tab named `Leads`, then call `POST /api/sheets/sync`.

## Dashboard design

Use KPI cards at the top, pipeline and source charts in the middle, and agent/follow-up
tables below. Keep raw data in flat source tabs and build reporting from pivots.

Recommended pivots:

- Rows `Stage`; values `COUNTA Lead ID`, `SUM Value`.
- Rows `Source`; columns `Stage`; values `COUNTA Lead ID`.
- Rows `Owner`; values `COUNTA Lead ID`, `SUM Value`; filter `Stage = Won`.
- Rows `Due At` grouped by week; columns `Status`; values `COUNTA Follow-up ID`.

## Core formulas

```text
Conversion rate:
=IFERROR(COUNTIF(Leads!G2:G,"Won")/COUNTA(Leads!A2:A),0)

Overdue follow-ups:
=COUNTIFS(Followups!F2:F,"pending",Followups!D2:D,"<"&NOW())

Agent won rate (agent in A2):
=IFERROR(COUNTIFS(Leads!K:K,A2,Leads!G:G,"Won")/COUNTIF(Leads!K:K,A2),0)

Source conversion (source in A2):
=IFERROR(COUNTIFS(Leads!F:F,A2,Leads!G:G,"Won")/COUNTIF(Leads!F:F,A2),0)

Weighted pipeline:
=SUMPRODUCT(Leads!I2:I,SWITCH(Leads!G2:G,"New",10%,"Contacted",25%,"Interested",50%,"Demo Scheduled",70%,"Won",100%,0%))
```

## Data validation

- `Leads!G2:G`: stage list from `Validation Lists!A2:A7`.
- `Leads!F2:F`: source list from `Validation Lists!B2:B8`.
- Follow-up type, task priority, and task status use the remaining validation columns.

## Conditional formatting

- Entire lead row green when `$G2="Won"`.
- Entire lead row grey when `$G2="Lost"`.
- Score amber when `$J2>=80`.
- Follow-up row red when `=AND($F2="pending",$D2<NOW())`.
- Follow-up due within 24 hours amber when `=AND($F2="pending",$D2>=NOW(),$D2<NOW()+1)`.
