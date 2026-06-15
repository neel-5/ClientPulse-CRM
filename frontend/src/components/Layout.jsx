import {
  Bot,
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Inbox,
  KanbanSquare,
  LogOut,
  Menu,
  Search,
  Settings,
  Sheet,
  Sparkles,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../api";

const navigation = [
  ["Overview", "/", Gauge],
  ["Pipeline", "/pipeline", KanbanSquare],
  ["Leads", "/leads", UsersRound],
  ["WhatsApp Inbox", "/inbox", Inbox],
  ["Follow-ups", "/follow-ups", CalendarClock],
  ["Tasks", "/tasks", CheckSquare],
  ["Sheets Sync", "/sheets", Sheet],
  ["Automations", "/automations", Workflow],
  ["AI Assistant", "/ai", Bot],
  ["Settings", "/settings", Settings],
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser() || { name: "Param Saxena", role: "admin" };
  const current = navigation.find(([, path]) => path === location.pathname)?.[0] || "Lead workspace";

  function logout() {
    clearSession();
    window.dispatchEvent(new Event("clientpulse:session"));
    navigate("/login");
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          {!collapsed && <div><strong>ClientPulse</strong><span>CRM workspace</span></div>}
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <nav>
          {navigation.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              title={collapsed ? label : ""}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="user-mini">
              <div className="avatar">PS</div>
              <div><strong>{user.name}</strong><span>{user.role.replace("_", " ")}</span></div>
            </div>
          )}
          <button className="icon-button" title="Log out" onClick={logout}><LogOut size={18} /></button>
        </div>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div>
            <p className="eyebrow">ClientPulse / {current}</p>
            <h1>{current}</h1>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger"><Search size={17} /><span>Search leads...</span><kbd>Ctrl K</kbd></button>
            <div className="live-pill"><span /> Demo workspace live</div>
          </div>
        </header>
        <main><Outlet /></main>
      </div>
    </div>
  );
}
