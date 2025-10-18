/**
 * Auto Stream Text
 * Wrapper for stream-text that uses automatic provider switching
 */

import { streamText as originalStreamText } from './stream-text';
import { getAutoProvider } from '~/lib/ai-provider-wrapper';
import type { StreamingOptions } from './stream-text';

/**
 * Stream text with automatic provider selection
 */
export async function streamText(props: {
  messages: any[];
  env?: any;
  options?: StreamingOptions;
  apiKeys?: Record<string, string>;
  files?: any;
  providerSettings?: any;
  promptId?: string;
  contextOptimization?: boolean;
  contextFiles?: any;
  summary?: string;
  messageSliceId?: number;
  chatMode?: 'discuss' | 'build';
  designScheme?: any;
}) {
  try {
    // Get auto provider
    const { provider, model, providerName } = getAutoProvider({
      temperature: 0.7,
      maxTokens: 4096,
    });

    console.log(`[Auto Stream] Using provider: ${providerName}, model: ${model}`);

    // Use the original streamText with auto-selected provider
    return await originalStreamText({
      ...props,
      // Override with auto-selected provider and model
      options: {
        ...props.options,
        model: provider(model),
      },
    });
  } catch (error: any) {
    console.error('[Auto Stream] Error:', error);
    throw error;
  }
}

// Re-export types from original stream-text
export type { Messages, StreamingOptions } from './stream-text';

