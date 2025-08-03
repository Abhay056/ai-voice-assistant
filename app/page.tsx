// app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';

interface Latencies {
  stt?: number;
  llm?: number;
  tts?: number;
  total?: number;
}

export default function Home() {
  const [status, setStatus] = useState('Idle. Press Record.');
  const [transcript, setTranscript] = useState('');
  const [latencies, setLatencies] = useState<Latencies>({});
  const [isRecording, setIsRecording] = useState(false);

  // Worker and stream refs
  const sttWorker = useRef<Worker | null>(null);
  const ttsWorker = useRef<Worker | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Performance timer
  const timer = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    // This code runs once when the component mounts
    console.log("Initializing workers...");
    
    // Check if window is defined (for server-side rendering safety)
    if (typeof window !== 'undefined') {
      sttWorker.current = new Worker('/workers/stt.worker.js', { type: 'module' });
      ttsWorker.current = new Worker('/workers/tts.worker.js', { type: 'module' });
      audioContextRef.current = new AudioContext();

      const handleWorkerMessages = (event: MessageEvent) => {
        console.log("Message from worker:", event.data);
        const { status } = event.data;

        if (status === 'progress') {
          setStatus(`Loading ${event.data.file}... ${Math.round(event.data.progress)}%`);
        } else if (status === 'complete' && event.data.transcript) {
          // STT completion
          timer.current.sttEnd = performance.now();
          setLatencies(prev => ({ ...prev, stt: timer.current.sttEnd - timer.current.start }));
          setTranscript(event.data.transcript);
          setStatus('Transcribed. Thinking...');
          handleFinalTranscript(event.data.transcript);
        } else if (status === 'complete' && event.data.audio) {
          // TTS completion
          timer.current.ttsEnd = performance.now();
          setLatencies(prev => ({ ...prev, tts: timer.current.ttsEnd - timer.current.llmEnd }));
          setStatus('Synthesized. Playing audio...');
          playAudio(event.data.audio, event.data.sampling_rate);
        }
      };

      sttWorker.current.addEventListener('message', handleWorkerMessages);
      ttsWorker.current.addEventListener('message', handleWorkerMessages);
    }

    return () => {
      // Cleanup on component unmount
      sttWorker.current?.terminate();
      ttsWorker.current?.terminate();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleFinalTranscript = async (text: string) => {
    if (!text.trim()) {
      setIsRecording(false);
      setStatus('Idle. Press Record.');
      return;
    }
    
    timer.current.llmStart = performance.now();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    });
    timer.current.llmEnd = performance.now();
    setLatencies(prev => ({...prev, llm: timer.current.llmEnd - timer.current.llmStart}));

    const data = await response.json();
    setStatus('Received reply. Synthesizing audio...');
    ttsWorker.current?.postMessage({ text: data.reply });
  };

  const playAudio = (audioData: Float32Array, samplingRate: number) => {
    if (!audioContextRef.current) return;
    const audioContext = new AudioContext({ sampleRate: samplingRate });
    const buffer = audioContext.createBuffer(1, audioData.length, samplingRate);
    buffer.copyToChannel(audioData, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    timer.current.playbackStart = performance.now();
    setLatencies(prev => ({...prev, total: timer.current.playbackStart - timer.current.start }));

    source.start();
    source.onended = () => {
      setStatus('Idle. Press Record.');
      setIsRecording(false);
      audioContext.close();
    };
  };

  const startRecording = async () => {
    setIsRecording(true);
    setStatus('Getting microphone...');
    
    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(streamRef.current);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        timer.current.start = performance.now();
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        const arrayBuffer = await audioBlob.arrayBuffer();
        if (!audioContextRef.current) return;
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        const pcmData = audioBuffer.getChannelData(0);
        
        setStatus('Transcribing...');
        sttWorker.current?.postMessage({ audio: pcmData });
      };

      mediaRecorder.current.start();
      setStatus('Recording...');
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Error: Could not start recording.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Offline 🎙️ AI Voice Assistant 🗣</h1>
        <p className={styles.status}>{status}</p>

        <div className={styles.buttonContainer}>
          <button onClick={startRecording} disabled={isRecording} className={`${styles.button} ${styles.recordButton}`}>🎤 Record</button>
          <button onClick={stopRecording} disabled={!isRecording} className={`${styles.button} ${styles.stopButton}`}>🔴 Stop</button>
        </div>

        <div className={styles.transcriptContainer}>
          <h2 className={styles.transcriptTitle}>Transcript</h2>
          <p className={styles.transcript}>{transcript || '...'}</p>
        </div>

        <div className={styles.latencyContainer}>
          <h3 className={styles.latencyTitle}>📊 Latency Breakdown</h3>
          <p>STT: {latencies.stt ? `${Math.round(latencies.stt)}ms` : 'N/A'}</p>
          <p>LLM API: {latencies.llm ? `${Math.round(latencies.llm)}ms` : 'N/A'}</p>
          <p>TTS: {latencies.tts ? `${Math.round(latencies.tts)}ms` : 'N/A'}</p>
          <p className={styles.latencyText}>Total Time to Playback: {latencies.total ? `${(latencies.total / 1000).toFixed(2)}s` : 'N/A'}</p>
        </div>
      </div>
    </main>
  );
}