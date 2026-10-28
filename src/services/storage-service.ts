import {
  SESSION_CREDENTIALS_KEY,
  SESSION_PREVIOUS_PROXY_KEY,
  SESSION_STATE_KEY,
  LOCAL_PROFILES_KEY,
  LOCAL_ACTIVE_PROFILE_KEY,
} from "../shared/constants";
import type { ProxyProfile, ProxyState } from "../shared/types";

export type StoredCredentials = {
  host: string;
  port: number;
  username: string;
  password: string;
};

// --- session storage (memory-only, cleared on browser restart) ---

export async function saveCredentials(c: StoredCredentials): Promise<void> {
  await chrome.storage.session.set({ [SESSION_CREDENTIALS_KEY]: c });
}

export async function getCredentials(): Promise<StoredCredentials | undefined> {
  const r = await chrome.storage.session.get(SESSION_CREDENTIALS_KEY);
  return r[SESSION_CREDENTIALS_KEY] as StoredCredentials | undefined;
}

export async function clearCredentials(): Promise<void> {
  await chrome.storage.session.remove(SESSION_CREDENTIALS_KEY);
}

export async function savePreviousProxyConfig(
  config: chrome.proxy.ProxyConfig,
  levelOfControl: string
): Promise<void> {
  await chrome.storage.session.set({
    [SESSION_PREVIOUS_PROXY_KEY]: { config, levelOfControl },
  });
}

export async function getPreviousProxyConfig(): Promise<
  { config: chrome.proxy.ProxyConfig; levelOfControl: string } | undefined
> {
  const r = await chrome.storage.session.get(SESSION_PREVIOUS_PROXY_KEY);
  return r[SESSION_PREVIOUS_PROXY_KEY] as
    | { config: chrome.proxy.ProxyConfig; levelOfControl: string }
    | undefined;
}

export async function clearPreviousProxyConfig(): Promise<void> {
  await chrome.storage.session.remove(SESSION_PREVIOUS_PROXY_KEY);
}

export async function saveState(state: ProxyState): Promise<void> {
  await chrome.storage.session.set({ [SESSION_STATE_KEY]: state });
}

export async function getState(): Promise<ProxyState> {
  const r = await chrome.storage.session.get(SESSION_STATE_KEY);
  return (r[SESSION_STATE_KEY] as ProxyState) ?? { status: "disconnected" };
}

// --- local storage (persistent profile metadata; no passwords) ---

export async function listProfiles(): Promise<ProxyProfile[]> {
  const r = await chrome.storage.local.get(LOCAL_PROFILES_KEY);
  return (r[LOCAL_PROFILES_KEY] as ProxyProfile[]) ?? [];
}

export async function saveProfile(profile: ProxyProfile): Promise<ProxyProfile[]> {
  const existing = await listProfiles();
  const idx = existing.findIndex((p) => p.id === profile.id);
  const next =
    idx >= 0
      ? existing.map((p) => (p.id === profile.id ? profile : p))
      : [...existing, profile];
  await chrome.storage.local.set({ [LOCAL_PROFILES_KEY]: next });
  return next;
}

export async function deleteProfile(id: string): Promise<ProxyProfile[]> {
  const existing = await listProfiles();
  const next = existing.filter((p) => p.id !== id);
  await chrome.storage.local.set({ [LOCAL_PROFILES_KEY]: next });
  return next;
}

export async function setActiveProfileId(id: string | undefined): Promise<void> {
  if (id === undefined) {
    await chrome.storage.local.remove(LOCAL_ACTIVE_PROFILE_KEY);
  } else {
    await chrome.storage.local.set({ [LOCAL_ACTIVE_PROFILE_KEY]: id });
  }
}

export async function getActiveProfileId(): Promise<string | undefined> {
  const r = await chrome.storage.local.get(LOCAL_ACTIVE_PROFILE_KEY);
  return r[LOCAL_ACTIVE_PROFILE_KEY] as string | undefined;
}
