import { redirect } from '@remix-run/node';
import { createSupabaseServerClient } from './supabase.server';

export async function requireAuth(request: Request) {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw redirect('/auth/signin');
  }

  return { session, user: session.user };
}

export async function requireSubscription(request: Request, tier: string = 'pro') {
  const { session, user } = await requireAuth(request);
  const { supabase } = createSupabaseServerClient(request);

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    throw redirect('/subscription');
  }

  const tiers = ['free', 'pro', 'enterprise'];
  const userTierIndex = tiers.indexOf(profile.subscription_tier);
  const requiredTierIndex = tiers.indexOf(tier);

  if (userTierIndex < requiredTierIndex) {
    throw redirect('/subscription?upgrade=true');
  }

  return { session, user, profile };
}

export async function getOptionalAuth(request: Request) {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { session, user: session?.user ?? null };
}

