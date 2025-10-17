import { atom } from 'nanostores';
import { getSupabaseClient, isBrowser } from '~/lib/supabase.client';
import { getAuthState } from './auth';
import type { Database } from '~/lib/supabase.server';

type ChatHistory = Database['public']['Tables']['chat_history']['Row'];
type ChatHistoryInsert = Database['public']['Tables']['chat_history']['Insert'];

export interface ChatHistoryState {
  histories: ChatHistory[];
  currentHistory: ChatHistory | null;
  isLoading: boolean;
  isSaving: boolean;
}

const initialState: ChatHistoryState = {
  histories: [],
  currentHistory: null,
  isLoading: false,
  isSaving: false,
};

export const chatHistoryStore = atom<ChatHistoryState>(initialState);

/**
 * Save chat history to Supabase
 */
export async function saveChatHistory(
  projectId: string,
  messages: any[],
  model?: string,
  provider?: string,
  tokens?: number,
  cost?: number
): Promise<ChatHistory | null> {
  if (!isBrowser) {
    return null;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }

  chatHistoryStore.set({ ...chatHistoryStore.get(), isSaving: true });

  try {
    const supabase = getSupabaseClient();

    const chatData: ChatHistoryInsert = {
      project_id: projectId,
      user_id: authState.user.id,
      messages,
      model_used: model,
      provider,
      tokens_used: tokens || 0,
      cost: cost || 0,
    };

    const { data, error } = await supabase
      .from('chat_history')
      .insert(chatData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update local state
    const currentState = chatHistoryStore.get();
    chatHistoryStore.set({
      ...currentState,
      histories: [data, ...currentState.histories],
      currentHistory: data,
      isSaving: false,
    });

    return data;
  } catch (error) {
    console.error('Failed to save chat history:', error);
    chatHistoryStore.set({ ...chatHistoryStore.get(), isSaving: false });
    return null;
  }
}

/**
 * Update existing chat history
 */
export async function updateChatHistory(
  historyId: string,
  messages: any[],
  tokens?: number,
  cost?: number
): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return;
  }

  chatHistoryStore.set({ ...chatHistoryStore.get(), isSaving: true });

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('chat_history')
      .update({
        messages,
        tokens_used: tokens,
        cost,
      })
      .eq('id', historyId)
      .eq('user_id', authState.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update local state
    const currentState = chatHistoryStore.get();
    chatHistoryStore.set({
      ...currentState,
      histories: currentState.histories.map((h) => (h.id === historyId ? data : h)),
      currentHistory: currentState.currentHistory?.id === historyId ? data : currentState.currentHistory,
      isSaving: false,
    });
  } catch (error) {
    console.error('Failed to update chat history:', error);
    chatHistoryStore.set({ ...chatHistoryStore.get(), isSaving: false });
  }
}

/**
 * Load chat histories for a project
 */
export async function loadChatHistories(projectId: string): Promise<ChatHistory[]> {
  if (!isBrowser) {
    return [];
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return [];
  }

  chatHistoryStore.set({ ...chatHistoryStore.get(), isLoading: true });

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', authState.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    chatHistoryStore.set({
      ...chatHistoryStore.get(),
      histories: data || [],
      isLoading: false,
    });

    return data || [];
  } catch (error) {
    console.error('Failed to load chat histories:', error);
    chatHistoryStore.set({ ...chatHistoryStore.get(), isLoading: false });
    return [];
  }
}

/**
 * Load a specific chat history
 */
export async function loadChatHistory(historyId: string): Promise<ChatHistory | null> {
  if (!isBrowser) {
    return null;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('id', historyId)
      .eq('user_id', authState.user.id)
      .single();

    if (error) {
      throw error;
    }

    chatHistoryStore.set({
      ...chatHistoryStore.get(),
      currentHistory: data,
    });

    return data;
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return null;
  }
}

/**
 * Delete chat history
 */
export async function deleteChatHistory(historyId: string): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return;
  }

  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', authState.user.id);

    if (error) {
      throw error;
    }

    // Update local state
    const currentState = chatHistoryStore.get();
    chatHistoryStore.set({
      ...currentState,
      histories: currentState.histories.filter((h) => h.id !== historyId),
      currentHistory: currentState.currentHistory?.id === historyId ? null : currentState.currentHistory,
    });
  } catch (error) {
    console.error('Failed to delete chat history:', error);
  }
}

/**
 * Get total tokens and cost for a project
 */
export async function getProjectChatStats(projectId: string): Promise<{ totalTokens: number; totalCost: number }> {
  if (!isBrowser) {
    return { totalTokens: 0, totalCost: 0 };
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return { totalTokens: 0, totalCost: 0 };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('chat_history')
      .select('tokens_used, cost')
      .eq('project_id', projectId)
      .eq('user_id', authState.user.id);

    if (error) {
      throw error;
    }

    const totalTokens = data?.reduce((sum, h) => sum + (h.tokens_used || 0), 0) || 0;
    const totalCost = data?.reduce((sum, h) => sum + (h.cost || 0), 0) || 0;

    return { totalTokens, totalCost };
  } catch (error) {
    console.error('Failed to get project chat stats:', error);
    return { totalTokens: 0, totalCost: 0 };
  }
}

