/**
 * Auto LLM API Route
 * Automatically selects and switches between AI providers
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { aiProviderManager } from '~/lib/ai-provider-manager';
import { logAIRequest } from '~/lib/stores/usage';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { messages, temperature, maxTokens, stream, projectId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    // Make request with automatic provider switching
    const response = await aiProviderManager.makeRequest({
      messages,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 4096,
      stream: stream || false,
    });

    // Log usage if projectId is provided
    if (projectId && typeof window !== 'undefined') {
      try {
        await logAIRequest(
          projectId,
          response.model,
          response.provider,
          response.tokensUsed || 0,
          response.cost || 0,
        );
      } catch (error) {
        console.error('Failed to log AI request:', error);
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[Auto LLM API] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process AI request',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

/**
 * GET endpoint to check provider status
 */
export async function loader() {
  const status = aiProviderManager.getProviderStatus();

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

