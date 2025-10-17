import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, Link, useActionData, useNavigation } from '@remix-run/react';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return redirect('/dashboard');
  }

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
    },
  });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return json(
    {
      success: true,
      message: 'Check your email to confirm your account',
    },
    { headers }
  );
}

export default function SignUp() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bolt-elements-background-depth-1">
      <div className="max-w-md w-full space-y-8 p-8 bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor">
        <div>
          <h2 className="text-3xl font-bold text-center text-bolt-elements-textPrimary">
            Create your account
          </h2>
          <p className="mt-2 text-center text-bolt-elements-textSecondary">
            Or{' '}
            <Link to="/auth/signin" className="text-bolt-elements-link hover:underline">
              sign in to your account
            </Link>
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          {actionData?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          {actionData?.success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded">
              {actionData.message}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-bolt-elements-textPrimary">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              className="mt-1 block w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-bolt-elements-textPrimary">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-bolt-elements-textPrimary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 block w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="mt-1 text-sm text-bolt-elements-textTertiary">Must be at least 8 characters</p>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor rounded focus:ring-bolt-elements-focus"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-bolt-elements-textSecondary">
              I agree to the{' '}
              <Link to="/terms" className="text-bolt-elements-link hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-bolt-elements-link hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-focus disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </Form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-bolt-elements-borderColor" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="w-full inline-flex justify-center py-2 px-4 border border-bolt-elements-borderColor rounded-md shadow-sm bg-bolt-elements-background-depth-3 text-sm font-medium text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </button>
            <button className="w-full inline-flex justify-center py-2 px-4 border border-bolt-elements-borderColor rounded-md shadow-sm bg-bolt-elements-background-depth-3 text-sm font-medium text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 transition-colors">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

