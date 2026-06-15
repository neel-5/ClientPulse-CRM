import { ArrowLeft, Bot, CalendarPlus, CheckCircle2, Mail, MessageCircle, Phone, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Badge, ErrorState, Loading, Modal, Score, formatCurrency, formatDate } from "../components/UI";

const stages = ["New", "Contacted", "Interested", "Demo Scheduled", "Won", "Lost"];

export default function LeadDetail() {
  const { leadId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [followupOpen, setFollowupOpen] = useState(false);
  const load = () => api(`/api/leads/${leadId}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [leadId]);

  async function move(stage) {
    await api(`/api/leads/${leadId}/move`, { method: "POST", body: JSON.stringify({ stage }) });
    load();
  }
  async function addNote(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.note;
    if (!input.value.trim()) return;
    await api(`/api/leads/${leadId}/notes`, { method: "POST", body: JSON.stringify({ content: input.value }) });
    input.value = "";
    load();
  }
  async function runAI(kind) {
    const endpoint = kind === "reply" ? "reply" : kind === "score" ? "score" : "next-action";
    const result = await api(`/api/ai/${endpoint}`, { method: "POST", body: JSON.stringify({ lead_id: Number(leadId) }) });
    setAiResult(result.draft || result.reasoning || result.action);
    load();
  }
  async function schedule(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/followups", {
      method: "POST",
      body: JSON.stringify({ lead_id: Number(leadId), due_at: new Date(form.get("due_at")).toISOString(), type: form.get("type"), note: form.get("note") }),
    });
    setFollowupOpen(false);
    load();
  }

  if (!data && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  const { lead } = data;
  return (
    <div className="page-stack">
      <Link to="/leads" className="back-link"><ArrowLeft size={16} /> Back to leads</Link>
      <section className="lead-hero">
        <div className="lead-profile">
          <div className="avatar large">{lead.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
          <div><div className="title-row"><h2>{lead.name}</h2><Badge tone={lead.temperature === "Hot" ? "red" : "amber"}>{lead.temperature}</Badge></div><p>{lead.business_name} · {lead.source}</p><div className="contact-row"><span><Phone size={14} />{lead.phone}</span><span><Mail size={14} />{lead.email || "No email"}</span></div></div>
        </div>
        <div className="lead-hero-actions"><button className="secondary-button" onClick={() => setFollowupOpen(true)}><CalendarPlus size={17} />Schedule follow-up</button><Link className="primary-button" to="/inbox"><MessageCircle size={17} />Open inbox</Link></div>
      </section>
      <section className="lead-summary-grid">
        <article><span>Opportunity</span><strong>{formatCurrency(lead.value)}</strong></article>
        <article><span>AI score</span><strong><Score value={lead.score} /> / 100</strong></article>
        <article><span>Owner</span><strong>{data.owner?.name || "Unassigned"}</strong></article>
        <article><span>Next follow-up</span><strong>{formatDate(lead.next_follow_up, true)}</strong></article>
      </section>
      <section className="panel stage-progress">
        <div className="panel-heading"><div><h3>Pipeline stage</h3><p>Move this opportunity as the conversation develops.</p></div></div>
        <div className="stage-buttons">{stages.map((stage) => <button key={stage} className={lead.stage === stage ? "active" : ""} onClick={() => move(stage)}><span>{lead.stage === stage && <CheckCircle2 size={15} />}</span>{stage}</button>)}</div>
      </section>
      <div className="detail-grid">
        <section className="panel timeline-panel">
          <div className="panel-heading"><div><h3>Conversation timeline</h3><p>WhatsApp context and internal notes together</p></div></div>
          <div className="detail-timeline">
            {data.messages.slice(-5).map((message) => <div key={`m-${message.id}`} className={`timeline-item message-${message.direction}`}><div className="timeline-icon"><MessageCircle size={15} /></div><div><span>{message.direction === "inbound" ? lead.name : "Your team"} · {formatDate(message.sent_at, true)}</span><p>{message.content}</p></div></div>)}
            {data.notes.map((note) => <div key={`n-${note.id}`} className="timeline-item note-item"><div className="timeline-icon"><Sparkles size={15} /></div><div><span>Internal note · {formatDate(note.created_at, true)}</span><p>{note.content}</p></div></div>)}
          </div>
          <form className="note-composer" onSubmit={addNote}><input name="note" placeholder="Add an internal note..." /><button className="primary-button"><Send size={16} />Add note</button></form>
        </section>
        <aside className="detail-sidebar">
          <section className="panel ai-panel">
            <div className="ai-panel-title"><div><Bot size={19} /></div><span><strong>ClientPulse AI</strong><small>Mock provider · local</small></span></div>
            <p>Use CRM context to draft the next best move. Every output is saved for review.</p>
            <div className="ai-actions"><button onClick={() => runAI("reply")}>Draft WhatsApp reply</button><button onClick={() => runAI("score")}>Refresh lead score</button><button onClick={() => runAI("action")}>Suggest next action</button></div>
            {aiResult && <div className="ai-result"><Sparkles size={16} /><p>{aiResult}</p></div>}
          </section>
          <section className="panel upcoming-panel">
            <h3>Follow-ups</h3>
            {data.followups.map((item) => <div key={item.id}><CalendarPlus size={16} /><span><strong>{item.type}</strong><small>{formatDate(item.due_at, true)} · {item.status}</small></span></div>)}
            {!data.followups.length && <p className="muted">No follow-ups scheduled yet.</p>}
          </section>
        </aside>
      </div>
      {followupOpen && <Modal title="Schedule follow-up" onClose={() => setFollowupOpen(false)}><form className="form-grid" onSubmit={schedule}><label>Date and time<input name="due_at" type="datetime-local" required /></label><label>Follow-up type<select name="type"><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="demo">Demo</option><option value="email">Email</option></select></label><label className="full">Context<textarea name="note" placeholder="What should the owner do next?" rows="4" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setFollowupOpen(false)}>Cancel</button><button className="primary-button">Schedule</button></div></form></Modal>}
    </div>
  );
}
