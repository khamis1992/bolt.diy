import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class LongCatProvider extends BaseProvider {
  name = 'LongCat';
  getApiKeyLink = 'https://longcat.ai/';

  config = {
    apiTokenKey: 'LONGCAT_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'gpt-4o',
      label: 'GPT-4o (LongCat)',
      provider: 'LongCat',
      maxTokenAllowed: 128000,
    },
    {
      name: 'gpt-4o-mini',
      label: 'GPT-4o Mini (LongCat)',
      provider: 'LongCat',
      maxTokenAllowed: 128000,
    },
    {
      name: 'claude-3-5-sonnet-20241022',
      label: 'Claude 3.5 Sonnet (LongCat)',
      provider: 'LongCat',
      maxTokenAllowed: 200000,
    },
    {
      name: 'gemini-2.0-flash-exp',
      label: 'Gemini 2.0 Flash (LongCat)',
      provider: 'LongCat',
      maxTokenAllowed: 1000000,
    },
  ];

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'LONGCAT_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    // LongCat uses OpenAI-compatible API
    const longcat = createOpenAI({
      apiKey,
      baseURL: 'https://api.longcat.ai/v1',
    });

    return longcat(model);
  }
}

