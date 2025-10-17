import { atom } from 'nanostores';
import { getSupabaseClient, isBrowser } from '~/lib/supabase.client';
import { getAuthState } from './auth';

export interface UsageLog {
  action_type: 'ai_request' | 'deployment' | 'file_upload' | 'project_create' | 'project_delete';
  model_used?: string;
  provider?: string;
  tokens_used?: number;
  cost?: number;
  metadata?: any;
}

export interface UsageState {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  monthlyRequests: number;
  isLoading: boolean;
}

const initialState: UsageState = {
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  monthlyRequests: 0,
  isLoading: false,
};

export const usageStore = atom<UsageState>(initialState);

/**
 * Log a usage event
 */
export async function logUsage(
  projectId: string | null,
  log: UsageLog
): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('usage_logs').insert({
      user_id: authState.user.id,
      project_id: projectId,
      action_type: log.action_type,
      model_used: log.model_used,
      provider: log.provider,
      tokens_used: log.tokens_used || 0,
      cost: log.cost || 0,
      metadata: log.metadata || {},
    });

    if (error) {
      throw error;
    }

    // Update local state
    const currentState = usageStore.get();
    usageStore.set({
      ...currentState,
      totalRequests: currentState.totalRequests + 1,
      totalTokens: currentState.totalTokens + (log.tokens_used || 0),
      totalCost: currentState.totalCost + (log.cost || 0),
      monthlyRequests: currentState.monthlyRequests + 1,
    });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

/**
 * Load usage statistics
 */
export async function loadUsageStats(): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return;
  }

  usageStore.set({ ...usageStore.get(), isLoading: true });

  try {
    const supabase = getSupabaseClient();

    // Get all-time stats
    const { data: allTimeStats } = await supabase
      .from('usage_logs')
      .select('tokens_used, cost')
      .eq('user_id', authState.user.id);

    // Get monthly stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyStats } = await supabase
      .from('usage_logs')
      .select('tokens_used, cost')
      .eq('user_id', authState.user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const totalTokens = allTimeStats?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0;
    const totalCost = allTimeStats?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;
    const monthlyRequests = monthlyStats?.length || 0;

    usageStore.set({
      totalRequests: allTimeStats?.length || 0,
      totalTokens,
      totalCost,
      monthlyRequests,
      isLoading: false,
    });
  } catch (error) {
    console.error('Failed to load usage stats:', error);
    usageStore.set({ ...usageStore.get(), isLoading: false });
  }
}

/**
 * Log AI request
 */
export async function logAIRequest(
  projectId: string | null,
  model: string,
  provider: string,
  tokens: number,
  cost: number,
  metadata?: any
): Promise<void> {
  await logUsage(projectId, {
    action_type: 'ai_request',
    model_used: model,
    provider,
    tokens_used: tokens,
    cost,
    metadata,
  });
}

/**
 * Log deployment
 */
export async function logDeployment(
  projectId: string,
  platform: string,
  metadata?: any
): Promise<void> {
  await logUsage(projectId, {
    action_type: 'deployment',
    metadata: { platform, ...metadata },
  });
}

/**
 * Log file upload
 */
export async function logFileUpload(
  projectId: string,
  fileSize: number,
  metadata?: any
): Promise<void> {
  await logUsage(projectId, {
    action_type: 'file_upload',
    metadata: { fileSize, ...metadata },
  });
}

/**
 * Log project creation
 */
export async function logProjectCreate(projectId: string, metadata?: any): Promise<void> {
  await logUsage(projectId, {
    action_type: 'project_create',
    metadata,
  });
}

/**
 * Log project deletion
 */
export async function logProjectDelete(projectId: string, metadata?: any): Promise<void> {
  await logUsage(projectId, {
    action_type: 'project_delete',
    metadata,
  });
}

