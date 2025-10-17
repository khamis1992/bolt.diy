import { redirect, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  await supabase.auth.signOut();
  
  return redirect('/', { headers });
}

export async function loader() {
  return redirect('/');
}

