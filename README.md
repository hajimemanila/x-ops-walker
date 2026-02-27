# X-Ops Walker

**X-Ops Walker** is a high-precision, minimalist Firefox navigation extension designed to eliminate mouse dependency. Walk through the web with zero-latency keyboard control, built on a strict TypeScript architecture.

---

## ⌨️ Key Bindings

### Single Press

| Key | Action |
| :--- | :--- |
| **ESC** | Toggle Walker Mode |
| **W / S** | Smooth Scroll (Up / Down) |
| **A / D** | Previous / Next Tab (bypasses restricted pages) |
| **Space** | Next Tab · **Shift+Space**: Previous Tab |
| **Q** | History Back |
| **E** | History Forward |
| **Z** | DOM Reset (blur focus) |
| **F** | Toggle Cheatsheet |

### Shift + Key

| Keys | Action |
| :--- | :--- |
| **Shift + X** | Close Current Tab |
| **Shift + Z** | Restore Last Closed Tab |
| **Shift + R** | Reload Tab |
| **Shift + M** | Mute / Unmute Tab |
| **Shift + G** | Discard All Background Tabs (except Pinned) |
| **Shift + 0** | Close All Other Tabs (except Active/Pinned) |
| **Shift + W** | Scroll to Top (smooth) |
| **Shift + V** | Scroll to Bottom (smooth) |
| **Shift + C** | Duplicate Tab (preserves container & session) |

---

## 🔥 Core Design Principles

- **Smart Bypass Engine**: Automatically skips restricted pages (`about:`, `moz-extension:`, etc.) during tab switching — you never get stuck.
- **Capture-Phase Listener**: The `keydown` listener runs at capture phase (`capture: true`) so Walker keys are intercepted before page scripts, preventing conflicts with site-native shortcuts (e.g., Twitter).
- **Zero Layout Residue**: HUD and Cheatsheet use `display: none` (not `pointer-events: none`) when hidden — the extension leaves no invisible layer that could swallow clicks on React/synthetic-event UIs.
- **Shadow DOM Isolation**: HUD and Cheatsheet are rendered inside closed Shadow DOM trees, fully immune to site CSS.
- **Type-Safe Architecture**: TypeScript + esbuild. Strict types eliminate runtime errors.
- **i18n**: UI labels are fully localized in English (default) and Japanese via `browser.i18n`.

---

## 🛡️ Security Guard Clause

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
> - Permissions used: `storage` (persist Walker Mode state), `tabs`, `sessions` (undo-close), `tabHide`.

---

## 🧩 Optional Feature: Block Google One Tap

The popup provides a toggle (default **OFF**) to suppress Google One Tap / GSI login popups across all sites. When enabled, the following elements are hidden via injected CSS:

- `iframe[src*="accounts.google.com/gsi/"]`
- `iframe[src*="smartlock.google.com"]`
- `#credential_picker_container`, `#google_one_tap_notification`

This prevents the One Tap iframe from stealing keyboard focus and disabling Walker keybinds.

---

## 🏗 Build

```
src/          TypeScript source files
dist/         Build output — load this folder into Firefox via about:debugging
_locales/     i18n message files (en / ja)
```

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
