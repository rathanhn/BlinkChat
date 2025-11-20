import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Optional: Debug log to confirm your API key is being read correctly
console.log("Genkit AI initialized. GOOGLE_API_KEY available:", !!process.env.GOOGLE_API_KEY);

export const ai = genkit({
  // 1. Initialize the Google AI plugin
  plugins: [googleAI({ apiKey: process.env.GOOGLE_API_KEY })],
  
  // 2. Set the default model for all flows (using the correct namespace)
  model: 'googleai/gemini-2.5-flash', 
});