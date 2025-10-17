import { useState, type FormEvent } from 'react';

interface LoginResponse {
  error?: string;
}

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/saas/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          apiKey,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as LoginResponse;
        setError(data.error ?? 'Failed to sign in. Check your credentials and try again.');
        setSubmitting(false);

        return;
      }

      window.location.reload();
    } catch (err) {
      console.error('Failed to create SaaS session', err);
      setError('Unexpected error while signing in. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-bolt-elements-background-depth-1 px-4">
      <div className="w-full max-w-md rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-bolt-elements-textPrimary">Sign in to Bolt SaaS</h1>
        <p className="mt-2 text-sm text-bolt-elements-textSecondary">
          Use the workspace API key issued by the owner to sign in. Each member authenticates with their email address.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-bolt-elements-textSecondary" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-bolt-elements-borderColor bg-transparent px-3 py-2 text-sm text-bolt-elements-textPrimary focus:border-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-bolt-elements-textSecondary" htmlFor="apiKey">
              Workspace API key
            </label>
            <input
              id="apiKey"
              type="text"
              required
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="w-full rounded-lg border border-bolt-elements-borderColor bg-transparent px-3 py-2 text-sm text-bolt-elements-textPrimary focus:border-accent focus:outline-none"
              placeholder="bolt_..."
            />
          </div>

          {error && <p className="text-sm text-bolt-elements-textError">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-xs text-bolt-elements-textTertiary">
          Administrators can create workspaces and issue keys using the <code>/api/saas/workspaces</code> endpoint with
          their admin token.
        </p>
      </div>
    </div>
  );
}
