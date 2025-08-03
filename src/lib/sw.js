// src/lib/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// Precache all the assets defined in the manifest injected by Workbox
precacheAndRoute(self.__WB_MANIFEST || []);

// --- PRECACHE HEAVY ASSETS ---
// Manually add the files to be precached.
// Place your WASM and model files in the /public directory.
// The URLs should be relative to the public directory.
const PRECACHE_ASSETS = [
    '/models/whisper-tiny.en.wasm', // Example Whisper WASM
    '/models/tts-model.onnx',     // Example TTS model
    '/models/tts-vocoder.onnx',   // Example TTS vocoder
];
precacheAndRoute(PRECACHE_ASSETS.map(url => ({ url, revision: null })));

// Example: A runtime caching rule for fonts or other assets
registerRoute(
  ({url}) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);