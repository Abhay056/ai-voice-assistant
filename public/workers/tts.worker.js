// public/workers/tts.worker.js
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

class TTSPipeline {
  static task = 'text-to-speech';
  // Using a small, fast model from Hugging Face Hub
  static model = 'Xenova/speecht5_tts';
  static vocoder = 'Xenova/speecht5_vocoder';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Load the pipeline
      this.instance = await pipeline(this.task, this.model, {
        vocoder: this.vocoder,
        progress_callback,
      });
    }
    return this.instance;
  }
}

self.onmessage = async (event) => {
  try {
    const synthesizer = await TTSPipeline.getInstance((x) => {
      self.postMessage(x); // Post model loading progress
    });

    const text = event.data.text;

    // We need some speaker embeddings for SpeechT5
    const speaker_embeddings = 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors-extracted/resolve/main/slt_arctic_xvector.bin';

    // Generate audio and send it back
    const output = await synthesizer(text, { speaker_embeddings });

    self.postMessage({
      status: 'complete',
      audio: output.audio, // Float32Array
      sampling_rate: output.sampling_rate,
    });
  } catch (e) {
    self.postMessage({ status: 'error', message: e.message });
  }
};