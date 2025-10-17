import { atom } from 'nanostores';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isBrowser } from '~/lib/supabase.client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
};

export const authStore = atom<AuthState>(initialState);

export async function initializeAuth() {
  if (!isBrowser) {
    return;
  }

  const supabase = getSupabaseClient();

  authStore.set({ ...authStore.get(), isLoading: true });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  authStore.set({
    user: session?.user ?? null,
    session,
    isLoading: false,
    isAuthenticated: !!session,
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    authStore.set({
      user: session?.user ?? null,
      session,
      isLoading: false,
      isAuthenticated: !!session,
    });
  });
}

export async function signOut() {
  if (!isBrowser) {
    return;
  }

  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  authStore.set({ ...initialState, isLoading: false });
  
  // Redirect to home page
  window.location.href = '/';
}

export function getAuthState() {
  return authStore.get();
}

