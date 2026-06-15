import { ChevronDown, ExternalLink, Filter, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Badge, ErrorState, Loading, Modal, PageHeader, Score, formatCurrency, formatDate } from "../components/UI";

const stages = ["New", "Contacted", "Interested", "Demo Scheduled", "Won", "Lost"];
const sources = ["Manual", "WhatsApp", "Referral", "Website", "Google Ads", "Instagram", "LinkedIn"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search, stage, sort });
      setLeads(await api(`/api/leads?${query}`));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { const timer = setTimeout(load, 180); return () => clearTimeout(timer); }, [search, stage, sort]);

  async function createLead(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        business_name: form.get("business_name"),
        phone: form.get("phone"),
        email: form.get("email"),
        source: form.get("source"),
        value: Number(form.get("value")),
      }),
    });
    setShowCreate(false);
    load();
  }

  return (
    <div className="page-stack">
      <PageHeader title="Lead workspace" description="Search, qualify, assign, and move every opportunity forward." action={() => setShowCreate(true)} actionLabel="Create lead" />
      <section className="filter-toolbar">
        <label className="search-field"><Search size={17} /><input placeholder="Search name, business, or phone" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <label className="select-field"><Filter size={16} /><select value={stage} onChange={(e) => setStage(e.target.value)}><option value="">All stages</option>{stages.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} /></label>
        <label className="select-field"><SlidersHorizontal size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="-created_at">Newest first</option><option value="-value">Highest value</option><option value="-score">Highest score</option><option value="name">Name A-Z</option></select><ChevronDown size={15} /></label>
        <span className="result-count">{leads.length} leads</span>
      </section>
      {loading ? <Loading /> : error ? <ErrorState error={error} retry={load} /> : (
        <section className="panel table-panel">
          <div className="responsive-table">
            <table>
              <thead><tr><th>Lead</th><th>Stage</th><th>Source</th><th>Score</th><th>Value</th><th>Next follow-up</th><th /></tr></thead>
              <tbody>{leads.map((lead) => (
                <tr key={lead.id}>
                  <td><div className="lead-cell"><div className="avatar">{lead.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><strong>{lead.name}</strong><span>{lead.business_name || lead.phone}</span></div></div></td>
                  <td><Badge tone={lead.stage === "Won" ? "green" : lead.stage === "Lost" ? "neutral" : lead.stage === "Interested" ? "amber" : "blue"}>{lead.stage}</Badge></td>
                  <td>{lead.source}</td>
                  <td><Score value={lead.score} /></td>
                  <td><strong>{formatCurrency(lead.value)}</strong></td>
                  <td>{formatDate(lead.next_follow_up, true)}</td>
                  <td><Link className="table-action" to={`/leads/${lead.id}`}><ExternalLink size={16} /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
      {showCreate && (
        <Modal title="Create a new lead" onClose={() => setShowCreate(false)}>
          <form className="form-grid" onSubmit={createLead}>
            <label>Contact name<input name="name" placeholder="e.g. Priya Malhotra" required /></label>
            <label>Business name<input name="business_name" placeholder="e.g. Growth Academy" /></label>
            <label>WhatsApp number<input name="phone" placeholder="+91 98765 43210" required /></label>
            <label>Email<input name="email" type="email" placeholder="priya@example.com" /></label>
            <label>Lead source<select name="source">{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Opportunity value<input name="value" type="number" min="0" defaultValue="25000" /></label>
            <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="primary-button">Create lead</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
