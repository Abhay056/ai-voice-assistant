import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

class TTSPipeline {
    static task = 'text-to-speech';
    static model = 'Xenova/speecht5_tts';
    static vocoder = 'Xenova/speecht5_vocoder';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, {
                vocoder: this.vocoder,
                progress_callback,
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    try {
        const { type, text } = event.data;

        if (type === 'init') {
            await TTSPipeline.getInstance(x => self.postMessage({ status: 'progress', data: x }));
            self.postMessage({ status: 'ready' });
            return;
        }

        if (type === 'synthesize') {
            if (!text) return;

            const synthesizer = await TTSPipeline.getInstance();

            // Fetch and decode the speaker embedding
            const response = await fetch(
                'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin'
            );
            const arrayBuffer = await response.arrayBuffer();
            const speaker_embeddings = new Float32Array(arrayBuffer);

            const output = await synthesizer(text, { speaker_embeddings });

            // Send audio buffer back
            self.postMessage(
                { status: 'complete', audio: output.audio },
                [output.audio.buffer] // Transferable
            );
        }
    } catch (e) {
        console.error('[Worker Error]', e);
        self.postMessage({ status: 'error', message: e.message });
    }
});
