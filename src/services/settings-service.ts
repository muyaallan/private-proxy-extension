import type { AppSettings, BrowsingMode } from "../shared/types";

const SETTINGS_KEY = "app.settings";

export async function getSettings(): Promise<AppSettings> {
  const r = await chrome.storage.local.get(SETTINGS_KEY);
  return (r[SETTINGS_KEY] as AppSettings) ?? { mode: "balanced" };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  await applySettingsToBrowser(settings);
}

export async function applySettingsToBrowser(settings: AppSettings): Promise<void> {
  // 1. Enable/disable tracker blocking based on mode
  const enableTrackers = settings.mode === "balanced" || settings.mode === "data_saver";
  
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enableTrackers ? ["trackers"] : [],
      disableRulesetIds: enableTrackers ? [] : ["trackers"],
    });
  } catch (err) {
    console.error("Failed to update rulesets", err);
  }

  // Note on Data Saver: Blocking all images/video via declarativeNetRequest 
  // is aggressive and breaks many sites. For this private extension, we 
  // leave actual image blocking off for now, but the mode is saved so we 
  // can add it later if needed. Tracking is blocked in both modes.
}
