'use server';

/**
 * @fileOverview A flow for suggesting chat topics to users in AI chats.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestChatTopicsInputSchema = z.object({
  interests: z
    .string()
    .describe('A comma separated list of interests the user has.'),
});
export type SuggestChatTopicsInput = z.infer<typeof SuggestChatTopicsInputSchema>;

const SuggestChatTopicsOutputSchema = z.object({
  topics: z
    .string()
    .array()
    .describe('An array of suggested conversation starters.'),
});
export type SuggestChatTopicsOutput = z.infer<typeof SuggestChatTopicsOutputSchema>;

export async function suggestChatTopics(input: SuggestChatTopicsInput): Promise<SuggestChatTopicsOutput> {
  return suggestChatTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChatTopicsPrompt',
  input: { schema: SuggestChatTopicsInputSchema },
  output: { schema: SuggestChatTopicsOutputSchema },
  
  // --- FIX: Added Model Configuration ---
  model: 'googleai/gemini-2.5-flash', 
  
  prompt: `You are Blink AI, a helpful personal assistant for the Blink app. The Blink app is a social messaging platform with a "Blink Chat" module, developed by Rathan H N. Your purpose is to assist users within the context of the Blink app.

  Generate an array of conversation starters based on the user's interests.
  Interests: {{interests}}`, // Standard Handlebars syntax
});

const suggestChatTopicsFlow = ai.defineFlow(
  {
    name: 'suggestChatTopicsFlow',
    inputSchema: SuggestChatTopicsInputSchema,
    outputSchema: SuggestChatTopicsOutputSchema,
  },
  async (input) => {
    // The model is now handled inside the 'prompt' definition above
    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error('Failed to generate topics.');
    }

    return output;
  }
);