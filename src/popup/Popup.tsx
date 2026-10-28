import React, { useEffect, useState } from "react";
import type { Message, MessageResponse, ProxyProfile, ProxyState, BrowsingMode } from "../shared/types";

function sendOnce(message: Message | any): Promise<any> {
  return new Promise((resolve) => {
    // Guard against undefined values that Chrome cannot serialize
    try {
      JSON.stringify(message);
    } catch (e) {
      resolve({ ok: false, error: "Message contains non-serializable data" });
      return;
    }
    console.log("[Popup] Sending message:", message);
    chrome.runtime.sendMessage(message, (response: any) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message ?? "runtime error" });
      } else {
        resolve(response);
      }
    });
  });
}

async function send(message: Message | any): Promise<any> {
  let res = await sendOnce(message);
  if (!res.ok && /Receiving end does not exist|Could not establish connection/i.test(res.error)) {
    await new Promise((r) => setTimeout(r, 100));
    res = await sendOnce(message);
  }
  return res;
}

type FormState = {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  country: string;
};

const emptyForm: FormState = {
  name: "Primary Proxy",
  host: "212.111.221.58",
  port: "61234",
  username: "user_62ff0eea2bd2",
  password: "",
  country: "",
};

const css = {
  body: {
    margin: 0,
    padding: 0,
    width: "380px",
    height: "620px",
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    overflow: "hidden",
  },
  header: {
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    backgroundColor: "var(--header-bg)",
    backdropFilter: "blur(12px)",
    backgroundImage: "linear-gradient(to right, var(--header-bg) 0%, transparent 100%)",
  },
  main: {
    flex: 1, minHeight: 0,
    overflowY: "auto" as const,
    padding: "8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    backgroundImage: "radial-gradient(circle at 50% 0%, var(--glow) 0%, transparent 70%)",
  },
  card: {
    backgroundColor: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "8px",
    backdropFilter: "blur(16px)",
    position: "relative" as const,
    overflow: "hidden",
    boxShadow: "0 4px 20px -5px rgba(0,0,0,0.5)",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "4px",
    border: "1px solid var(--input-border)",
    backgroundColor: "var(--input-bg)",
    color: "var(--text)",
    fontSize: "12px",
    fontFamily: "monospace",
    boxSizing: "border-box" as const,
    outline: "none",
  },
  footer: {
    padding: "8px",
    borderTop: "1px solid var(--border)",
    backgroundColor: "var(--header-bg)",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  buttonSecondary: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--input-bg)",
    color: "var(--text)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "monospace",
    textTransform: "uppercase" as const,
  },
  buttonPrimary: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "none",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "monospace",
    letterSpacing: "1px"
  },
};

