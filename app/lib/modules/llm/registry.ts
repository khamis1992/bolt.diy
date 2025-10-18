// Priority order: OpenRouter -> LongCat -> DeepSeek (for automatic fallback)
import OpenRouterProvider from './providers/open-router';
import LongCatProvider from './providers/longcat';
import DeepseekProvider from './providers/deepseek';

// Other providers (alphabetically ordered)
import AnthropicProvider from './providers/anthropic';
import CohereProvider from './providers/cohere';
import GoogleProvider from './providers/google';
import GroqProvider from './providers/groq';
import HuggingFaceProvider from './providers/huggingface';
import LMStudioProvider from './providers/lmstudio';
import MistralProvider from './providers/mistral';
import OllamaProvider from './providers/ollama';
import OpenAILikeProvider from './providers/openai-like';
import OpenAIProvider from './providers/openai';
import PerplexityProvider from './providers/perplexity';
import TogetherProvider from './providers/together';
import XAIProvider from './providers/xai';
import HyperbolicProvider from './providers/hyperbolic';
import AmazonBedrockProvider from './providers/amazon-bedrock';
import GithubProvider from './providers/github';
import MoonshotProvider from './providers/moonshot';

// Export in priority order: OpenRouter first (default), then LongCat, then DeepSeek
export {
  OpenRouterProvider,
  LongCatProvider,
  DeepseekProvider,
  AnthropicProvider,
  CohereProvider,
  GoogleProvider,
  GroqProvider,
  HuggingFaceProvider,
  HyperbolicProvider,
  MistralProvider,
  MoonshotProvider,
  OllamaProvider,
  OpenAIProvider,
  OpenAILikeProvider,
  PerplexityProvider,
  XAIProvider,
  TogetherProvider,
  LMStudioProvider,
  AmazonBedrockProvider,
  GithubProvider,
};
