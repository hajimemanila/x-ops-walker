# X-Ops Walker (Browser Extension)

**X-Ops Walker** is a high-precision, minimalist navigation tool designed to eliminate mouse dependency. It allows you to "walk through the web" with zero-latency keyboard control, built on a robust TypeScript architecture.

Unlike standard extensions, Fox Walker features a smart bypass engine that prevents you from getting stuck on restricted pages like `about:addons` or `addons.mozilla.org`.

## 🔥 Core Philosophies

- **Smart Navigation**: Automatically detects and skips "restricted zones" (`about:`, `chrome:`, `moz-extension:`, etc.) to ensure seamless tab switching.
- **Robust Walker Mode (ESC)**: 
    - Instant toggle via `Escape` key.
    - Built-in `event.repeat` guard to prevent state-flip errors caused by hardware key-repeat.
- **Resource Mastery**: 
    - **00 (Clean up)**: Purges all tabs except the active one and "Pinned" tabs.
    - **GG (Discard)**: Suspends all background tabs (except Pinned) to reclaim memory without losing your workspace.
- **Shadow DOM HUD**: A custom Glassmorphism HUD isolated via Shadow DOM. Visual feedback (Pulse Animation) is immune to the CSS of the websites you visit.
- **Type-Safe Logic**: Engineered with TypeScript + esbuild. Strict type definitions eliminate runtime errors and ensure reliable command execution.

## ⌨️ Key Bindings

| Key | Action |
| :--- | :--- |
| **ESC** | Toggle Walker Mode |
| **W / S** | Smooth Scroll (Up / Down) |
| **A / D** | Previous / Next Tab (Bypass restricted pages) |
| **Space** | Next Tab (Shift+Space: Previous) |
| **XX** (Double-tap) | Close Current Tab |
| **ZZ** (Double-tap) | Undo Close Tab (Restore Session) |
| **RR** (Double-tap) | Reload Current Tab |
| **MM** (Double-tap) | Mute / Unmute Tab |
| **GG** (Double-tap) | Discard all tabs (except Active/Pinned) |
| **00** (Double-tap) | Close all tabs (except Active/Pinned) |

## 🏗 Development & Build

### Structure
- `src/`: TypeScript source files (Logic).
- `dist/`: Build artifacts (Load this folder into Firefox).

### Setup
```bash
# Install dependencies
npm install

# Production Build
npm run build

# Development (Watch Mode)
npm run watch
```

## 🔒 Privacy & Security

X-Ops Walker implements a **Security Guard Clause** that immediately exits all key processing when the focused element is:

| Condition | Example |
| :--- | :--- |
| `type="password"` field | Login / account password inputs |
| `autocomplete` contains `password` or `cc-*` | Payment forms, credit card fields |
| `isContentEditable` element | Rich-text editors, inline editors |

**No input data is ever read, stored, or transmitted.** Walker Mode is automatically suppressed on sensitive fields — keystrokes from password or payment forms are never intercepted or processed by this extension.

## 📜 License
MIT License.
