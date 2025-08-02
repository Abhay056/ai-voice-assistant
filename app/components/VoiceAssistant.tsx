'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

export default function VoiceAssistant() {
  const {
    status,
    latencies,
    transcript,
    llmResponse,
    startListening,
    stopListening,
    processAudio,
  } = useVoiceAssistant();

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleToggleRecording = async () => {
    if (!isRecording) {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      startListening();
      setIsRecording(true);
    } else {
      // Stop recording
      mediaRecorderRef.current?.stop();
    }
  };

  const LatencyDisplay = () => (
    <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '10px' }}>
      {latencies.stt && <div>🧠 STT: {latencies.stt.toFixed(0)}ms</div>}
      {latencies.api && <div>💬 API: {latencies.api.toFixed(0)}ms</div>}
      {latencies.tts && <div>🗣️ TTS: {latencies.tts.toFixed(0)}ms</div>}
      {latencies.total && (
        <div style={{ fontWeight: 'bold' }}>⚡ Total: {latencies.total.toFixed(0)}ms</div>
      )}
    </div>
  );

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', textAlign: 'center', marginTop: '10rem' }}>
      <h1>AI 🎙️ Voice Assistant 🗣</h1>
      <br />
      <button
        onClick={handleToggleRecording}
        style={{
          padding: '10px 20px',
          background: isRecording ? 'red' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        {isRecording ? '🛑 Stop' : '🎤 Start Talking'}
      </button>

      <div style={{ marginTop: 20 }}>
        <strong>Status:</strong> <code>{status}</code>
      </div>

      {transcript && (
        <div style={{ marginTop: 20 }}>
          <h3>🗣️ You said:</h3>
          <p>{transcript}</p>
        </div>
      )}

      {llmResponse && (
        <div style={{ marginTop: 20 }}>
          <h3>🤖 Assistant:</h3>
          <p>{llmResponse}</p>
        </div>
      )}

      <LatencyDisplay />
    </div>
  );
}
