import { Bot, CheckCircle2, Database, KeyRound, MessageCircle, Sheet, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api, API_URL, getUser } from "../api";
import { Badge, ErrorState, Loading, PageHeader } from "../components/UI";

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const user = getUser();
  const load = () => api("/api/integrations/status").then(setStatus).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  if (!status && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  const integrations = [
    ["WhatsApp Business", MessageCircle, status.whatsapp.mode, status.whatsapp.configured, "Inbound webhooks, replies, and message history"],
    ["Google Sheets", Sheet, status.google_sheets.mode, status.google_sheets.configured, "Leads, follow-ups, dashboard metrics, and pivots"],
    ["AI Provider", Bot, status.ai.provider, status.ai.configured, "Scoring, replies, summaries, next actions, and risk"],
  ];
  return <div className="page-stack">
    <PageHeader title="Settings & integrations" description="Demo-safe defaults with explicit paths to production credentials." />
    <section className="settings-grid">
      <div className="panel account-card"><div className="panel-heading"><div><h3>Workspace owner</h3><p>Authentication and role context</p></div><ShieldCheck size={20} /></div><div className="profile-block"><div className="avatar large">PS</div><div><h3>{user?.name}</h3><p>{user?.email}</p><Badge tone="violet">{user?.role}</Badge></div></div><div className="setting-row"><KeyRound size={18} /><span><strong>Token authentication</strong><small>JWT access token with role checks</small></span><CheckCircle2 size={18} className="green-icon" /></div><div className="setting-row"><Database size={18} /><span><strong>API endpoint</strong><small>{API_URL}</small></span><CheckCircle2 size={18} className="green-icon" /></div></div>
      <div className="integration-cards">{integrations.map(([name, Icon, mode, configured, description]) => <article className="panel" key={name}><div className="integration-card-top"><div className="integration-logo small"><Icon size={21} /></div><Badge tone={configured ? "green" : "red"}>{configured ? "Ready" : "Needs credentials"}</Badge></div><h3>{name}</h3><p>{description}</p><div className="mode-row"><span>Current mode</span><code>{mode}</code></div></article>)}</div>
    </section>
    <section className="panel env-guide"><div><h3>Production configuration</h3><p>Copy <code>.env.example</code> to <code>.env</code>, add credentials locally, and keep the file out of Git. Every live provider is opt-in.</p></div><div className="env-list"><span>WHATSAPP_ACCESS_TOKEN</span><span>WHATSAPP_PHONE_NUMBER_ID</span><span>GOOGLE_SERVICE_ACCOUNT_FILE</span><span>GOOGLE_SPREADSHEET_ID</span><span>AI_API_KEY</span><span>DATABASE_URL</span></div></section>
  </div>;
}
