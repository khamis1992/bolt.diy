import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, Link, Form } from '@remix-run/react';
import { requireAuth } from '~/lib/auth.middleware';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const { supabase } = createSupabaseServerClient(request);

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('last_opened_at', { ascending: false })
    .limit(10);

  // Get usage stats for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: usageStats } = await supabase
    .from('usage_logs')
    .select('action_type, tokens_used, cost')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  return json({ user, profile, projects: projects || [], usageStats: usageStats || [] });
}

export default function Dashboard() {
  const { user, profile, projects, usageStats } = useLoaderData<typeof loader>();

  const totalTokens = usageStats.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
  const totalCost = usageStats.reduce((sum, log) => sum + (log.cost || 0), 0);

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1">
      {/* Header */}
      <header className="bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold text-bolt-elements-textPrimary">
              bolt.diy
            </Link>
            <span className="text-sm text-bolt-elements-textTertiary">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-bolt-elements-textPrimary hover:text-bolt-elements-textSecondary transition-colors"
            >
              New Chat
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-bolt-elements-textSecondary">{user.email}</span>
              <Form method="post" action="/auth/signout">
                <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                  Sign out
                </button>
              </Form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-bolt-elements-textPrimary">
            Welcome back, {profile?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="mt-2 text-bolt-elements-textSecondary">
            Manage your projects and track your usage
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor p-6">
            <div className="text-sm text-bolt-elements-textSecondary mb-2">Total Projects</div>
            <div className="text-3xl font-bold text-bolt-elements-textPrimary">
              {profile?.total_projects || 0}
            </div>
          </div>

          <div className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor p-6">
            <div className="text-sm text-bolt-elements-textSecondary mb-2">AI Requests (30d)</div>
            <div className="text-3xl font-bold text-bolt-elements-textPrimary">
              {profile?.monthly_ai_requests || 0}
            </div>
          </div>

          <div className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor p-6">
            <div className="text-sm text-bolt-elements-textSecondary mb-2">Tokens Used</div>
            <div className="text-3xl font-bold text-bolt-elements-textPrimary">
              {totalTokens.toLocaleString()}
            </div>
          </div>

          <div className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor p-6">
            <div className="text-sm text-bolt-elements-textSecondary mb-2">Subscription</div>
            <div className="text-3xl font-bold text-bolt-elements-textPrimary capitalize">
              {profile?.subscription_tier || 'free'}
            </div>
            {profile?.subscription_tier === 'free' && (
              <Link
                to="/subscription"
                className="mt-2 inline-block text-sm text-bolt-elements-link hover:underline"
              >
                Upgrade →
              </Link>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor">
          <div className="px-6 py-4 border-b border-bolt-elements-borderColor flex justify-between items-center">
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">Recent Projects</h2>
            <Link
              to="/"
              className="px-4 py-2 bg-bolt-elements-button-primary-background text-white rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors text-sm font-medium"
            >
              New Project
            </Link>
          </div>

          <div className="divide-y divide-bolt-elements-borderColor">
            {projects.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-bolt-elements-textTertiary mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-bolt-elements-textSecondary mb-4">
                  No projects yet. Create your first project!
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-bolt-elements-button-primary-background text-white rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors text-sm font-medium"
                >
                  Create Project
                </Link>
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/?projectId=${project.id}`}
                  className="block px-6 py-4 hover:bg-bolt-elements-background-depth-3 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-bolt-elements-textPrimary">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-bolt-elements-textSecondary mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {project.framework && (
                          <span className="px-2 py-1 text-xs bg-bolt-elements-button-primary-background/10 text-bolt-elements-button-primary-background rounded">
                            {project.framework}
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary rounded capitalize">
                          {project.visibility}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-bolt-elements-textTertiary ml-4">
                      {new Date(project.last_opened_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {projects.length > 0 && (
            <div className="px-6 py-4 border-t border-bolt-elements-borderColor">
              <Link
                to="/projects"
                className="text-sm text-bolt-elements-link hover:underline"
              >
                View all projects →
              </Link>
            </div>
          )}
        </div>

        {/* Usage Section */}
        {usageStats.length > 0 && (
          <div className="mt-8 bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor p-6">
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Usage Summary (Last 30 Days)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-bolt-elements-textSecondary">Total Requests</div>
                <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                  {usageStats.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-bolt-elements-textSecondary">Tokens Used</div>
                <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                  {totalTokens.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-bolt-elements-textSecondary">Estimated Cost</div>
                <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                  ${totalCost.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

