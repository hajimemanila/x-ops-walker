// Firefox polyfill entry point — injected by esbuild for Firefox builds ONLY.
// webextension-polyfill automatically assigns globalThis.chrome = browser,
// so all existing chrome.* calls work in Firefox without source modification.
import 'webextension-polyfill';
