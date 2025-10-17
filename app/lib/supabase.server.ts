import { createServerClient, parse, serialize } from '@supabase/ssr';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: 'free' | 'pro' | 'enterprise';
          subscription_status: 'active' | 'cancelled' | 'expired' | 'trialing';
          subscription_period_start: string | null;
          subscription_period_end: string | null;
          total_projects: number;
          total_ai_requests: number;
          monthly_ai_requests: number;
          last_request_reset: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'expired' | 'trialing';
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'expired' | 'trialing';
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          framework: string | null;
          template: string | null;
          visibility: 'private' | 'public' | 'unlisted';
          thumbnail_url: string | null;
          is_archived: boolean;
          last_opened_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
          framework?: string | null;
          template?: string | null;
          visibility?: 'private' | 'public' | 'unlisted';
        };
        Update: {
          name?: string;
          description?: string | null;
          framework?: string | null;
          visibility?: 'private' | 'public' | 'unlisted';
          is_archived?: boolean;
          last_opened_at?: string;
        };
      };
      project_files: {
        Row: {
          id: string;
          project_id: string;
          path: string;
          content: string | null;
          size: number;
          mime_type: string | null;
          is_binary: boolean;
          storage_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          path: string;
          content?: string | null;
          size?: number;
          mime_type?: string | null;
          is_binary?: boolean;
          storage_url?: string | null;
        };
        Update: {
          content?: string | null;
          size?: number;
          storage_url?: string | null;
        };
      };
      chat_history: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          messages: any;
          model_used: string | null;
          provider: string | null;
          tokens_used: number;
          cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          messages: any;
          model_used?: string | null;
          provider?: string | null;
          tokens_used?: number;
          cost?: number;
        };
        Update: {
          messages?: any;
          tokens_used?: number;
          cost?: number;
        };
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          action_type: 'ai_request' | 'deployment' | 'file_upload' | 'project_create' | 'project_delete';
          model_used: string | null;
          provider: string | null;
          tokens_used: number;
          cost: number;
          metadata: any;
          created_at: string;
        };
        Insert: {
          user_id: string;
          project_id?: string | null;
          action_type: 'ai_request' | 'deployment' | 'file_upload' | 'project_create' | 'project_delete';
          model_used?: string | null;
          provider?: string | null;
          tokens_used?: number;
          cost?: number;
          metadata?: any;
        };
      };
    };
  };
}

export function createSupabaseServerClient(request: Request) {
  const cookies = parse(request.headers.get('Cookie') ?? '');
  const headers = new Headers();

  const supabase = createServerClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key) {
          return cookies[key];
        },
        set(key, value, options) {
          headers.append('Set-Cookie', serialize(key, value, options));
        },
        remove(key, options) {
          headers.append('Set-Cookie', serialize(key, '', options));
        },
      },
    }
  );

  return { supabase, headers };
}

