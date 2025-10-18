import { createScopedLogger } from '~/utils/logger';
import { streamText as originalStreamText } from './stream-text';
import type { Messages } from './stream-text';

const logger = createScopedLogger('provider-fallback');

/**
 * Provider fallback configuration
 * Priority order: OpenRouter (free models) -> LongCat -> DeepSeek
 */
const FALLBACK_PROVIDERS = [
  {
    provider: 'OpenRouter',
    models: [
      'google/gemini-2.0-flash-thinking-exp:free',
      'google/gemini-flash-1.5:free',
      'qwen/qwen-2.5-coder-32b-instruct:free',
      'meta-llama/llama-3.1-405b-instruct:free',
    ],
  },
  {
    provider: 'LongCat',
    models: ['gemini-2.0-flash-exp', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022'],
  },
  {
    provider: 'Deepseek',
    models: ['deepseek-coder', 'deepseek-chat'],
  },
];

/**
 * Check if error is related to quota/authentication issues
 */
function isQuotaOrAuthError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorString = String(error).toLowerCase();

  const quotaKeywords = [
    'quota',
    'rate limit',
    'insufficient',
    'exceeded',
    'authentication',
    'invalid api key',
    'unauthorized',
    '401',
    '403',
    '429',
  ];

  return quotaKeywords.some((keyword) => errorMessage.includes(keyword) || errorString.includes(keyword));
}

/**
 * Stream text with automatic provider fallback
 * If a provider fails due to quota/auth issues, automatically try the next provider
 */
export async function streamTextWithFallback(props: Parameters<typeof originalStreamText>[0]) {
  const { messages } = props;

  // Try each provider in order
  for (let i = 0; i < FALLBACK_PROVIDERS.length; i++) {
    const fallbackConfig = FALLBACK_PROVIDERS[i];
    const model = fallbackConfig.models[0]; // Use first model from provider

    try {
      logger.info(`Attempting to use provider: ${fallbackConfig.provider} with model: ${model}`);

      // Inject provider and model into the last user message
      const modifiedMessages = [...messages];
      const lastMessage = modifiedMessages[modifiedMessages.length - 1];

      if (lastMessage && lastMessage.role === 'user') {
        // Add provider and model metadata to message content
        const content =
          typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
        lastMessage.content = `[Model: ${model}]\n\n[Provider: ${fallbackConfig.provider}]\n\n${content}`;
      }

      // Try streaming with this provider
      const result = await originalStreamText({
        ...props,
        messages: modifiedMessages,
      });

      logger.info(`Successfully using provider: ${fallbackConfig.provider}`);
      return result;
    } catch (error: any) {
      logger.error(`Provider ${fallbackConfig.provider} failed:`, error.message);

      // If this is a quota/auth error and we have more providers to try, continue
      if (isQuotaOrAuthError(error) && i < FALLBACK_PROVIDERS.length - 1) {
        logger.info(`Quota/auth error detected, trying next provider...`);
        continue;
      }

      // If this is the last provider or not a quota error, throw
      if (i === FALLBACK_PROVIDERS.length - 1) {
        logger.error('All providers exhausted or failed');
        throw new Error(
          `All AI providers failed. Last error: ${error.message}. Please check your API keys or try again later.`,
        );
      }

      // For non-quota errors, throw immediately
      throw error;
    }
  }

  // Should never reach here, but just in case
  throw new Error('Failed to get response from any AI provider');
}

