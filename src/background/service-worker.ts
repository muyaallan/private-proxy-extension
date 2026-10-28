import { connectProxy, disconnectProxy, verifyIp } from "./proxy-controller";
import { installProxyAuthHandler } from "./proxy-auth";
import {
  getState,
  listProfiles,
  saveProfile,
  deleteProfile,
} from "../services/storage-service";
import { getSettings, saveSettings, applySettingsToBrowser } from "../services/settings-service";

console.log("[SW] Service worker script loaded");

installProxyAuthHandler();

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await applySettingsToBrowser(settings);
});

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await applySettingsToBrowser(settings);
});

chrome.runtime.onMessage.addListener(
  (message: any, _sender, sendResponse: (r: any) => void) => {
    console.log("[SW] Received message:", message);
    
    (async () => {
      try {
        switch (message.type) {
          case "CONNECT_PROXY": {
            const state = await connectProxy(message.profile, message.password);
            sendResponse({ ok: true, state });
            return;
          }
          case "DISCONNECT_PROXY": {
            const state = await disconnectProxy();
            sendResponse({ ok: true, state });
            return;
          }
          case "GET_STATE": {
            sendResponse({ ok: true, state: await getState() });
            return;
          }
          case "VERIFY_IP": {
            sendResponse({ ok: true, state: await verifyIp() });
            return;
          }
          case "LIST_PROFILES": {
            sendResponse({ ok: true, profiles: await listProfiles() });
            return;
          }
          case "SAVE_PROFILE": {
            await saveProfile(message.profile);
            sendResponse({ ok: true, profiles: await listProfiles() });
            return;
          }
          case "DELETE_PROFILE": {
            await deleteProfile(message.id);
            sendResponse({ ok: true, profiles: await listProfiles() });
            return;
          }
          case "GET_SETTINGS": {
            const settings = await getSettings();
            sendResponse({ ok: true, settings });
            return;
          }
          case "SAVE_SETTINGS": {
            await saveSettings(message.settings);
            sendResponse({ ok: true });
            return;
          }
          default: {
            console.error("[SW] Unknown message type:", message.type);
            sendResponse({ ok: false, error: "Unknown message" });
          }
        }
      } catch (err) {
        console.error("[SW] Error handling message:", err);
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return true;
  }
);
