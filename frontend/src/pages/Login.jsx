import { ArrowRight, BarChart3, Check, MessageCircle, Sheet, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession } from "../api";

export default function Login() {
  const [email, setEmail] = useState("param5saxena@gmail.com");
  const [password, setPassword] = useState("Demo@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data);
      window.dispatchEvent(new Event("clientpulse:session"));
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="login-brand"><span><Sparkles size={19} /></span>ClientPulse CRM</div>
        <div className="login-copy">
          <p className="eyebrow">WhatsApp-first revenue operations</p>
          <h1>Turn every enquiry into a visible next step.</h1>
          <p>One focused workspace for WhatsApp leads, owner follow-ups, AI-assisted replies, and Google Sheets reporting.</p>
          <div className="login-feature-grid">
            <article><MessageCircle /><strong>Shared WhatsApp context</strong><span>Keep conversations connected to pipeline movement.</span></article>
            <article><BarChart3 /><strong>Live revenue visibility</strong><span>See conversion, source quality, and agent momentum.</span></article>
            <article><Sheet /><strong>Sheets, without double work</strong><span>Sync clean, pivot-ready CRM data when your team needs it.</span></article>
          </div>
        </div>
        <div className="login-proof"><Check size={17} /> Demo mode works with no paid credentials</div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-login-brand"><Sparkles size={20} /> ClientPulse CRM</div>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your workspace</h2>
          <p className="muted">Use the prefilled admin account to explore the complete demo.</p>
          <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button login-button" disabled={loading}>
            {loading ? "Signing in..." : "Open workspace"}<ArrowRight size={18} />
          </button>
          <div className="demo-credentials">
            <span>Demo admin</span>
            <code>param5saxena@gmail.com / Demo@123</code>
          </div>
        </form>
        <p className="login-owner">Built by Param Saxena · Production-ready demo workspace</p>
      </section>
    </div>
  );
}
