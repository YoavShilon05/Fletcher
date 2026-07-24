import type { WebMscoreStatic } from './types';

// webmscore's UMD build (vendored to /webmscore/ by scripts/copy-webmscore.mjs)
// installs a global `WebMscore` and loads its own ~9 MB WASM in an internal Web
// Worker — which is why every instance method is async. We inject the script
// once, on demand (host only; followers never call this), and reuse the ready
// class thereafter.

declare global {
  interface Window {
    WebMscore?: WebMscoreStatic;
  }
}

let readyPromise: Promise<WebMscoreStatic> | null = null;

export function loadWebMscore(): Promise<WebMscoreStatic> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<WebMscoreStatic>((resolve, reject) => {
    const finish = (WM: WebMscoreStatic) =>
      WM.ready.then(() => resolve(WM)).catch(reject);

    if (window.WebMscore) {
      finish(window.WebMscore);
      return;
    }

    const script = document.createElement('script');
    script.src = '/webmscore/webmscore.js';
    script.async = true;
    script.onload = () => {
      if (window.WebMscore) finish(window.WebMscore);
      else reject(new Error('webmscore.js loaded but window.WebMscore is undefined'));
    };
    script.onerror = () =>
      reject(new Error('Failed to load /webmscore/webmscore.js — did copy-webmscore run?'));
    document.head.appendChild(script);
  });

  // Let a later attempt retry if this one failed (e.g. transient asset error).
  readyPromise.catch(() => {
    readyPromise = null;
  });

  return readyPromise;
}
