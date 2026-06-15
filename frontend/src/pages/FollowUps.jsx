import { CalendarCheck, Check, Clock3, ListFilter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, ErrorState, Loading, Modal, PageHeader, formatDate } from "../components/UI";

export default function FollowUps() {
  const [items, setItems] = useState(null);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const load = () => Promise.all([api(`/api/followups${filter ? `?status=${filter}` : ""}`), api("/api/leads")]).then(([followups, leadRows]) => { setItems(followups); setLeads(leadRows); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [filter]);
  const leadName = (id) => leads.find((lead) => lead.id === id)?.name || `Lead #${id}`;
  const isOverdue = (item) => item.status === "pending" && new Date(item.due_at) < new Date();

  async function complete(id) {
    await api(`/api/followups/${id}/complete`, { method: "POST" });
    load();
  }
  async function create(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/followups", { method: "POST", body: JSON.stringify({ lead_id: Number(form.get("lead_id")), due_at: new Date(form.get("due_at")).toISOString(), type: form.get("type"), note: form.get("note") }) });
    setOpen(false);
    load();
  }

  if (!items && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  return <div className="page-stack">
    <PageHeader title="Follow-up desk" description="Keep promises visible and close the loop before leads go cold." action={() => setOpen(true)} actionLabel="Schedule follow-up" actionIcon={Plus} />
    <section className="segmented-control"><button className={!filter ? "active" : ""} onClick={() => setFilter("")}>All</button><button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pending</button><button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Completed</button></section>
    <section className="followup-layout">
      <div className="panel agenda-card">
        <div className="panel-heading"><div><h3>Follow-up agenda</h3><p>{items.filter((item) => item.status === "pending").length} open commitments</p></div><ListFilter size={18} /></div>
        <div className="followup-list">{items.map((item) => <article key={item.id} className={isOverdue(item) ? "overdue" : ""}>
          <div className="date-tile"><strong>{new Date(item.due_at).getDate()}</strong><span>{new Date(item.due_at).toLocaleString("en", { month: "short" })}</span></div>
          <div className="followup-copy"><div><h4>{leadName(item.lead_id)}</h4><Badge tone={isOverdue(item) ? "red" : item.status === "completed" ? "green" : "blue"}>{isOverdue(item) ? "Overdue" : item.status}</Badge></div><p>{item.note || `${item.type} follow-up`}</p><span><Clock3 size={14} />{formatDate(item.due_at, true)} · {item.type}</span></div>
          {item.status === "pending" && <button className="complete-button" onClick={() => complete(item.id)}><Check size={16} /> Complete</button>}
        </article>)}</div>
      </div>
      <aside className="panel calendar-summary"><CalendarCheck size={25} /><h3>Execution rhythm</h3><p>Use this queue during the daily sales stand-up. Overdue items stay red until completed.</p><div><span>Pending</span><strong>{items.filter((i) => i.status === "pending").length}</strong></div><div><span>Completed</span><strong>{items.filter((i) => i.status === "completed").length}</strong></div><div><span>Overdue</span><strong>{items.filter(isOverdue).length}</strong></div></aside>
    </section>
    {open && <Modal title="Schedule a follow-up" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={create}><label className="full">Lead<select name="lead_id" required>{leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.name} · {lead.business_name}</option>)}</select></label><label>Date and time<input name="due_at" type="datetime-local" required /></label><label>Type<select name="type"><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="demo">Demo</option><option value="email">Email</option></select></label><label className="full">Note<textarea name="note" rows="3" placeholder="Outcome expected from this follow-up" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button">Schedule</button></div></form></Modal>}
  </div>;
}
