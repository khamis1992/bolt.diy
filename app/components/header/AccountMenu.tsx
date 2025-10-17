import { useState } from 'react';
import { useRouteLoaderData } from '@remix-run/react';
import type { loader as rootLoader } from '~/root';

export function AccountMenu() {
  const rootData = useRouteLoaderData<typeof rootLoader>('root');
  const [submitting, setSubmitting] = useState(false);

  if (!rootData?.saasEnabled || !rootData.workspace || !rootData.member) {
    return null;
  }

  const handleLogout = async () => {
    setSubmitting(true);

    try {
      await fetch('/api/saas/session', {
        method: 'DELETE',
      });
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="ml-auto flex items-center gap-3 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-3 py-2 text-sm text-bolt-elements-textSecondary">
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-bolt-elements-textPrimary">{rootData.workspace.name}</span>
        <span className="text-xs text-bolt-elements-textTertiary">{rootData.member.email}</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={submitting}
        className="rounded-md border border-transparent bg-bolt-elements-background-depth-3 px-2 py-1 text-xs font-medium text-bolt-elements-textSecondary transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
