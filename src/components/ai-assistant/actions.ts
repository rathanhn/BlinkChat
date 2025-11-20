'use server';

import { provideMovieSuggestions, type ProvideMovieSuggestionsInput, type ProvideMovieSuggestionsOutput } from '@/ai/flows/provide-movie-suggestions';
import { suggestChatTopics, type SuggestChatTopicsInput, type SuggestChatTopicsOutput } from '@/ai/flows/suggest-chat-topics';
import { offerStressManagementTips, type OfferStressManagementTipsInput, type OfferStressManagementTipsOutput } from '@/ai/flows/offer-stress-management-tips';
import { generateChatResponse, type GenerateChatResponseInput, type GenerateChatResponseOutput } from '@/ai/flows/generate-chat-response';


export async function getMovieSuggestions(input: ProvideMovieSuggestionsInput): Promise<ProvideMovieSuggestionsOutput> {
  try {
    return await provideMovieSuggestions(input);
  } catch (error: any) {
    console.error('Error in getMovieSuggestions:', error.message, error.stack);
    return { movieSuggestions: 'Sorry, I could not fetch movie suggestions at the moment.' };
  }
}

export async function getChatTopics(input: SuggestChatTopicsInput): Promise<SuggestChatTopicsOutput> {
  try {
    return await suggestChatTopics(input);
  } catch (error) {
    console.error('Error in getChatTopics:', error);
    return { topics: ['Sorry, I could not fetch chat topics right now.'] };
  }
}

export async function getStressTips(input: OfferStressManagementTipsInput): Promise<OfferStressManagementTipsOutput> {
  try {
    return await offerStressManagementTips(input);
  } catch (error) {
    console.error('Error in getStressTips:', error);
    return { tips: 'Sorry, I could not fetch stress tips at this time.' };
  }
}

export async function getChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> {
    try {
        return await generateChatResponse(input);
    } catch (error: any) {
        console.error('Error in getChatResponse:', error.message, error.stack);
        return { response: 'Sorry, I ran into an error. Please try again.' };
    }
}
