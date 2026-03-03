// scripts/build.mjs — X-Ops Walker cross-browser build script (esbuild JS API)
// Usage:
//   node scripts/build.mjs chrome          → dist/chrome/
//   node scripts/build.mjs firefox         → dist/firefox/
//   node scripts/build.mjs chrome --watch  → incremental watch mode
//   node scripts/build.mjs firefox --watch

import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

// ── Resolve project root (one level up from scripts/) ──────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Parse CLI args ─────────────────────────────────────────────────────────
const [, , target = 'chrome', ...flags] = process.argv;
const isWatch = flags.includes('--watch');

if (!['chrome', 'firefox'].includes(target)) {
    console.error(`[build] Unknown target "${target}". Use "chrome" or "firefox".`);
    process.exit(1);
}

const isFirefox = target === 'firefox';
const outDir = join(ROOT, 'dist', target);

console.log(`[build] Target: ${target}  │  Output: dist/${target}/  │  Watch: ${isWatch}`);

// ── Create output directory ────────────────────────────────────────────────
mkdirSync(outDir, { recursive: true });

// ── Source .ts entry points ────────────────────────────────────────────────
const entryPoints = [
    join(ROOT, 'src', 'kernel.ts'),
    join(ROOT, 'src', 'background.ts'),
    join(ROOT, 'src', 'popup.ts'),
];

// ── esbuild config ─────────────────────────────────────────────────────────
/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints,
    bundle: true,
    outdir: outDir,
    target: isFirefox ? 'firefox128' : 'chrome120',
    format: 'iife',
    // Firefox only: inject polyfill as first module in every bundle.
    // This ensures globalThis.chrome = browser before any extension code runs.
    inject: isFirefox ? [join(ROOT, 'src', 'browser-polyfill-entry.ts')] : [],
    // Define TARGET so source code can branch on it if needed (optional)
    define: {
        '__BUILD_TARGET__': JSON.stringify(target),
    },
    logLevel: 'info',
};

// ── Copy static assets ─────────────────────────────────────────────────────
function copyStatics() {
    // manifest.json (browser-specific)
    const manifestSrc = join(ROOT, 'manifests', `manifest.${target}.json`);
    copyFileSync(manifestSrc, join(outDir, 'manifest.json'));

    // popup.html
    copyFileSync(join(ROOT, 'popup.html'), join(outDir, 'popup.html'));

    // icons/
    copyDir(join(ROOT, 'icons'), join(outDir, 'icons'));

    // _locales/
    copyDir(join(ROOT, '_locales'), join(outDir, '_locales'));

    console.log(`[build] Static assets copied → dist/${target}/`);
}

/** Recursively copy a directory (node 16+: cpSync with recursive flag). */
function copyDir(src, dest) {
    cpSync(src, dest, { recursive: true });
}

// ── Build or Watch ─────────────────────────────────────────────────────────
if (isWatch) {
    copyStatics();
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log(`[build] Watching for changes... (Ctrl+C to stop)`);
} else {
    await esbuild.build(buildOptions);
    copyStatics();
    console.log(`[build] ✅ ${target} build complete → dist/${target}/`);
}
