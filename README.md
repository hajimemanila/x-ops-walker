# X-Ops Walker

**X-Ops Walker** is a high-precision, minimalist Firefox navigation extension designed to eliminate mouse dependency. Walk through the web with zero-latency keyboard control, built on a strict TypeScript architecture.

---

## ⌨️ Universal Key Bindings

These bindings are active across all websites (Base Protocol).

### Single Press

| Key | Action |
| :--- | :--- |
| **ESC** | Toggle Walker Mode |
| **W / S** | Smooth Scroll (Up / Down) |
| **A / D** | Previous / Next Tab (bypasses restricted pages) |
| **Space** | Next Tab · **Shift+Space**: Previous Tab |
| **Q** | History Back |
| **E** | History Forward |
| **Z** | DOM Reset (blur focus) & Scroll to Top |
| **Alt + Z** | **[Emergency]** Force Focus Recovery to Document Body |
| **F** | Toggle Cheatsheet (HUD) |
| **P** | Toggle Phantom Mode Master (Domain Protocols ON/OFF) |

### Shift + Key

| Keys | Action |
| :--- | :--- |
| **Shift + X** | Close Current Tab |
| **Shift + Z** | Restore Last Closed Tab |
| **Shift + R** | Reload Tab |
| **Shift + M** | Mute / Unmute Tab |
| **Shift + G** | Discard All Background Tabs (Except Pinned & Vetoed) |
| **Shift + T** | Close All Other Tabs (Except Active & Pinned) |
| **Shift + W** | Scroll to Top (smooth) |
| **Shift + S** | Scroll to Bottom (smooth) |
| **Shift + A** | Go to First Tab |
| **Shift + D** | Duplicate Tab (preserves container & session) |

---

## 🎭 Domain-Specific Protocols (Phantom Mode)

X-Ops Walker dynamically adapts its behavior based on the site you are visiting (Context-Aware UI & Routing).

### X.com / Twitter (X Timeline Walker)
When visiting X.com, Walker injects a highly optimized spatial navigation engine and custom HUD:
- **J / K**: Navigate timeline posts (bypasses ads/reposts if configured).
- **L / O / B**: Like, Repost, Bookmark.
- **C**: Copy tweet text directly to clipboard.
- **N / M**: Toggle Star & Navigate Starred Bookmarks (Firefox Multi-Account Containers fully supported).
- **Backspace (Hold)**: DRS Delete (Automated deletion sequence).
- **/**, **I**, **U**, **Y**, **;**: Quick navigation to Search, Notifications, Bookmarks, Profile, and Compose.

### AI Chat Interfaces (Gemini, ChatGPT, Claude)
- Automatically scrolls to the bottom of the chat dynamically via `Z`.
- Middleware prevents accidental submissions (see Chat SafetyEnter).

---

## 🔥 Core Design Principles & Architecture

- **Stateless DOM-Driven Navigation**: Does not cache positions in memory. Calculates the exact DOM spatial coordinates in real-time (JIT) to prevent scrolling desync.
- **Smart Tab Discard (ALM)**: Automatically hibernates background tabs to save memory. Uses a "Vital Heartbeat" (Veto) system to prevent discarding tabs that are currently playing media or have unsaved text input.
- **Multi-Account Container Isolation**: Intelligently separates system configuration (`chrome.storage.local`) from user-context data (`window.localStorage`). Your X.com bookmarks and states remain perfectly isolated between your work and personal Firefox Containers without cross-contamination.
- **Active Focus Shield**: Intercepts and blocks aggressive Single Page Applications (SPAs) from stealing focus when you switch tabs, keeping your keyboard commands valid.
- **Zero Layout Residue**: HUD and Cheatsheets are rendered inside closed `Shadow DOM` trees and use `display: none` when hidden—leaving no invisible layers that could swallow clicks on React UIs.

---

## 🛡️ Security Guard Clause (Absolute Pass-through)

Walker Mode is **automatically suppressed** when the focused element matches any of the following. No Walker action fires, and no key event is modified:

| Condition | Covered Cases |
| :--- | :--- |
| `type="password"` | Login / account password fields |
| `autocomplete` contains `password` or `cc-*` | Payment forms, credit card inputs |
| `isContentEditable` | Tweet composer, rich-text editors |
| `INPUT / TEXTAREA / SELECT` | All standard text-input elements |
| `role="textbox"` | Custom editor components |

> **Purpose**: To dispel keylogger concerns and prevent unintended Walker actions (scroll, tab-switch, etc.) during sensitive input.

---

## 🔒 Privacy Declaration

> **This extension makes zero external network requests.**
>
> - No `fetch()`, `XMLHttpRequest`, `WebSocket`, or any other outgoing connection is present in the source code.
> - All logic runs entirely within the browser. No data is collected, stored externally, or transmitted.
> - **The GitHub repository is the complete and authoritative source of truth.** The installed extension is built directly from it with no additional dependencies injected at runtime.
> - Permissions used: `storage` (persist state), `tabs`, `sessions` (undo-close), `tabHide`, `alarms` (ALM heartbeat).

---

## 🧩 Optional Features (Middleware)

Available via the Extension Popup:

* **Chat SafetyEnter**: Prevents accidental message sending in AI chats (ChatGPT, Gemini, Claude). When enabled, pressing `Enter` alone does nothing. You must press `Ctrl + Enter` (or `Cmd + Enter`) to force send the message.
* **Block Google One Tap**: Suppresses Google One Tap / GSI login popups across all sites via injected CSS to prevent them from stealing keyboard focus.

---

## 🏗 Build

src/          TypeScript source files
dist/         Build output — load this folder into Firefox via about:debugging
_locales/     i18n message files (en / ja)

```bash
npm install        # install devDependencies (esbuild, type defs)
npm run build      # production build → dist/
npm run watch      # incremental watch build
```

**Loading in Firefox:**

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/manifest.json`

---

## 📜 License

MIT License.