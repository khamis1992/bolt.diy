/**
 * AI Provider Manager
 * Automatically switches between OpenRouter, LongCat, and DeepSeek based on availability
 */

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
  priority: number;
  isAvailable: boolean;
  errorCount: number;
  lastError?: string;
  lastUsed?: Date;
}

export interface AIRequest {
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  provider: string;
  model: string;
  content: string;
  tokensUsed?: number;
  cost?: number;
}

class AIProviderManager {
  private static instance: AIProviderManager;
  private providers: Map<string, ProviderConfig> = new Map();
  private currentProvider: string = 'openrouter';
  private readonly MAX_RETRIES = 3;
  private readonly ERROR_THRESHOLD = 5;

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }

    return AIProviderManager.instance;
  }

  private initializeProviders() {
    // OpenRouter - Primary provider with free models
    this.providers.set('openrouter', {
      name: 'OpenRouter',
      apiKey: this.getEnvVar('OPENROUTER_API_KEY') || this.getEnvVar('OPEN_ROUTER_API_KEY') || '',
      baseUrl: 'https://openrouter.ai/api/v1',
      models: [
        'google/gemini-2.0-flash-thinking-exp:free', // Best for complex coding
        'qwen/qwen-2.5-coder-32b-instruct', // Best for code generation
        'google/gemini-flash-1.5', // Fast and reliable
        'meta-llama/llama-3.1-405b-instruct:free', // Large context
      ],
      priority: 1,
      isAvailable: true,
      errorCount: 0,
    });

    // LongCat - Secondary provider
    this.providers.set('longcat', {
      name: 'LongCat',
      apiKey: this.getEnvVar('LONGCAT_API_KEY') || '',
      baseUrl: 'https://api.longcat.ai/v1',
      models: [
        'gpt-4o-mini', // Default model for LongCat
        'gpt-4o',
        'claude-3-5-sonnet',
      ],
      priority: 2,
      isAvailable: true,
      errorCount: 0,
    });

    // DeepSeek - Fallback provider
    this.providers.set('deepseek', {
      name: 'DeepSeek',
      apiKey: this.getEnvVar('DEEPSEEK_API_KEY') || '',
      baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-coder'],
      priority: 3,
      isAvailable: true,
      errorCount: 0,
    });
  }

  private getEnvVar(key: string): string | undefined {
    // Try different environment access methods
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }

    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }

    return undefined;
  }

  /**
   * Get the current active provider
   */
  getCurrentProvider(): ProviderConfig | null {
    const provider = this.providers.get(this.currentProvider);

    if (!provider || !provider.isAvailable || !provider.apiKey) {
      return this.switchToNextProvider();
    }

    return provider;
  }

  /**
   * Switch to the next available provider
   */
  private switchToNextProvider(): ProviderConfig | null {
    const sortedProviders = Array.from(this.providers.values())
      .filter((p) => p.apiKey && p.isAvailable && p.errorCount < this.ERROR_THRESHOLD)
      .sort((a, b) => a.priority - b.priority);

    if (sortedProviders.length === 0) {
      // Reset error counts and try again
      this.resetProviders();
      return this.getCurrentProvider();
    }

    const nextProvider = sortedProviders[0];
    this.currentProvider = Array.from(this.providers.entries()).find(([_, p]) => p === nextProvider)?.[0] || 'openrouter';

    console.log(`[AI Manager] Switched to provider: ${nextProvider.name}`);

    return nextProvider;
  }

  /**
   * Reset all providers (clear error counts)
   */
  private resetProviders() {
    this.providers.forEach((provider) => {
      provider.errorCount = 0;
      provider.isAvailable = true;
    });
    console.log('[AI Manager] Reset all providers');
  }

  /**
   * Mark a provider as failed
   */
  private markProviderFailed(providerKey: string, error: string) {
    const provider = this.providers.get(providerKey);

    if (provider) {
      provider.errorCount++;
      provider.lastError = error;

      if (provider.errorCount >= this.ERROR_THRESHOLD) {
        provider.isAvailable = false;
        console.log(`[AI Manager] Provider ${provider.name} marked as unavailable after ${provider.errorCount} errors`);
      }
    }
  }

  /**
   * Get the best model for the current provider
   */
  getBestModel(providerKey?: string): string {
    const provider = providerKey ? this.providers.get(providerKey) : this.getCurrentProvider();

    if (!provider || provider.models.length === 0) {
      return 'gpt-4o-mini'; // Default fallback
    }

    return provider.models[0];
  }

  /**
   * Make an AI request with automatic provider switching
   */
  async makeRequest(request: AIRequest): Promise<AIResponse> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      const provider = this.getCurrentProvider();

      if (!provider) {
        throw new Error('No available AI providers. Please check your API keys.');
      }

      try {
        const model = this.getBestModel();
        const response = await this.callProvider(provider, model, request);

        // Mark provider as successful
        provider.lastUsed = new Date();

        return {
          provider: provider.name,
          model,
          ...response,
        };
      } catch (error: any) {
        lastError = error;
        attempts++;

        console.error(`[AI Manager] Error with ${provider.name}:`, error.message);

        // Check if it's a rate limit or quota error
        if (this.isQuotaError(error)) {
          console.log(`[AI Manager] ${provider.name} quota exhausted, switching provider...`);
          this.markProviderFailed(this.currentProvider, 'Quota exhausted');
          this.switchToNextProvider();
        } else if (this.isAuthError(error)) {
          console.log(`[AI Manager] ${provider.name} authentication failed, switching provider...`);
          this.markProviderFailed(this.currentProvider, 'Authentication failed');
          this.switchToNextProvider();
        } else {
          // Generic error, increment counter but don't switch immediately
          this.markProviderFailed(this.currentProvider, error.message);
        }

        // Wait before retry
        await this.sleep(1000 * attempts);
      }
    }

    throw new Error(
      `Failed to get AI response after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Call a specific provider
   */
  private async callProvider(
    provider: ProviderConfig,
    model: string,
    request: AIRequest,
  ): Promise<{ content: string; tokensUsed?: number; cost?: number }> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        ...(provider.name === 'OpenRouter' && {
          'HTTP-Referer': 'https://bolt.diy',
          'X-Title': 'Bolt.diy',
        }),
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
        stream: request.stream || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens,
      cost: this.calculateCost(provider.name, model, data.usage?.total_tokens || 0),
    };
  }

  /**
   * Check if error is a quota/rate limit error
   */
  private isQuotaError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('insufficient')
    );
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key');
  }

  /**
   * Calculate cost based on provider and tokens
   */
  private calculateCost(provider: string, model: string, tokens: number): number {
    // Free models have 0 cost
    if (model.includes(':free') || provider === 'LongCat') {
      return 0;
    }

    // DeepSeek pricing (approximate)
    if (provider === 'DeepSeek') {
      return (tokens / 1000) * 0.0001; // $0.0001 per 1K tokens
    }

    return 0;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    this.providers.forEach((provider, key) => {
      status[key] = {
        name: provider.name,
        isAvailable: provider.isAvailable,
        hasApiKey: !!provider.apiKey,
        errorCount: provider.errorCount,
        lastError: provider.lastError,
        lastUsed: provider.lastUsed,
        priority: provider.priority,
      };
    });

    return status;
  }

  /**
   * Force switch to a specific provider
   */
  forceProvider(providerKey: string): boolean {
    const provider = this.providers.get(providerKey);

    if (provider && provider.apiKey) {
      this.currentProvider = providerKey;
      console.log(`[AI Manager] Forced switch to ${provider.name}`);
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const aiProviderManager = AIProviderManager.getInstance();

// Export for use in API routes
export { AIProviderManager };

