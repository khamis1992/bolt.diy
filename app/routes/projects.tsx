import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, Link, Form, useSearchParams } from '@remix-run/react';
import { requireAuth } from '~/lib/auth.middleware';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const { supabase } = createSupabaseServerClient(request);

  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search') || '';

  let query = supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id);

  // Apply filters
  if (filter === 'active') {
    query = query.eq('is_archived', false);
  } else if (filter === 'archived') {
    query = query.eq('is_archived', true);
  } else if (filter === 'public') {
    query = query.eq('visibility', 'public');
  } else if (filter === 'private') {
    query = query.eq('visibility', 'private');
  }

  // Apply search
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data: projects } = await query.order('last_opened_at', { ascending: false });

  return json({ user, projects: projects || [], filter, search });
}

export default function Projects() {
  const { user, projects, filter, search } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const filters = [
    { value: 'all', label: 'All Projects' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
  ];

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1">
      {/* Header */}
      <header className="bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold text-bolt-elements-textPrimary">
              bolt.diy
            </Link>
            <span className="text-sm text-bolt-elements-textTertiary">Projects</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-medium text-bolt-elements-textPrimary hover:text-bolt-elements-textSecondary transition-colors"
            >
              Dashboard
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
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-bolt-elements-textPrimary">My Projects</h1>
            <p className="mt-2 text-bolt-elements-textSecondary">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 bg-bolt-elements-button-primary-background text-white rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors text-sm font-medium"
          >
            New Project
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
              <Link
                key={f.value}
                to={`/projects?filter=${f.value}${search ? `&search=${search}` : ''}`}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-bolt-elements-button-primary-background text-white'
                    : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <Form method="get" className="flex-1 max-w-md">
            <input
              type="hidden"
              name="filter"
              value={filter}
            />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search projects..."
              className="w-full px-4 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
            />
          </Form>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-bolt-elements-textTertiary mb-4">
              <svg
                className="mx-auto h-16 w-16"
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
              {search ? 'No projects found matching your search.' : 'No projects yet.'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-bolt-elements-button-primary-background text-white rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors text-sm font-medium"
            >
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor overflow-hidden hover:border-bolt-elements-focus transition-colors"
              >
                {/* Thumbnail */}
                {project.thumbnail_url ? (
                  <img
                    src={project.thumbnail_url}
                    alt={project.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-bolt-elements-background-depth-3 flex items-center justify-center">
                    <svg
                      className="h-16 w-16 text-bolt-elements-textTertiary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-2 truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-bolt-elements-textSecondary mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {project.framework && (
                      <span className="px-2 py-1 text-xs bg-bolt-elements-button-primary-background/10 text-bolt-elements-button-primary-background rounded">
                        {project.framework}
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary rounded capitalize">
                      {project.visibility}
                    </span>
                    {project.is_archived && (
                      <span className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-400 rounded">
                        Archived
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-bolt-elements-textTertiary">
                      {new Date(project.last_opened_at).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/?projectId=${project.id}`}
                      className="px-3 py-1 bg-bolt-elements-button-primary-background text-white rounded text-sm hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

