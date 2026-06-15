import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ErrorState, Loading, PageHeader, formatCurrency, formatDate } from "../components/UI";

const metricConfig = [
  ["total_leads", "Total leads", UsersRound, "blue"],
  ["new_leads_today", "New today", TrendingUp, "violet"],
  ["followups_due_today", "Due today", CalendarClock, "amber"],
  ["overdue_followups", "Overdue", Target, "red"],
  ["conversion_rate", "Conversion", ArrowUpRight, "green", "%"],
  ["pipeline_value", "Pipeline value", CircleDollarSign, "teal", "currency"],
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => api("/api/dashboard").then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  if (!data && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;

  const maxSource = Math.max(...data.sources.map((item) => item.count), 1);
  return (
    <div className="page-stack">
      <PageHeader
        title="Revenue command center"
        description="A live view of lead momentum, follow-up risk, and team execution."
        action={() => window.location.assign("/leads")}
        actionLabel="Create lead"
      />
      <section className="metrics-grid">
        {metricConfig.map(([key, label, Icon, tone, format]) => (
          <article className="metric-card" key={key}>
            <div className={`metric-icon icon-${tone}`}><Icon size={19} /></div>
            <span>{label}</span>
            <strong>{format === "currency" ? formatCurrency(data.metrics[key]) : `${data.metrics[key]}${format || ""}`}</strong>
            <small>{key === "overdue_followups" ? "Needs attention" : "Updated from CRM activity"}</small>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel pipeline-health">
          <div className="panel-heading"><div><h3>Pipeline health</h3><p>Lead distribution across the sales journey</p></div><Link to="/pipeline">Open pipeline <ArrowUpRight size={15} /></Link></div>
          <div className="funnel">
            {data.pipeline.map((item, index) => (
              <div className="funnel-row" key={item.stage}>
                <div><span>{item.stage}</span><strong>{item.count}</strong></div>
                <div className="funnel-track"><span style={{ width: `${Math.max(12, (item.count / Math.max(data.metrics.total_leads, 1)) * 220)}%`, "--delay": `${index * 70}ms` }} /></div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel source-card">
          <div className="panel-heading"><div><h3>Lead sources</h3><p>Where qualified demand starts</p></div><span className="soft-label">Last 30 days</span></div>
          <div className="source-list">
            {data.sources.map((item) => (
              <div key={item.source}><div><span>{item.source}</span><strong>{item.count}</strong></div><div className="bar"><span style={{ width: `${(item.count / maxSource) * 100}%` }} /></div></div>
            ))}
          </div>
        </article>
        <article className="panel team-card">
          <div className="panel-heading"><div><h3>Agent performance</h3><p>Ownership and won opportunity</p></div></div>
          <div className="agent-table">
            {data.agents.map((agent) => (
              <div key={agent.name}>
                <div className="avatar small">{agent.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                <div><strong>{agent.name}</strong><span>{agent.leads} active leads</span></div>
                <div><strong>{agent.won}</strong><span>won</span></div>
                <div><strong>{formatCurrency(agent.pipeline)}</strong><span>pipeline</span></div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel activity-card">
          <div className="panel-heading"><div><h3>Recent activity</h3><p>What changed across the workspace</p></div></div>
          <div className="activity-list">
            {data.recent_activity.map((item) => (
              <div key={item.id}><span className="activity-dot" /><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.details}</p></div><time>{formatDate(item.created_at, true)}</time></div>
            ))}
          </div>
        </article>
      </section>
      <section className="insight-strip">
        <div><Sparkles size={18} /><span><strong>{data.metrics.ai_suggestions_generated} AI suggestions</strong> ready across your leads</span></div>
        <div><MessageCircle size={18} /><span><strong>{data.metrics.whatsapp_response_status}% message delivery</strong> in the WhatsApp workspace</span></div>
        <Link to="/ai">Review suggestions <ArrowUpRight size={15} /></Link>
      </section>
    </div>
  );
}
