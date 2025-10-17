import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, messages, modelUsed, provider, tokensUsed, cost, historyId } = body;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Messages must be an array' }, { status: 400 });
    }

    let chatHistory;

    if (historyId) {
      // Update existing chat history
      const { data, error } = await supabase
        .from('chat_history')
        .update({
          messages,
          tokens_used: tokensUsed || 0,
          cost: cost || 0,
        })
        .eq('id', historyId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      chatHistory = data;
    } else {
      // Create new chat history
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          project_id: projectId,
          user_id: session.user.id,
          messages,
          model_used: modelUsed || null,
          provider: provider || null,
          tokens_used: tokensUsed || 0,
          cost: cost || 0,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      chatHistory = data;
    }

    return json({
      success: true,
      chatHistory,
    });
  } catch (error: any) {
    console.error('Failed to save chat history:', error);
    return json({ error: error.message || 'Failed to save chat history' }, { status: 500 });
  }
}

