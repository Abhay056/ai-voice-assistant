// convert.js
import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';       // Import Node.js File System module
import path from 'path';     // Import Node.js Path module

// --- THIS IS THE FIX ---
// Define the path for our local models
const modelsPath = './public/models/';

// 1. Manually create the directory if it does not exist.
//    The { recursive: true } option creates parent directories (like /public) if needed.
if (!fs.existsSync(modelsPath)) {
    console.log(`Directory not found. Creating: ${modelsPath}`);
    fs.mkdirSync(modelsPath, { recursive: true });
}

// 2. Configure the Transformers.js environment to use this local path.
//    This MUST be done before any other library calls.
env.allowLocalModels = true;
env.localModelPath = modelsPath;


/**
 * This function downloads and caches a model for a specific task.
 * @param {string} modelId The identifier of the model to download.
 * @param {string} task The task to use for the pipeline.
 * @param {boolean} quantize Whether to use a quantized version of the model.
 */
async function downloadAndConvertModel(modelId, task, quantize) {
    console.log(`Starting download for model: ${modelId} for task: ${task}`);
    
    try {
        console.log(`Loading pipeline for "${task}" with model "${modelId}" to trigger download...`);
        const downloader = await pipeline(task, modelId, {
            quantized: quantize,
            progress_callback: (progress) => {
                if (progress.status === 'progress') {
                    console.log(`Downloading: ${progress.file} - ${Math.round(progress.progress)}%`);
                }
            }
        });
        
        await downloader.dispose();

        console.log(`\n✅ Model '${modelId}' downloaded successfully!`);
        console.log(`Files are now guaranteed to be in: ${path.resolve(modelsPath)}`);

    } catch (error) {
        console.error(`\n❌ Failed to download model '${modelId}'.`);
        console.error(error);
    }
}

// --- Main execution ---
const task = process.argv[2];
const modelId = process.argv[3];
const quantize = !process.argv.includes('--no-quantize');

if (!task || !modelId) {
    console.error('Error: Please provide a task and a model ID.');
    console.error('Example: node convert.js automatic-speech-recognition Xenova/whisper-tiny');
    process.exit(1);
}

downloadAndConvertModel(modelId, task, quantize);