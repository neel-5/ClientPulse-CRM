import { CheckCircle2, Circle, ClipboardCheck, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, ErrorState, Loading, Modal, PageHeader, formatDate } from "../components/UI";

export default function Tasks() {
  const [tasks, setTasks] = useState(null);
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const load = () => Promise.all([api("/api/tasks"), api("/api/leads")]).then(([taskRows, leadRows]) => { setTasks(taskRows); setLeads(leadRows); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function toggle(task) {
    await api(`/api/tasks/${task.id}?status=${task.status === "done" ? "todo" : "done"}`, { method: "PATCH" });
    load();
  }
  async function create(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/tasks", { method: "POST", body: JSON.stringify({ title: form.get("title"), description: form.get("description"), lead_id: form.get("lead_id") ? Number(form.get("lead_id")) : null, due_date: form.get("due_date") || null, priority: form.get("priority") }) });
    setOpen(false);
    load();
  }
  if (!tasks && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  return <div className="page-stack">
    <PageHeader title="Team tasks" description="Turn sales decisions into clear, owned actions." action={() => setOpen(true)} actionLabel="Create task" actionIcon={Plus} />
    <section className="task-summary"><article><ClipboardCheck /><div><span>Open tasks</span><strong>{tasks.filter((task) => task.status !== "done").length}</strong></div></article><article><CheckCircle2 /><div><span>Completed</span><strong>{tasks.filter((task) => task.status === "done").length}</strong></div></article></section>
    <section className="panel task-board">
      {tasks.map((task) => <article key={task.id} className={task.status === "done" ? "done" : ""}>
        <button onClick={() => toggle(task)}>{task.status === "done" ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button>
        <div><div><h4>{task.title}</h4><Badge tone={task.priority === "high" ? "red" : task.priority === "medium" ? "amber" : "neutral"}>{task.priority}</Badge></div><p>{task.description || "No extra context added."}</p><span>{task.lead_id ? leads.find((lead) => lead.id === task.lead_id)?.name : "Workspace task"} · due {formatDate(task.due_date)}</span></div>
      </article>)}
    </section>
    {open && <Modal title="Create a task" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={create}><label className="full">Task title<input name="title" placeholder="e.g. Prepare demo workflow" required /></label><label>Related lead<select name="lead_id"><option value="">No related lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</select></label><label>Priority<select name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label><label>Due date<input name="due_date" type="date" /></label><label className="full">Description<textarea name="description" rows="3" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button">Create task</button></div></form></Modal>}
  </div>;
}
