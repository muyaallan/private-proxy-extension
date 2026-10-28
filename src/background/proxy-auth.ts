import { getCredentials } from "../services/storage-service";
import { saveState } from "../services/storage-service";
import { AUTH_MAX_RETRIES } from "../shared/constants";

let retryCount = 0;
let cachedCreds: any = null;

// Listen for credential updates to keep them in memory (fast access)
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes["proxy.credentials"]) {
    cachedCreds = changes["proxy.credentials"].newValue;
    if (!cachedCreds) retryCount = 0;
  }
});

// Initial load
getCredentials().then(c => { cachedCreds = c; });

export function installProxyAuthHandler(): void {
  chrome.webRequest.onAuthRequired.addListener(
    (details, callback) => {
      if (!details.isProxy) {
        callback();
        return;
      }

      const creds = cachedCreds; // Fast memory read instead of async storage
      
      if (!creds) {
        // Fallback to async storage if memory is empty
        getCredentials().then(async (c) => {
          if (!c) { callback(); return; }
          cachedCreds = c;
          handleAuth(c, details, callback);
        }).catch(() => callback());
        return;
      }

      handleAuth(creds, details, callback);
    },
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
  );
}

async function handleAuth(creds: any, details: chrome.webRequest.WebAuthenticationChallengeDetails, callback: (res?: chrome.webRequest.BlockingResponse) => void) {
  const challenger = details.challenger;
  if (challenger?.host && challenger.host !== creds.host) { callback(); return; }
  if (challenger?.port && challenger.port !== creds.port) { callback(); return; }

  if (retryCount >= AUTH_MAX_RETRIES) {
    await saveState({
      status: "authentication-error",
      lastError: "Proxy credentials rejected (retry limit reached)",
    });
    callback();
    return;
  }
  retryCount++;

  callback({
    authCredentials: { username: creds.username, password: creds.password },
  });
}
