import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./api";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import LeadDetail from "./pages/LeadDetail";
import Inbox from "./pages/Inbox";
import FollowUps from "./pages/FollowUps";
import Tasks from "./pages/Tasks";
import Sheets from "./pages/Sheets";
import Automations from "./pages/Automations";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";

function Protected({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const handler = () => refresh((value) => value + 1);
    window.addEventListener("clientpulse:unauthorized", handler);
    window.addEventListener("clientpulse:session", handler);
    return () => {
      window.removeEventListener("clientpulse:unauthorized", handler);
      window.removeEventListener("clientpulse:session", handler);
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={getToken() ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:leadId" element={<LeadDetail />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/sheets" element={<Sheets />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
