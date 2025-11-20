'use server';

/**
 * @fileOverview An AI agent that provides movie suggestions based on user interests.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProvideMovieSuggestionsInputSchema = z.object({
  interests: z
    .string()
    .describe('The interests of the user, comma separated, which can be used to tailor the movie suggestions.'),
});
export type ProvideMovieSuggestionsInput = z.infer<
  typeof ProvideMovieSuggestionsInputSchema
>;

const ProvideMovieSuggestionsOutputSchema = z.object({
  movieSuggestions: z
    .string()
    .describe('A list of movie suggestions based on the user interests.'),
});
export type ProvideMovieSuggestionsOutput = z.infer<
  typeof ProvideMovieSuggestionsOutputSchema
>;

// --- FIX 1: Define the Prompt ---
// The prompt function created here is already executable.
const movieSuggestionPrompt = ai.definePrompt({
  name: 'provideMovieSuggestionsPrompt',
  input: { schema: ProvideMovieSuggestionsInputSchema },
  output: { schema: ProvideMovieSuggestionsOutputSchema },
  // Note: Ensure your prompt template syntax matches your Genkit version (Handlebars {{...}} is standard)
  prompt: `You are Blink AI, a helpful personal assistant for the Blink app. The Blink app is a social messaging platform with a "Blink Chat" module, developed by Rathan H N. Your purpose is to assist users within the context of the Blink app.

  A user will provide their interests, and you will recommend movies to them.

  Interests: {{interests}}

  Provide a list of movies that the user may enjoy.`,
});

export async function provideMovieSuggestions(
  input: ProvideMovieSuggestionsInput
): Promise<ProvideMovieSuggestionsOutput> {
  return provideMovieSuggestionsFlow(input);
}

const provideMovieSuggestionsFlow = ai.defineFlow(
  {
    name: 'provideMovieSuggestionsFlow',
    inputSchema: ProvideMovieSuggestionsInputSchema,
    outputSchema: ProvideMovieSuggestionsOutputSchema,
  },
  async (input) => {
    try {
      console.log('provideMovieSuggestionsFlow: Calling prompt with input:', input);

      // --- FIX 2: Correct Execution Syntax ---
      // DO NOT wrap this in ai.prompt(). Call the prompt function directly.
      // You also need to specify the model here if it wasn't bound in definePrompt, 
      // or rely on the default model if configured. 
      // Since your flow had the model, we can pass it as an option to the prompt call.
      
      const { output } = await movieSuggestionPrompt(input, {
        model: 'googleai/gemini-2.5-flash' // <--- UPDATED MODEL NAME
      });

      console.log('provideMovieSuggestionsFlow: Received output from prompt:', output);
      return output!;
    } catch (error: any) {
      console.error('Error in provideMovieSuggestionsFlow (AI prompt):', error.message, error.stack);
      throw new Error('Failed to get movie suggestions from AI model.');
    }
  }
);