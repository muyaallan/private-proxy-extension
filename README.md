# Private Proxy Manager

A Chrome extension that routes your browser traffic through a proxy server while blocking known trackers. Built with Vite, React 19, TypeScript, and Manifest V3.

---

## Overview

Private Proxy Manager combines two privacy tools into one:

1. **Authenticated HTTP proxy** — Route browser traffic through your own proxy server with optional username/password authentication.
2. **Tracker blocking** — Block known advertising and analytics domains using Chrome's native declarativeNetRequest ruleset.

The proxy can be toggled on or off from the toolbar popup. When off, browser traffic goes direct. Tracker blocking is controlled independently via the extension's options page.

---

## Features

- **One-click proxy toggle** — Enable or disable the proxy from the toolbar popup.
- **Proxy authentication** — Supports username and password for proxies that require it. Credentials are stored locally and supplied via `webRequestAuthProvider`.
- **Tracker blocking** — Ships with a curated `declarativeNetRequest` ruleset for known trackers, ad networks, and analytics domains.
- **Settings persistence** — Proxy configuration survives browser restarts via `chrome.storage`.
- **Options page** — Configure the proxy server host, port, and credentials.
- **React UI** — Popup and options page built with React 19 and TypeScript.
- **MV3 service worker** — Background logic runs as an ES module service worker.

---

## Installation (Development)

### Prerequisites

- Chrome 114 or later (Manifest V3)
- Node.js 18+

### Build and load

```bash
git clone https://github.com/muyaallan/private-proxy-extension.git
cd private-proxy-extension
npm install
npm run build
```

Then:

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `dist/` folder.
4. The extension icon appears in your toolbar. Pin it for quick access.

### Development build

```bash
npm run dev
```

This starts Vite in watch mode. After each rebuild, reload the extension in `chrome://extensions` and refresh any tab you're testing on.

---

## Usage

### Enable the proxy

1. Click the extension icon to open the popup.
2. Toggle the proxy switch on.
3. The popup shows the current proxy server and connection status.

### Configure the proxy server

1. Open the options page (right-click the extension icon, then **Options**, or click **Settings** in the popup).
2. Enter the proxy server host, port, and (if required) username and password.
3. Save. The settings are persisted in `chrome.storage` and applied the next time you enable the proxy.

### Toggle tracker blocking

The `trackers` ruleset is disabled by default in `manifest.json`. To enable it:

1. Open the options page.
2. Toggle **Block known trackers** on.
3. The extension updates the rule resource's enabled state via the `declarativeNetRequest` API.

Or, if you prefer it enabled by default, change `"enabled": false` to `"enabled": true` in `public/manifest.json` and rebuild.

---

## Project Structure

```text
private-proxy-extension/
├── public/
│   ├── manifest.json          # Extension manifest (MV3)
│   └── rules/
│       └── trackers.json      # Declarative Net Request ruleset
├── src/
│   ├── background/            # Service worker modules
│   │   ├── service-worker.ts  # Entry point, message router
│   │   ├── proxy-auth.ts      # onAuthRequired handler
│   │   ├── proxy-controller.ts# chrome.proxy.settings.set / clear
│   │   ├── diagnostics.ts     # Request and block counters
│   │   └── settings-restore.ts# Re-apply settings on browser start
│   ├── popup/                 # Toolbar popup
│   │   ├── Popup.tsx
│   │   └── main.tsx
│   ├── options/               # Options page
│   │   ├── Options.tsx
│   │   └── main.tsx
│   ├── services/              # Shared logic
│   │   ├── settings-service.ts
│   │   ├── storage-service.ts
│   │   └── diagnostics-service.ts
│   └── shared/
│       ├── constants.ts
│       └── types.ts
├── vite.config.ts             # Vite build for popup and options
├── vite.config.sw.ts          # Vite build for the service worker
├── tsconfig.json
├── package.json
└── LICENSE
```

---

## How it works

### Proxy flow

1. You enable the proxy from the popup.
2. `proxy-controller.ts` calls `chrome.proxy.settings.set()` with the configured proxy server.
3. For proxies that require authentication, `proxy-auth.ts` intercepts `onAuthRequired` events via `webRequest` and supplies credentials from storage.
4. All browser traffic routes through the proxy until you disable it.

### Tracker blocking

1. `public/rules/trackers.json` defines the blocked domains using Chrome's `declarativeNetRequest` format.
2. Chrome matches every outgoing request against the ruleset (when enabled).
3. Matches are blocked before leaving the browser, so no network call is made.
4. `diagnostics.ts` tracks blocked counts for display in the popup.

### Settings

Settings live in `chrome.storage.local` via `storage-service.ts`. On browser start, `settings-restore.ts` re-applies the last-known proxy state so you don't have to re-enable the proxy every time.

---

## Permissions

| Permission | Why |
| --- | --- |
| `proxy` | Configure the browser's proxy settings |
| `storage` | Persist proxy configuration, credentials, and preferences |
| `webRequest` | Observe requests so `onAuthRequired` can fire |
| `webRequestAuthProvider` | Supply credentials to authenticated proxies |
| `declarativeNetRequest` | Block tracker requests via the bundled ruleset |
| `<all_urls>` | Apply proxying to all browser traffic |

No data leaves your browser except through the proxy you configure. Diagnostics are local counters only.

---

## Security notes

- Proxy credentials are stored in `chrome.storage.local` and only leave the browser to authenticate with the proxy server you configured.
- No analytics, telemetry, or third-party network requests.
- The tracker ruleset is bundled with the extension; there is no remote fetch.
- Diagnostics counters are per-session and reset when the extension reloads.

---

## Development

### Scripts

```bash
npm run dev      # Watch mode build
npm run build    # Production build to dist/
npm run lint     # ESLint
```

### Rebuilding the tracker ruleset

To add or remove blocked domains, edit `public/rules/trackers.json` and rebuild:

```bash
npm run build
```

Then reload the extension in `chrome://extensions`.

---

## Testing checklist

Before publishing:

- [ ] Enable the proxy from the popup; verify traffic routes through it
- [ ] Disable the proxy; verify traffic goes direct
- [ ] Configure a proxy that requires authentication; verify `onAuthRequired` fires
- [ ] Enable tracker blocking; verify blocked requests are counted
- [ ] Restart the browser; verify the proxy state is restored
- [ ] Open the options page; save settings; verify they persist after reload
- [ ] Check the service worker console (`chrome://extensions` → Details → Service worker) for errors

---

## Publishing

1. Bump `version` in `public/manifest.json`.
2. Run `npm run build`.
3. Zip the **contents** of `dist/`, not the folder itself.
4. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
5. Provide a privacy policy URL. Chrome requires one for extensions that request the `proxy` permission.
6. Submit for review.

---

## License

MIT License

Copyright (c) 2026 Private Proxy Manager Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
