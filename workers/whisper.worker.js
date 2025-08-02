import { pipeline, env } from '@xenova/transformers';

// Skip local model check to use the remote models.
// This is necessary for the web worker environment.
env.allowLocalModels = false;

class WhisperPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en'; // Using tiny English-only model for speed
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    try {
        const { type, audio } = event.data;

        if (type === 'init') {
            // Initialize the pipeline
            await WhisperPipeline.getInstance(x => {
                self.postMessage(x);
            });
            self.postMessage({ status: 'ready' });
            return;
        }

        if (type === 'transcribe') {
            if (!audio) {
                throw new Error("No audio data received");
            }

            const transcriber = await WhisperPipeline.getInstance();

            // `chunk_length_s` is a key parameter for streaming.
            // `stride_length_s` helps overlap chunks to avoid losing words at the edges.
            const output = await transcriber(audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: false, // Timestamps not needed for this use case
            });

            self.postMessage({ status: 'complete', transcript: output.text });
        }
    } catch (e) {
        self.postMessage({ status: 'error', message: e.message });
    }
});