// OfferStressManagementTips.ts
'use server';

/**
 * @fileOverview A Genkit flow that provides stress management tips to the user.
 *
 * - offerStressManagementTips - A function that handles the process of offering stress management tips.
 * - OfferStressManagementTipsInput - The input type for the offerStressManagementTips function.
 * - OfferStressManagementTipsOutput - The return type for the offerStressManagementTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OfferStressManagementTipsInputSchema = z.object({
  query: z
    .string()
    .describe('The user query asking for stress management tips.'),
});
export type OfferStressManagementTipsInput = z.infer<typeof OfferStressManagementTipsInputSchema>;

const OfferStressManagementTipsOutputSchema = z.object({
  tips: z
    .string()
    .describe('Helpful tips on managing stress.'),
});
export type OfferStressManagementTipsOutput = z.infer<typeof OfferStressManagementTipsOutputSchema>;

export async function offerStressManagementTips(input: OfferStressManagementTipsInput): Promise<OfferStressManagementTipsOutput> {
  return offerStressManagementTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'offerStressManagementTipsPrompt',
  input: {schema: OfferStressManagementTipsInputSchema},
  output: {schema: OfferStressManagementTipsOutputSchema},
  prompt: `You are Blink AI, a helpful personal assistant for the Blink app. The Blink app is a social messaging platform with a "Blink Chat" module, developed by Rathan H N. Your purpose is to assist users within the context of the Blink app.

  Based on the user's query, offer helpful and actionable tips for managing stress.

  Query: {{{query}}}`,
});

const offerStressManagementTipsFlow = ai.defineFlow(
  {
    name: 'offerStressManagementTipsFlow',
    inputSchema: OfferStressManagementTipsInputSchema,
    outputSchema: OfferStressManagementTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
