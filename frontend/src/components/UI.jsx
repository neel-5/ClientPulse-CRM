import { AlertCircle, LoaderCircle, Plus, X } from "lucide-react";

export function PageHeader({ title, description, action, actionLabel = "Add new", actionIcon: Icon = Plus }) {
  return (
    <div className="page-header">
      <div><h2>{title}</h2><p>{description}</p></div>
      {action && <button className="primary-button" onClick={action}><Icon size={17} />{actionLabel}</button>}
    </div>
  );
}

export function Loading() {
  return <div className="state-card"><LoaderCircle className="spin" size={25} /><strong>Loading workspace</strong></div>;
}

export function ErrorState({ error, retry }) {
  return <div className="state-card error"><AlertCircle size={24} /><strong>{error}</strong>{retry && <button onClick={retry}>Retry</button>}</div>;
}

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className={`modal ${wide ? "modal-wide" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
        {children}
      </section>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Score({ value }) {
  const tone = value >= 80 ? "hot" : value >= 55 ? "warm" : "cold";
  return <span className={`score score-${tone}`}>{value}</span>;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDate(value, includeTime = false) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
