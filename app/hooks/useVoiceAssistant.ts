import { useState, useEffect, useRef, useCallback } from 'react';

export type AssistantStatus =
    | 'idle'
    | 'initializing'
    | 'ready'
    | 'listening'
    | 'transcribing'
    | 'thinking'
    | 'synthesizing'
    | 'speaking';

export interface LatencyInfo {
    stt?: number;
    api?: number;
    tts?: number;
    playback?: number;
    total?: number;
}

export function useVoiceAssistant() {
    const [status, setStatus] = useState<AssistantStatus>('initializing');
    const [latencies, setLatencies] = useState<LatencyInfo>({});
    const [transcript, setTranscript] = useState('');
    const [llmResponse, setLlmResponse] = useState('');

    const whisperWorkerRef = useRef<Worker | null>(null);
    const ttsWorkerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const latencyTimers = useRef<{ [key: string]: number }>({});
    const totalStartTime = useRef<number>(0);

    const processAudio = useCallback(async (audioBlob: Blob) => {
        if (!whisperWorkerRef.current || status !== 'listening') return;

        setLatencies({});
        totalStartTime.current = performance.now();
        latencyTimers.current.stt = performance.now();
        setStatus('transcribing');

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audio = new Float32Array(arrayBuffer);

        whisperWorkerRef.current.postMessage({ type: 'transcribe', audio });
    }, [status]);

    useEffect(() => {
        if (!whisperWorkerRef.current) {
            whisperWorkerRef.current = new Worker(new URL('../../workers/whisper.worker.js', import.meta.url), { type: 'module' });
        }
        if (!ttsWorkerRef.current) {
            ttsWorkerRef.current = new Worker(new URL('../../workers/tts.worker.js', import.meta.url), { type: 'module' });
        }

        let whisperReady = false;
        let ttsReady = false;
        const checkReady = () => {
            if (whisperReady && ttsReady) {
                setStatus('ready');
            }
        };

        const onWhisperMessage = async (event: MessageEvent) => {
            const { status: workerStatus, transcript: newTranscript } = event.data;

            if (workerStatus === 'ready') {
                whisperReady = true;
                checkReady();
                return;
            }

            if (workerStatus === 'complete') {
                const sttLatency = performance.now() - latencyTimers.current.stt;
                setLatencies(prev => ({ ...prev, stt: sttLatency }));
                setTranscript(newTranscript);
                setStatus('thinking');

                try {
                    latencyTimers.current.api = performance.now();
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text: newTranscript }),
                    });

                    if (!res.ok) {
                        throw new Error(await res.text());
                    }

                    const { reply } = await res.json();

                    const apiLatency = performance.now() - latencyTimers.current.api;
                    setLatencies(prev => ({ ...prev, api: apiLatency }));
                    setLlmResponse(reply);

                    if (ttsWorkerRef.current) {
                        latencyTimers.current.tts = performance.now();
                        setStatus('synthesizing');
                        ttsWorkerRef.current.postMessage({ type: 'synthesize', text: reply });
                    }
                } catch (e) {
                    console.error("Error calling LLM API route:", e);
                    setStatus('ready');
                }
            }
        };

        const onTtsMessage = async (event: MessageEvent) => {
            const { status: workerStatus, audio } = event.data;

            if (workerStatus === 'ready') {
                ttsReady = true;
                checkReady();
                return;
            }

            if (workerStatus === 'complete') {
                const ttsLatency = performance.now() - latencyTimers.current.tts;
                latencyTimers.current.playback = performance.now();

                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const audioContext = audioContextRef.current;
                const buffer = audioContext.createBuffer(1, audio.length, audioContext.sampleRate);
                buffer.copyToChannel(audio, 0);

                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start();
                setStatus('speaking');

                const playbackLatency = performance.now() - latencyTimers.current.playback;
                const totalLatency = performance.now() - totalStartTime.current;

                setLatencies(prev => ({
                    ...prev,
                    tts: ttsLatency,
                    playback: playbackLatency,
                    total: totalLatency,
                }));

                source.onended = () => {
                    setStatus('ready');
                };
            }
        };

        whisperWorkerRef.current.addEventListener('message', onWhisperMessage);
        ttsWorkerRef.current.addEventListener('message', onTtsMessage);

        // Initialize workers
        whisperWorkerRef.current.postMessage({ type: 'init' });
        ttsWorkerRef.current.postMessage({ type: 'init' });

        return () => {
            whisperWorkerRef.current?.terminate();
            ttsWorkerRef.current?.terminate();
            audioContextRef.current?.close();
        };
    }, []);

    return {
        status,
        latencies,
        transcript,
        llmResponse,
        startListening: () => setStatus('listening'),
        stopListening: () => setStatus('idle'), // Or 'processing'
        processAudio,
    };
}