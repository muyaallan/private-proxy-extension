export type ProxyProfile = {
  id: string;
  name: string;
  country?: string;
  host: string;
  port: number;
  username: string;
  enabled: boolean;
};

export type ConnectionStatus =
  | "disconnected"
  | "configuring"
  | "connecting"
  | "connected"
  | "authentication-error"
  | "proxy-error"
  | "configuration-conflict";

export type GeoInfo = {
  country?: string;
  city?: string;
  timezone?: string;
};

export type ProxyState = {
  status: ConnectionStatus;
  activeProfileId?: string;
  publicIp?: string;
  geo?: GeoInfo;
  lastError?: string;
};

export type Message =
  | { type: "CONNECT_PROXY"; profile: ProxyProfile; password: string }
  | { type: "DISCONNECT_PROXY" }
  | { type: "GET_STATE" }
  | { type: "VERIFY_IP" }
  | { type: "LIST_PROFILES" }
  | { type: "SAVE_PROFILE"; profile: ProxyProfile }
  | { type: "DELETE_PROFILE"; id: string }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: AppSettings };

export type AppSettings = { mode: BrowsingMode };
  export type BrowsingMode = "speed" | "balanced" | "data_saver";

  export type MessageResponse =
  | { ok: true; state: ProxyState }
  | { ok: true; profiles: ProxyProfile[] }
  | { ok: false; error: string };
// Add to the bottom of src/shared/types.ts

export type BrowsingMode = "speed" | "balanced" | "data_saver";

export type AppSettings = {
  mode: BrowsingMode;
};

