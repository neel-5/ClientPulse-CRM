import { GripVertical, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ErrorState, Loading, PageHeader, Score, formatCurrency } from "../components/UI";

export default function Pipeline() {
  const [pipeline, setPipeline] = useState(null);
  const [error, setError] = useState("");
  const load = () => api("/api/pipeline").then(setPipeline).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function drop(event, stage) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("leadId");
    if (!leadId) return;
    await api(`/api/leads/${leadId}/move`, { method: "POST", body: JSON.stringify({ stage }) });
    load();
  }

  if (!pipeline && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  return (
    <div className="page-stack pipeline-page">
      <PageHeader title="Sales pipeline" description="Drag leads between stages to keep the whole team aligned." />
      <div className="kanban-board">
        {pipeline.map((column) => (
          <section className="kanban-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, column.name)}>
            <header><div><span className="stage-dot" style={{ background: column.color }} /><strong>{column.name}</strong></div><span>{column.leads.length}</span></header>
            <div className="kanban-value">{formatCurrency(column.leads.reduce((sum, lead) => sum + lead.value, 0))}<small>{column.probability}% probability</small></div>
            <div className="kanban-cards">
              {column.leads.map((lead) => (
                <article key={lead.id} draggable onDragStart={(event) => event.dataTransfer.setData("leadId", lead.id)}>
                  <div className="kanban-card-top"><span>{lead.source}</span><GripVertical size={16} /></div>
                  <Link to={`/leads/${lead.id}`}><h4>{lead.name}</h4></Link>
                  <p>{lead.business_name}</p>
                  <div className="kanban-card-bottom"><strong>{formatCurrency(lead.value)}</strong><Score value={lead.score} /></div>
                </article>
              ))}
              {!column.leads.length && <div className="kanban-empty"><Plus size={17} /> Drop a lead here</div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
