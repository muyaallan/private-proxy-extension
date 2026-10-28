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
