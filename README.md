# AI Voice Assistant (Next.js + TypeScript, PWA)
An offline-capable voice AI assistant in Next.js that streams mic input, transcribes it locally, queries a cloud LLM, synthesizes speech locally, and plays it back — all with tight performance constraints.

---

## Features:
- Next.js with TypeScript

- PWA support for offline capabilities

- Web Workers for STT and TTS

- Service Worker + Workbox for precaching

---

## Installation :
```
npm install --save-dev workbox-webpack-plugin webpack
npm install  @google/generative-ai @xenova/transformers
```
```
npm run dev
```