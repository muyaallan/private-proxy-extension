import React, { useEffect, useState } from "react";
import type { Message, MessageResponse, ProxyProfile } from "../shared/types";

function send(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message ?? "err" });
      else resolve(response);
    });
  });
}

const blank: ProxyProfile = {
  id: crypto.randomUUID(),
  name: "",
  host: "",
  port: 8080,
  username: "",
  enabled: true,
};

export default function Options() {
  const [profiles, setProfiles] = useState<ProxyProfile[]>([]);
  const [draft, setDraft] = useState<ProxyProfile>(blank);
  const [error, setError] = useState<string | undefined>();

  const reload = async () => {
    const res = await send({ type: "LIST_PROFILES" });
    if (res.ok && "profiles" in res) setProfiles(res.profiles);
  };

  useEffect(() => { reload(); }, []);

  const save = async () => {
    setError(undefined);
    if (!draft.name || !draft.host || !draft.port || !draft.username) {
      setError("name, host, port and username are required");
      return;
    }
    const res = await send({ type: "SAVE_PROFILE", profile: draft });
    if (res.ok && "profiles" in res) {
      setProfiles(res.profiles);
      setDraft({ ...blank, id: crypto.randomUUID() });
    } else if (!res.ok) {
      setError(res.error);
    }
  };

  const remove = async (id: string) => {
    const res = await send({ type: "DELETE_PROFILE", id });
    if (res.ok && "profiles" in res) setProfiles(res.profiles);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Private Proxy Manager — Profiles</h1>

      <h2>Add profile</h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input placeholder="Host" value={draft.host} onChange={(e) => setDraft({ ...draft, host: e.target.value })} />
        <input placeholder="Port" type="number" value={draft.port} onChange={(e) => setDraft({ ...draft, port: Number(e.target.value) })} />
        <input placeholder="Username" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
        <input placeholder="Country (optional)" value={draft.country ?? ""} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
        {error && <div style={{ color: "#b00020" }}>{error}</div>}
        <button onClick={save}>Save profile</button>
      </div>

      <h2>Saved profiles</h2>
      <ul>
        {profiles.map((p) => (
          <li key={p.id} style={{ marginBottom: 4 }}>
            <strong>{p.name}</strong> — {p.host}:{p.port} ({p.username})
            {" "}
            <button onClick={() => remove(p.id)}>Delete</button>
          </li>
        ))}
        {profiles.length === 0 && <li>No profiles yet</li>}
      </ul>
    </div>
  );
}
