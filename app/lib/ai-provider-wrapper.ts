/**
 * AI Provider Wrapper
 * Integrates the AI Provider Manager with the existing LLM system
 */

import { aiProviderManager } from './ai-provider-manager';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface AutoProviderOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Get the current provider and model automatically
 */
export function getAutoProvider(options: AutoProviderOptions = {}): {
  provider: any;
  model: string;
  providerName: string;
} {
  const currentProvider = aiProviderManager.getCurrentProvider();

  if (!currentProvider) {
    throw new Error('No AI provider available. Please check your API keys in .env.local');
  }

  const model = aiProviderManager.getBestModel();

  // Create OpenAI-compatible provider
  const provider = createOpenAI({
    apiKey: currentProvider.apiKey,
    baseURL: currentProvider.baseUrl,
    ...(currentProvider.name === 'OpenRouter' && {
      headers: {
        'HTTP-Referer': 'https://bolt.diy',
        'X-Title': 'Bolt.diy',
      },
    }),
  });

  return {
    provider,
    model,
    providerName: currentProvider.name,
  };
}

/**
 * Make an AI request with automatic provider switching
 */
export async function makeAutoAIRequest(messages: any[], options: AutoProviderOptions = {}): Promise<{
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  cost?: number;
}> {
  try {
    const response = await aiProviderManager.makeRequest({
      messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    return response;
  } catch (error: any) {
    console.error('[AI Wrapper] Error making request:', error);
    throw error;
  }
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus() {
  return aiProviderManager.getProviderStatus();
}

/**
 * Force a specific provider (for testing)
 */
export function forceProvider(providerKey: 'openrouter' | 'longcat' | 'deepseek'): boolean {
  return aiProviderManager.forceProvider(providerKey);
}

/**
 * Create a language model instance with auto-switching
 */
export function createAutoLanguageModel(options: AutoProviderOptions = {}): LanguageModelV1 {
  const { provider, model } = getAutoProvider(options);
  return provider(model);
}

