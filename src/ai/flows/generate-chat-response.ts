'use server';

/**
 * @fileOverview A Genkit flow that generates a helpful response to a user's query.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateChatResponseInputSchema = z.object({
  query: z.string().describe('The user query to respond to.'),
});
export type GenerateChatResponseInput = z.infer<typeof GenerateChatResponseInputSchema>;

const GenerateChatResponseOutputSchema = z.object({
  response: z.string().describe('A helpful response to the user query.'),
});
export type GenerateChatResponseOutput = z.infer<typeof GenerateChatResponseOutputSchema>;

export async function generateChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> {
  return generateChatResponseFlow(input);
}

// --- FIX: Added 'model' property ---
const prompt = ai.definePrompt({
  name: 'generateChatResponsePrompt',
  input: { schema: GenerateChatResponseInputSchema },
  output: { schema: GenerateChatResponseOutputSchema },
  model: 'googleai/gemini-2.5-flash', // <--- CRITICAL FIX: Specifies the model your key can access
  prompt: `You are Blink AI, a helpful personal assistant for the Blink app. The Blink app is a social messaging platform with a "Blink Chat" module, developed by Rathan H N. Your purpose is to provide helpful, harmless, and informative responses to the user within the context of the Blink app.

  User Query: {{query}}
  
  Provide a helpful response.`,
});

const generateChatResponseFlow = ai.defineFlow(
  {
    name: 'generateChatResponseFlow',
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: GenerateChatResponseOutputSchema,
  },
  async (input) => {
    // Note: Because we defined the model in 'ai.definePrompt' above, 
    // we don't need to pass it again here.
    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error('AI generated a null response.');
    }
    
    return output;
  }
);