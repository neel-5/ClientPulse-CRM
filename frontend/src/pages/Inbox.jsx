import { Bot, CheckCheck, MessageSquarePlus, MoreHorizontal, Search, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { ErrorState, Loading, Modal, PageHeader, formatDate } from "../components/UI";

export default function Inbox() {
  const [conversations, setConversations] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const load = () => api("/api/conversations").then((rows) => { setConversations(rows); if (!selectedId && rows.length) setSelectedId(rows[0].id); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const selected = conversations?.find((item) => item.id === selectedId) || conversations?.[0];
  const filtered = useMemo(() => conversations?.filter((item) => `${item.lead_name} ${item.business_name}`.toLowerCase().includes(search.toLowerCase())) || [], [conversations, search]);

  async function send(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    if (!input.value.trim()) return;
    await api("/api/whatsapp/send", { method: "POST", body: JSON.stringify({ lead_id: selected.lead_id, message: input.value }) });
    input.value = "";
    load();
  }
  async function draftReply() {
    setDrafting(true);
    const result = await api("/api/ai/reply", { method: "POST", body: JSON.stringify({ lead_id: selected.lead_id }) });
    document.querySelector("#inbox-message").value = result.draft;
    setDrafting(false);
  }
  async function receiveMock(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/whatsapp/mock-message", {
      method: "POST",
      body: JSON.stringify({ phone: form.get("phone"), name: form.get("name"), business_name: form.get("business_name"), message: form.get("message") }),
    });
    setMockOpen(false);
    load();
  }

  if (!conversations && !error) return <Loading />;
  if (error) return <ErrorState error={error} retry={load} />;
  return (
    <div className="page-stack inbox-page">
      <PageHeader title="WhatsApp inbox" description="A shared, lead-aware message workspace running safely in demo mode." action={() => setMockOpen(true)} actionLabel="Mock incoming message" actionIcon={MessageSquarePlus} />
      <section className="inbox-shell panel">
        <aside className="conversation-list">
          <label><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" /></label>
          <div>
            {filtered.map((item) => {
              const latest = item.messages.at(-1);
              return <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
                <div className="avatar">{item.lead_name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                <span><strong>{item.lead_name}</strong><small>{latest?.content}</small></span>
                <time>{formatDate(item.last_message_at, true)}</time>
                {!!item.unread_count && <b>{item.unread_count}</b>}
              </button>;
            })}
          </div>
        </aside>
        {selected ? <div className="chat-pane">
          <header>
            <div className="avatar">{selected.lead_name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
            <div><strong>{selected.lead_name}</strong><span>{selected.business_name} · {selected.phone}</span></div>
            <button className="icon-button"><MoreHorizontal size={20} /></button>
          </header>
          <div className="message-area">
            <div className="chat-day">Today</div>
            {selected.messages.map((message) => <div key={message.id} className={`bubble ${message.direction}`}><p>{message.content}</p><span>{formatDate(message.sent_at, true)} {message.direction === "outbound" && <CheckCheck size={14} />}</span></div>)}
          </div>
          <div className="ai-compose-bar"><Sparkles size={15} /><span>AI can draft a consultative reply from this thread.</span><button onClick={draftReply}>{drafting ? "Drafting..." : "Draft reply"}</button></div>
          <form className="message-composer" onSubmit={send}><button type="button" className="icon-button" onClick={draftReply}><Bot size={19} /></button><textarea id="inbox-message" name="message" rows="1" placeholder="Type a WhatsApp reply..." /><button className="send-button"><Send size={18} /></button></form>
        </div> : <div className="state-card">Select a conversation</div>}
      </section>
      {mockOpen && <Modal title="Simulate an incoming WhatsApp lead" onClose={() => setMockOpen(false)}><form className="form-grid" onSubmit={receiveMock}><label>Contact name<input name="name" defaultValue="Priya Nair" required /></label><label>Business<input name="business_name" defaultValue="Nair Wellness Studio" /></label><label>WhatsApp number<input name="phone" defaultValue="+919876500321" required /></label><label className="full">Incoming message<textarea name="message" defaultValue="Hi, I saw your CRM demo. Can it remind my team to follow up with clinic enquiries?" rows="4" required /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setMockOpen(false)}>Cancel</button><button className="primary-button">Receive message</button></div></form></Modal>}
    </div>
  );
}
