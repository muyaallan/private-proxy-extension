import {
  savePreviousProxyConfig,
  getPreviousProxyConfig,
  clearPreviousProxyConfig,
} from "../services/storage-service";

export type ProxyGetResult = {
  config: chrome.proxy.ProxyConfig;
  levelOfControl: chrome.types.ChromeSettingLevelOfControl;
};

export function getProxySetting(): Promise<ProxyGetResult> {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.get({ incognito: false }, (details) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve({
        config: details.value,
        levelOfControl: details.levelOfControl,
      });
    });
  });
}

export function setProxySetting(config: chrome.proxy.ProxyConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

export async function snapshotPreviousSetting(): Promise<ProxyGetResult> {
  const current = await getProxySetting();
  // Save the current config regardless of control level so we can restore it later.
  await savePreviousProxyConfig(current.config, current.levelOfControl);
  return current;
}

export async function restorePreviousSettingIfSafe(): Promise<
  { restored: true } | { restored: false; reason: string }
> {
  const previous = await getPreviousProxyConfig();
  if (!previous) {
    return { restored: false, reason: "No previous setting saved" };
  }

  const current = await getProxySetting();
  if (current.levelOfControl !== "controlled_by_this_extension") {
    // Someone else took control; do not overwrite.
    return {
      restored: false,
      reason: `Proxy setting is now controlled by: ${current.levelOfControl}`,
    };
  }

  await setProxySetting(previous.config);
  await clearPreviousProxyConfig();
  return { restored: true };
}
