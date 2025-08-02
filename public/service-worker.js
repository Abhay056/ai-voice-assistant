self.__WB_MANIFEST; // Injected by workbox

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("ai-cache").then((cache) =>
      cache.addAll([
        "/whisper/whisper.wasm",
        "/tts/model.bin", // Your Coqui model files
        // etc.
      ])
    )
  );
});
