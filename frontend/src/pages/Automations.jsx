import { CheckCircle2, CirclePlay, Clock, Workflow, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, ErrorState, Loading, PageHeader, formatDate } from "../components/UI";

export default function Automations() {
  const [rules, setRules] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const load = () => Promise.all([api("/api/automation/rules"), api("/api/automation-logs")]).then(([ruleRows, logRows]) => { setRules(ruleRows); setLogs(logRows); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function run(rule) {
    await api("/api/automation/run", { method: "POST", body: JSON.stringify({ automation_name: rule.name, parameters: { source: "dashboard" } }) });
    load();
  }
  if (!rules && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  return <div className="page-stack">
    <PageHeader title="Automation control room" description="Visible rules, clear triggers, and an audit trail for every run." />
    <section className="automation-stats"><article><Workflow /><span><strong>{rules.length}</strong> rules configured</span></article><article><Zap /><span><strong>{rules.filter((rule) => rule.enabled).length}</strong> rules active</span></article><article><CheckCircle2 /><span><strong>{logs.filter((log) => log.status === "success").length}</strong> successful runs</span></article></section>
    <section className="rule-grid">{rules.map((rule) => <article className="panel rule-card" key={rule.id}><div className="rule-top"><div className="rule-icon"><Workflow size={19} /></div><Badge tone={rule.enabled ? "green" : "neutral"}>{rule.enabled ? "Active" : "Paused"}</Badge></div><h3>{rule.name}</h3><div className="rule-flow"><div><Clock size={15} /><span><small>WHEN</small>{rule.trigger}</span></div><div><Zap size={15} /><span><small>THEN</small>{rule.action}</span></div></div><button className="secondary-button" onClick={() => run(rule)}><CirclePlay size={16} />Run now</button></article>)}</section>
    <section className="panel log-panel"><div className="panel-heading"><div><h3>Automation logs</h3><p>Auditable history from API and Python jobs</p></div></div><div className="log-list">{logs.map((log) => <div key={log.id}><span className={`log-status ${log.status}`} /><div><strong>{log.automation_name}</strong><p>{log.details}</p></div><Badge tone="green">{log.records_processed} records</Badge><time>{formatDate(log.ran_at, true)}</time></div>)}</div></section>
  </div>;
}