export default function Popup() {
  const [state, setState] = useState<ProxyState>({ status: "disconnected" });
  const [profiles, setProfiles] = useState<ProxyProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("__manual__");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  
  const [mode, setMode] = useState<BrowsingMode>("balanced");
  const [showPass, setShowPass] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const refresh = async () => {
    const s = await send({ type: "GET_STATE" });
    if (s.ok && "state" in s) setState(s.state);
    const p = await send({ type: "LIST_PROFILES" });
    if (p.ok && "profiles" in p) setProfiles(p.profiles);
    const m = await send({ type: "GET_SETTINGS" });
    if (m.ok && "settings" in m) setMode(m.settings.mode);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onChangeMode = async (newMode: BrowsingMode) => {
    setMode(newMode);
    await send({ type: "SAVE_SETTINGS", settings: { mode: newMode } });
  };

  const onSelect = (id: string) => {
    setSelectedId(id);
    if (id === "__manual__") {
      setForm(emptyForm);
      return;
    }
    const p = profiles.find((x) => x.id === id);
    if (p) {
      setForm({
        name: p.name,
        host: p.host,
        port: String(p.port),
        username: p.username,
        password: "",
        country: p.country ?? "",
      });
    }
  };

  const buildProfile = (): ProxyProfile | undefined => {
    if (!form.host || !form.port || !form.username) {
      setError("Host, port and username are required");
      return undefined;
    }
    const port = Number(form.port);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      setError("Port must be between 1 and 65535");
      return undefined;
    }
    const id = selectedId !== "__manual__" ? selectedId : crypto.randomUUID();
    return {
      id,
      name: form.name || `${form.host}:${form.port}`,
      host: form.host,
      port,
      username: form.username,
      country: form.country || undefined,
      enabled: true,
    };
  };

  const onConnect = async () => {
    setError(undefined);
    const profile = buildProfile();
    if (!profile) return;
    if (!form.password) {
      setError("Password required");
      return;
    }
    setBusy(true);
    const res = await send({ type: "CONNECT_PROXY", profile, password: form.password || "" });
    if (res.ok && "state" in res) setState(res.state);
    else if (!res.ok) setError(res.error);
    setForm((f) => ({ ...f, password: "" }));
    setBusy(false);
  };

  const onSave = async () => {
    setError(undefined);
    const profile = buildProfile();
    if (!profile) return;
    setBusy(true);
    const res = await send({ type: "SAVE_PROFILE", profile });
    if (res.ok && "profiles" in res) {
      setProfiles(res.profiles);
      setSelectedId(profile.id);
      // Show a success message briefly or change button state
      alert("Profile saved successfully!"); 
    } else if (!res.ok) setError(res.error);
    setBusy(false);
  };

  const onDisconnect = async () => {
    setBusy(true);
    setError(undefined);
    const res = await send({ type: "DISCONNECT_PROXY" });
    if (res.ok && "state" in res) setState(res.state);
    else if (!res.ok) setError(res.error);
    setBusy(false);
  };

  const onVerify = async () => {
    setIsVerifying(true);
    setError(undefined);
    const res = await send({ type: "VERIFY_IP" });
    if (res.ok && "state" in res) {
      setState(res.state);
      if (!res.state.publicIp) {
        setError("Failed to verify IP. Check your proxy credentials or connection.");
      }
    } else if (!res.ok) {
      setError(res.error);
    }
    setIsVerifying(false);
  };

  const isConnected = state.status === "connected";
  const locked = busy || isConnected;

  const themeVars = `:root { 
      --bg: #0f111a; 
      --text: #e2e8f0; 
      --border: #1e293b; 
      --header-bg: rgba(15, 17, 26, 0.8); 
      --card-bg: rgba(30, 41, 59, 0.4); 
      --card-border: rgba(56, 189, 248, 0.2); 
      --input-bg: rgba(15, 23, 42, 0.6); 
      --input-border: #334155; 
      --glow: rgba(56, 189, 248, 0.08);
    }`;

  return (
    <>
      <style>{themeVars}</style>
      <style>{`
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        @keyframes radar { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      
      <div style={css.body}>
        <header style={css.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #0284c7, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 0 12px rgba(37, 99, 235, 0.4)" }}>
              <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 }}>PROXY_NODE</h1>
              <p style={{ margin: 0, fontSize: 10, color: "var(--text)", opacity: 0.5, letterSpacing: 1 }}>SYS.STATUS.ONLINE</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span style={{ fontSize: 10, fontWeight: "bold", color: "#10b981", opacity: 0.8 }}>ONLINE</span>
          </div>
        </header>

        <main style={css.main}>
          <div style={{
            padding: "10px 14px", borderRadius: 6, border: "1px solid",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: isConnected ? "rgba(16, 185, 129, 0.05)" : "rgba(100, 116, 139, 0.05)",
            borderColor: isConnected ? "rgba(16, 185, 129, 0.4)" : "rgba(100, 116, 139, 0.3)",
            color: isConnected ? "#10b981" : "var(--text)",
            transition: "all 0.3s",
            boxShadow: isConnected ? "inset 0 0 15px rgba(16, 185, 129, 0.1)" : "none"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}>
                {isConnected && <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", border: "2px solid #10b981", animation: "radar 1.5s linear infinite" }} />}
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? "#10b981" : "#64748b", boxShadow: isConnected ? "0 0 8px #10b981" : "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 1 }}>{isConnected ? "SECURE_TUNNEL" : "DIRECT_CONNECTION"}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{isConnected ? "Encrypted routing active" : "Standby mode"}</div>
              </div>
            </div>
            <span style={{ fontSize: 10, padding: "3px 6px", borderRadius: 3, background: isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)", border: `1px solid ${isConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.3)"}` }}>
              {isConnected ? "HTTP" : "OFF"}
            </span>
          </div>

          <div style={css.card}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.15, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 1000 500" fill="none" stroke="var(--text)" strokeWidth="2" style={{ width: "100%", height: "100%" }}>
                <path d="M150,120 Q180,100 220,130 T280,180 T240,240 T160,220 Z" />
                <path d="M280,260 Q320,290 350,380 T320,440 T270,360 Z" />
                <path d="M450,110 Q500,80 580,120 T600,200 T480,220 Z" />
                <path d="M430,240 Q480,220 520,280 T480,380 T440,300 Z" />
                <path d="M620,100 Q720,80 820,140 T880,240 T750,280 T650,180 Z" />
                <path d="M780,320 Q840,310 880,360 T820,420 Z" />
              </svg>
            </div>

            <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.6, letterSpacing: 1 }}>Origin Node IP</div>
                <div style={{ fontSize: 18, fontWeight: "bold", marginTop: 4, color: "var(--text)" }}>
                  {state.publicIp || "---.---.---.---"}
                </div>
              </div>
              <div style={{ position: "relative", width: 36, height: 36, borderRadius: 6, background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", boxShadow: "0 0 10px rgba(56, 189, 248, 0.1)" }}>
                <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8", animation: "blink 2s infinite" }} />
                <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>COUNTRY</div>
                <div style={{ fontSize: 12, fontWeight: "bold" }}>{state.geo?.country || "---"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>CITY</div>
                <div style={{ fontSize: 12, fontWeight: "bold" }}>{state.geo?.city || "---"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>TIMEZONE</div>
                <div style={{ fontSize: 11, fontWeight: "bold" }}>{state.geo?.timezone || "---"}</div>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: "bold", opacity: 0.7, letterSpacing: 1, display: "block", marginBottom: 6 }}>ROUTING PROTOCOL</label>
            <select value={mode} onChange={(e) => onChangeMode(e.target.value as BrowsingMode)} style={css.input}>
              <option value="speed">SPEED_PRIORITY // No blocking</option>
              <option value="balanced">BALANCED // Block Trackers</option>
              <option value="data_saver">DATA_SAVER // Strict</option>
            </select>
          </div>

          <div style={css.card}>
            <div style={{ fontSize: 10, fontWeight: "bold", opacity: 0.7, letterSpacing: 1, marginBottom: 6 }}>NODE CONFIGURATION</div>
            
            <select value={selectedId} onChange={(e) => onSelect(e.target.value)} disabled={locked} style={{ ...css.input, marginBottom: 6, borderColor: "var(--card-border)" }}>
              <option value="__manual__">-- MANUAL_CONFIG --</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name} [{p.host}]</option>
              ))}
            </select>

            <div style={{ display: "grid", gap: 4 }}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={locked} style={css.input} />
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                <input placeholder="Host / IP" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} disabled={locked} style={css.input} />
                <input placeholder="Port" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} disabled={locked} style={css.input} />
              </div>
              <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={locked} style={css.input} />
              <div style={{ position: "relative" }}>
                <input placeholder="Password" type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={locked} style={{ ...css.input, paddingRight: 36 }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "var(--border)", border: "1px solid var(--input-border)", borderRadius: "3px", color: "#38bdf8", opacity: 1, cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", justifyContent: "center" }} title={showPass ? "Hide password" : "Show password"}>
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {error && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 8, padding: 6, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 4 }}>[ERR] {error}</div>}
            {state.lastError && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 8, padding: 6, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 4 }}>[ERR] {state.lastError}</div>}
          </div>
        </main>

        <footer style={css.footer}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={onSave} disabled={busy} style={css.buttonSecondary}>
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              {busy ? "Saving..." : "Save Node"}
            </button>
            <button onClick={onVerify} disabled={busy || isVerifying} style={css.buttonSecondary}>
              {isVerifying ? (
                 <svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              ) : (
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {isVerifying ? "Testing..." : "Verify"}
            </button>
          </div>
          <button 
            onClick={isConnected ? onDisconnect : onConnect} 
            disabled={busy}
            style={{
              ...css.buttonPrimary,
              background: isConnected ? "linear-gradient(to right, #e11d48, #be123c)" : "linear-gradient(to right, #0284c7, #2563eb)",
              boxShadow: isConnected ? "0 0 15px rgba(225, 29, 72, 0.4)" : "0 0 15px rgba(37, 99, 235, 0.4)"
            }}
          >
            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {isConnected ? "TERMINATE LINK" : "ESTABLISH LINK"}
          </button>
        </footer>
      </div>
    </>
  );
}






