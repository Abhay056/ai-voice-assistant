import { useState, useEffect, useRef, useCallback } from 'react';

export const useTTS = () => {
  const workerRef = useRef<Worker>(null);
  const audioContextRef = useRef<AudioContext>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Initialize the worker
    // Workers should be in the `public` directory and referenced by their absolute path.
    // The worker file should be JavaScript, not TypeScript.
    workerRef.current = new Worker('../workers/tts.worker.js');

    // Initialize AudioContext. It must be created after a user gesture on some browsers.
    const initializeAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      document.removeEventListener('click', initializeAudioContext);
    };
    document.addEventListener('click', initializeAudioContext);

    const onMessage = async (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'init-complete':
          setIsReady(true);
          console.log('TTS Worker ready.');
          break;
        case 'audio-data':
          if (audioContextRef.current) {
            // The worker should send back both the audio data and the sample rate.
            const { audioData, sampleRate } = payload as { audioData: Float32Array; sampleRate: number };
            const audioBuffer = audioContextRef.current.createBuffer(
              1, // number of channels
              audioData.length,
              sampleRate
            );
            audioBuffer.getChannelData(0).set(audioData);

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            source.onended = () => {
              setIsSpeaking(false);
            };
          }
          break;
        case 'error':
          console.error('TTS Worker Error:', payload);
          setIsSpeaking(false);
          break;
      }
    };

    workerRef.current.onmessage = onMessage;

    // Initialize the TTS model in the worker
    workerRef.current.postMessage({
      type: 'init',
      payload: {
        modelPath: '/models/tts/model.onnx',
        configPath: '/models/tts/config.json',
        vocabPath: '/models/tts/vocab.json',
      },
    });

    return () => {
      workerRef.current?.terminate();
      audioContextRef.current?.close();
      document.removeEventListener('click', initializeAudioContext);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (isReady && workerRef.current && !isSpeaking) {
      setIsSpeaking(true);
      workerRef.current.postMessage({ type: 'speak', payload: { text } });
    }
  }, [isReady, isSpeaking]);

  return { speak, isReady, isSpeaking };
};