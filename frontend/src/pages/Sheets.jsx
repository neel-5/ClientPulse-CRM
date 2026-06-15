import { CheckCircle2, CloudUpload, Download, RefreshCw, Sheet, TableProperties } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { ErrorState, Loading, PageHeader } from "../components/UI";

export default function Sheets() {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const load = () => Promise.all([api("/api/sheets/preview"), api("/api/integrations/status")]).then(([rows, integrations]) => { setPreview(rows); setStatus(integrations.google_sheets); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function sync() {
    setSyncing(true);
    try { setResult(await api("/api/sheets/sync", { method: "POST", body: "{}" })); } catch (e) { setError(e.message); } finally { setSyncing(false); }
  }
  if ((!preview || !status) && !error) return <Loading />;
  if (error && !preview) return <ErrorState error={error} retry={load} />;
  return <div className="page-stack">
    <PageHeader title="Google Sheets sync" description="Export clean CRM data now, or connect a live spreadsheet with service-account credentials." action={sync} actionLabel={syncing ? "Syncing..." : "Sync lead data"} actionIcon={RefreshCw} />
    <section className="integration-hero sheets-hero">
      <div className="integration-logo"><Sheet size={28} /></div><div><span className="status-line"><i /> {status.mode === "csv" ? "CSV fallback active" : "Google Sheets connected"}</span><h2>CRM data, analysis-ready</h2><p>The same lead records power dashboards, pivots, validation lists, and operational reporting.</p></div>
      <div className="sync-facts"><span>Mode<strong>{status.mode.toUpperCase()}</strong></span><span>Rows ready<strong>{preview.rows.length} previewed</strong></span><span>Schema<strong>13 columns</strong></span></div>
    </section>
    {result && <div className="success-banner"><CheckCircle2 size={18} /><span><strong>{result.records} records exported.</strong> {result.mode === "csv" ? "CSV fallback completed successfully." : "Google Sheet updated successfully."}</span></div>}
    <section className="sheets-grid">
      <article className="panel data-preview"><div className="panel-heading"><div><h3>Sync preview</h3><p>Lead sheet data before export</p></div><TableProperties size={19} /></div><div className="responsive-table"><table><thead><tr>{preview.headers.slice(0, 7).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{preview.rows.map((row) => <tr key={row[0]}>{row.slice(0, 7).map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div></article>
      <aside className="panel sync-blueprint"><h3>Workbook blueprint</h3><div><CloudUpload size={18} /><span><strong>Leads</strong><small>Pivot-ready source table</small></span></div><div><RefreshCw size={18} /><span><strong>Follow-ups</strong><small>Due, overdue, and owner views</small></span></div><div><TableProperties size={18} /><span><strong>Dashboard</strong><small>KPI formulas and charts</small></span></div><div><Download size={18} /><span><strong>Validation Lists</strong><small>Stages, sources, owners</small></span></div><p>See <code>docs/GOOGLE_SHEETS_SETUP.md</code> for formulas, pivots, conditional formatting, and live API setup.</p></aside>
    </section>
  </div>;
}
