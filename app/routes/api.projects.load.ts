import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Load project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return json({ error: 'Project not found' }, { status: 404 });
    }

    // Load project files
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (filesError) {
      throw filesError;
    }

    // Convert to file map format
    const fileMap: Record<string, any> = {};

    for (const file of files || []) {
      fileMap[file.path] = {
        type: 'file',
        content: file.content,
        isBinary: file.is_binary,
      };
    }

    // Update last_opened_at
    await supabase
      .from('projects')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', session.user.id);

    return json({
      success: true,
      project,
      files: fileMap,
    });
  } catch (error: any) {
    console.error('Failed to load project:', error);
    return json({ error: error.message || 'Failed to load project' }, { status: 500 });
  }
}

