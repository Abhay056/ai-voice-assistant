'use client';

import { useState } from 'react';
import { useTTS } from '../hooks/use-tts';

export const ChatComponent = () => {
  const [inputValue, setInputValue] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { speak, isReady: isTtsReady, isSpeaking } = useTTS();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setLlmResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputValue }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response from LLM');
      }

      const data = await res.json();
      setLlmResponse(data.reply);
      
      // Speak the response automatically
      if (isTtsReady) {
        speak(data.reply);
      } else {
        console.warn('TTS is not ready to speak.');
      }

    } catch (error) {
      console.error(error);
      setLlmResponse('Sorry, something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', textAlign: 'center', marginTop: '2rem' }}>
      <h2>Converting LLM Text to Audio</h2>
      <br />
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask something..."
          disabled={isLoading || isSpeaking}
          style={{ padding: '10px', marginRight: '10px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={isLoading || isSpeaking || !isTtsReady}
          style={{
            padding: '10px 20px',
            background: (isLoading || isSpeaking || !isTtsReady) ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: (isLoading || isSpeaking || !isTtsReady) ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
        <p>TTS Status: {isTtsReady ? (isSpeaking ? 'Speaking...' : 'Ready') : 'Loading...'}</p>
      </form>
      {llmResponse && (
        <div>
          <h2>Response:</h2>
          <p>{llmResponse}</p>
        </div>
      )}
    </div>
  );
};