# Google Apps Script Setup

1. Create or open the ClientPulse Google Sheet.
2. Open **Extensions → Apps Script**.
3. Create files matching everything in `apps_script/` and paste their contents.
4. Create tabs: `Leads`, `Followups`, `Dashboard`, `Validation Lists`, and `Config`.
5. In `Config`, set:

| A | B |
|---|---|
| API Base URL | your public FastAPI URL |
| API Token | a ClientPulse login access token |

6. Run `setupClientPulse()` once and approve Sheets, external request, trigger, and email
   permissions.
7. Reload the spreadsheet. The **ClientPulse CRM** custom menu will appear.

## Included operations

- Custom menu and one-click refresh.
- API fetch into Leads and Followups tabs.
- Stage and source validation dropdowns.
- Dashboard formulas and chart.
- Daily 09:00 follow-up reminder trigger.
- Overdue row formatting.
- `doPost(e)` webhook receiver for optional backend events.

## Web app deployment

Deploy as **Web app**, execute as yourself, and set access according to the pilot's security
needs. Put a random `CLIENTPULSE_WEBHOOK_SECRET` in Script Properties and include that
secret in webhook payloads. Do not put API credentials in source files.

For long-lived production use, replace the pasted JWT with an Apps Script-specific API key
or OAuth exchange, because demo access tokens expire.
