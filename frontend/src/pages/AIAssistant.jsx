import { Bot, BrainCircuit, MessageSquareText, ShieldAlert, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, ErrorState, Loading, PageHeader, Score, formatDate } from "../components/UI";

const actions = [
  ["score", "Lead score", BrainCircuit, "Evaluate intent, value, source, and stage."],
  ["reply", "Reply draft", MessageSquareText, "Write a concise consultative WhatsApp response."],
  ["summary", "Conversation summary", Sparkles, "Compress the relationship into decision-ready context."],
  ["next-action", "Next best action", Target, "Recommend the highest-value next sales move."],
  ["risk", "Cold lead risk", ShieldAlert, "Flag silence and suggest a re-engagement approach."],
];

export default function AIAssistant() {
  const [leads, setLeads] = useState(null);
  const [selected, setSelected] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult] = useState("");
  const [running, setRunning] = useState("");
  const [error, setError] = useState("");
  const load = () => Promise.all([api("/api/leads?sort=-score"), api("/api/ai/suggestions")]).then(([leadRows, suggestionRows]) => { setLeads(leadRows); setSuggestions(suggestionRows); if (!selected && leadRows.length) setSelected(String(leadRows[0].id)); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function run(kind) {
    setRunning(kind);
    setResult("");
    try {
      const response = await api(`/api/ai/${kind}`, { method: "POST", body: JSON.stringify({ lead_id: Number(selected), context: "Use the latest CRM and WhatsApp context." }) });
      setResult(response.draft || response.reasoning || response.summary || response.action || response.note);
      load();
    } finally { setRunning(""); }
  }
  if (!leads && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  const lead = leads.find((item) => String(item.id) === selected);
  return <div className="page-stack">
    <PageHeader title="AI sales copilot" description="Grounded, reviewable suggestions that work locally in mock mode." />
    <section className="ai-workbench">
      <div className="panel ai-controls">
        <div className="assistant-orb"><Bot size={30} /></div><h2>What should we work on?</h2><p>Choose a lead and a focused assistance mode. Nothing is sent automatically.</p>
        <label>Lead context<select value={selected} onChange={(e) => setSelected(e.target.value)}>{leads.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stage} · score {item.score}</option>)}</select></label>
        {lead && <div className="selected-lead"><div className="avatar">{lead.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><span><strong>{lead.business_name}</strong><small>{lead.source} · {lead.stage}</small></span><Score value={lead.score} /></div>}
        <div className="ai-action-grid">{actions.map(([kind, label, Icon, description]) => <button key={kind} onClick={() => run(kind)} disabled={!!running}><Icon size={19} /><span><strong>{running === kind ? "Generating..." : label}</strong><small>{description}</small></span></button>)}</div>
      </div>
      <div className="ai-output-column">
        <section className="panel ai-output"><div className="panel-heading"><div><h3>Generated output</h3><p>Review before using with a real lead</p></div><Badge tone="violet">Mock provider</Badge></div>{result ? <div className="generated-copy"><Sparkles size={20} /><p>{result}</p><div><button className="secondary-button" onClick={() => navigator.clipboard?.writeText(result)}>Copy draft</button></div></div> : <div className="output-empty"><Bot size={32} /><strong>Choose an AI action</strong><span>The generated suggestion will appear here.</span></div>}</section>
        <section className="panel suggestion-history"><div className="panel-heading"><div><h3>Suggestion history</h3><p>Stored in the CRM for audit and learning</p></div></div>{suggestions.slice(0, 5).map((item) => <article key={item.id}><div><Badge tone="blue">{item.type.replaceAll("_", " ")}</Badge><time>{formatDate(item.created_at, true)}</time></div><p>{item.content}</p><span>{Math.round(item.confidence * 100)}% confidence</span></article>)}</section>
      </div>
    </section>
  </div>;
}
