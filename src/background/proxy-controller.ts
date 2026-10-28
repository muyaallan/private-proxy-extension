import {
  saveCredentials,
  clearCredentials,
  saveState,
  getState,
  setActiveProfileId,
} from "../services/storage-service";
import {
  getProxySetting,
  setProxySetting,
  snapshotPreviousSetting,
  restorePreviousSettingIfSafe,
} from "./settings-restore";
import { checkPublicIp } from "./diagnostics";
import type { ProxyProfile, ProxyState } from "../shared/types";

export async function connectProxy(profile: ProxyProfile, password: string): Promise<ProxyState> {
  const before = await getProxySetting();
  if (
    before.levelOfControl === "controlled_by_other_extensions" ||
    before.levelOfControl === "not_controllable"
  ) {
    const conflict: ProxyState = {
      status: "configuration-conflict",
      lastError: `Chrome proxy settings controlled by: ${before.levelOfControl}`,
    };
    await saveState(conflict);
    return conflict;
  }

  await snapshotPreviousSetting();
  await saveState({ status: "configuring", activeProfileId: profile.id });

  try {
    await setProxySetting({
      mode: "fixed_servers",
      // Resolve DNS at the proxy level to avoid local DNS delays
      // Note: Chrome types may not include proxyDNS, but it is a valid PacScript/FixedServer property.
      // We cast to any to bypass TypeScript errors.
      ...({ proxyDNS: true } as any),
      rules: {
        singleProxy: {
          scheme: "http",
          host: profile.host,
          port: profile.port,
        },
        bypassList: ["localhost", "127.0.0.1"],
      },
    });
  } catch (err) {
    const failed: ProxyState = {
      status: "proxy-error",
      activeProfileId: profile.id,
      lastError: err instanceof Error ? err.message : String(err),
    };
    await saveState(failed);
    return failed;
  }

  await saveCredentials({
    host: profile.host,
    port: profile.port,
    username: profile.username,
    password,
  });
  await setActiveProfileId(profile.id);
  await saveState({ status: "connecting", activeProfileId: profile.id });
  
  const ipCheck = await checkPublicIp();

  if (!ipCheck.ok) {
    const failed: ProxyState = {
      status: "proxy-error",
      activeProfileId: profile.id,
      lastError: `Proxy applied but IP check failed: ${ipCheck.error}`,
    };
    await saveState(failed);
    return failed;
  }

  const connected: ProxyState = {
    status: "connected",
    activeProfileId: profile.id,
    publicIp: ipCheck.ip,
    geo: ipCheck.geo,
  };
  await saveState(connected);
  return connected;
}

export async function disconnectProxy(): Promise<ProxyState> {
  await clearCredentials();
  await setActiveProfileId(undefined);

  const restore = await restorePreviousSettingIfSafe();
  if (!restore.restored) {
    const failed: ProxyState = {
      status: "proxy-error",
      lastError: `Could not restore previous proxy setting: ${restore.reason}`,
    };
    await saveState(failed);
    return failed;
  }

  const disconnected: ProxyState = { status: "disconnected" };
  await saveState(disconnected);
  return disconnected;
}

export async function verifyIp(): Promise<ProxyState> {
  const state = await getState();
  const ipCheck = await checkPublicIp();
  const updated: ProxyState = ipCheck.ok
    ? { ...state, publicIp: ipCheck.ip, geo: ipCheck.geo }
    : { ...state, lastError: ipCheck.error };
  await saveState(updated);
  return updated;
}

