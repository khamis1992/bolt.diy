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
    const { projectId, actionType, modelUsed, provider, tokensUsed, cost, metadata } = body;

    if (!actionType) {
      return json({ error: 'Action type is required' }, { status: 400 });
    }

    const validActionTypes = ['ai_request', 'deployment', 'file_upload', 'project_create', 'project_delete'];

    if (!validActionTypes.includes(actionType)) {
      return json({ error: 'Invalid action type' }, { status: 400 });
    }

    // Log usage
    const { data, error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: session.user.id,
        project_id: projectId || null,
        action_type: actionType,
        model_used: modelUsed || null,
        provider: provider || null,
        tokens_used: tokensUsed || 0,
        cost: cost || 0,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return json({
      success: true,
      log: data,
    });
  } catch (error: any) {
    console.error('Failed to log usage:', error);
    return json({ error: error.message || 'Failed to log usage' }, { status: 500 });
  }
}

